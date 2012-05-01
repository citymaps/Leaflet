/*
 * L.TileLayer is used for standard xyz-numbered tile layers.
 */

L.TileLayer = L.Class.extend({
	includes: L.Mixin.Events,

	options: {
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,
		subdomains: 'abc',
		errorTileUrl: '',
		attribution: '',
		opacity: 1,
		scheme: 'xyz',
		continuousWorld: false,
		noWrap: false,
		zoomOffset: 0,
		zoomReverse: false,

		unloadInvisibleTiles: L.Browser.mobile,
		updateWhenIdle: L.Browser.mobile,
		reuseTiles: false,
		buffer: 0
	},

	initialize: function (url, options) {
		L.Util.setOptions(this, options);

		this._url = url;

		var subdomains = this.options.subdomains;

		if (typeof subdomains === 'string') {
			this.options.subdomains = subdomains.split('');
		}
		
		if(this.options.visible) {
			this._visibility = this.options.visible;
		} else {
			this._visibility = true;
		}
		this.setVisibility(this._visibility); 
		this.options.updateWhenIdle = true;
	},

	onAdd: function (map, insertAtTheBottom) {
		this._map = map;
		this._insertAtTheBottom = insertAtTheBottom;

		// create a container div for tiles
		this._initContainer();

		// create an image to clone for tiles
		this._createTileProto();

		// set up events
		map.on('viewreset', this._resetCallback, this);
		map.on('moveend', this._update, this);

		if (!this.options.updateWhenIdle) {
			this._limitedUpdate = L.Util.limitExecByInterval(this._update, 150, this);
			map.on('move', this._limitedUpdate, this);
		}

		this._reset();
		this._update();
	},

	onRemove: function (map) {
		map._panes.tilePane.removeChild(this._container);

		map.off('viewreset', this._resetCallback, this);
		map.off('moveend', this._update, this);

		if (!this.options.updateWhenIdle) {
			map.off('move', this._limitedUpdate, this);
		}

		this._container = null;
		this._map = null;
	},

	getAttribution: function () {
		return this.options.attribution;
	},

	setOpacity: function (opacity) {
		this.options.opacity = opacity;

		if (this._map) {
			this._updateOpacity();
		}

		// stupid webkit hack to force redrawing of tiles
		var i,
			tiles = this._tiles;

		if (L.Browser.webkit) {
			for (i in tiles) {
				if (tiles.hasOwnProperty(i)) {
					tiles[i].style.webkitTransform += ' translate(0,0)';
				}
			}
		}
	},

	_updateOpacity: function () {
		L.DomUtil.setOpacity(this._container, this.options.opacity);
	},

	_initContainer: function () {
		var tilePane = this._map._panes.tilePane,
			first = tilePane.firstChild;

		if (!this._container || tilePane.empty) {
			if(this._container && this._container.parentNode == tilePane) {
				tilePane.removeChild(this._container);
			}
			this._container = L.DomUtil.create('div', 'leaflet-layer');

			if (this._insertAtTheBottom && first) {
				tilePane.insertBefore(this._container, first);
			} else {
				tilePane.appendChild(this._container);
			}
			
			if(this.options.zIndex) {
				this._container.style["zIndex"] = this.options.zIndex;
			}
			
			if (this.options.opacity < 1) {
				this._updateOpacity();
			}
		}
	},

	_resetCallback: function (e) {
		this._reset(e.hard);
	},

	_reset: function (clearOldContainer) {
		var key,
			tiles = this._tiles;

		for (key in tiles) {
			if (tiles.hasOwnProperty(key)) {
				this.fire('tileunload', {tile: tiles[key]});
			}
		}

		this._tiles = {};

		if (this.options.reuseTiles) {
			this._unusedTiles = [];
		}

		if (clearOldContainer && this._container) {
			if(this._map._tileBg) {
				this._map._tileBg.innerHTML = '';
			}
			this._container.innerHTML = "";
		}

		this._initContainer();
		this._container.innerHTML = '';
		this._createTileGrid();
	},

	_update: function (e) {
		if (this._map._panTransition && this._map._panTransition._inProgress) { return; }

		var bounds   = this._map.getPixelBounds(),
		    zoom     = this._map.getZoom(),
		    tileSize = this.options.tileSize;

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		var nwTilePoint = new L.Point(
				Math.floor(bounds.min.x / tileSize),
				Math.floor(bounds.min.y / tileSize)),
			seTilePoint = new L.Point(
				Math.floor(bounds.max.x / tileSize),
				Math.floor(bounds.max.y / tileSize));
		
		if(this.options.buffer > 0) {
			var buffer = this.options.buffer;
			nwTilePoint.x -= buffer;
			nwTilePoint.y -= buffer;
			seTilePoint.x += buffer;
			seTilePoint.y += buffer;
		}	
		var addTiles = false;
		if(this.tileBounds != null) {
			if(this.tileBounds.min.x != nwTilePoint.x || 
				this.tileBounds.min.y != nwTilePoint.y ||
				this.tileBounds.max.x != seTilePoint.x ||
				this.tileBounds.max.y != seTilePoint.y) {
					addTiles = true;
			}
		} else {
			addTiles = true;
		}
		
		if(addTiles) {
			//console.log("tile bounds changed");
			this.tileBounds = new L.Bounds(nwTilePoint, seTilePoint);
			this._boundsChanged = true;
			this._addTilesFromCenterOut(this.tileBounds);
			
			if (this.options.unloadInvisibleTiles || this.options.reuseTiles) {
				this._removeOtherTiles(this.tileBounds);
			}
			
		}
	},

	_addTilesFromCenterOut: function (bounds) {
		var queue = [],
			center = bounds.getCenter();

		var j, i;
		for (j = bounds.min.y; j <= bounds.max.y; j++) {
			for (i = bounds.min.x; i <= bounds.max.x; i++) {
				if (!((i + ':' + j) in this._tiles)) {
					queue.push(new L.Point(i, j));
				}
			}
		}

		// load tiles in order of their distance to center
		queue.sort(function (a, b) {
			return a.distanceTo(center) - b.distanceTo(center);
		});

		//var fragment = document.createDocumentFragment();

		this._tilesToLoad = queue.length;

		var k, len;
		for (k = 0, len = this._tilesToLoad; k < len; k++) {
			this._addTile(queue[k], null);
		}
		
		//this._container.appendChild(fragment);
	},

	_removeOtherTiles: function (bounds) {
		var kArr, x, y, key, tile;

		for (key in this._tiles) {
			if (this._tiles.hasOwnProperty(key)) {
				kArr = key.split(':');
				x = parseInt(kArr[0], 10);
				y = parseInt(kArr[1], 10);

				// remove tile if it's out of bounds
				if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {
					this._removeTile(key);
				}
			}
		}
	},

	_removeTile: function (key) {
		var tile = this._tiles[key];

		this.fire("tileunload", {tile: tile, url: tile.src});

		// evil, don't do this! crashes Android 3, produces load errors, doesn't solve memory leaks
		// this._tiles[key].src = '';

		if (tile.parentNode == this._container) {
			//this._container.removeChild(tile);
			if(this.options.img) {
				this.src = "";
			} else {
				//tile.style.background = "transparent";
			}
			tile.visibility = "hidden";
			//tile.style.top = "";
			//tile.style.left = "";
			this._gridImages.push(tile);
		}
		delete this._tiles[key];
	},

	_addTile: function (tilePoint, container) {
		var tilePos = this._getTilePos(tilePoint),
			zoom = this._map.getZoom(),
		    key = tilePoint.x + ':' + tilePoint.y,
		    limit = Math.pow(2, this._getOffsetZoom(zoom));

		// wrap tile coordinates
		if (!this.options.continuousWorld) {
			if (!this.options.noWrap) {
				tilePoint.x = ((tilePoint.x % limit) + limit) % limit;
			} else if (tilePoint.x < 0 || tilePoint.x >= limit) {
				this._tilesToLoad--;
				return;
			}

			if (tilePoint.y < 0 || tilePoint.y >= limit) {
				this._tilesToLoad--;
				return;
			}
		}

		// get unused tile - or create a new tile
		if(!window.addTileCalls) {
			addTileCalls = 0;
		}
		addTileCalls++;
		//console.log("addTile call: "+addTileCalls);
		var tile = this._createTile();
		L.DomUtil.setPosition(tile, tilePos);

		this._tiles[key] = tile;

		if (this.options.scheme === 'tms') {
			tilePoint.y = limit - tilePoint.y - 1;
		}

		this._loadTile(tile, tilePoint, zoom);

		//container.appendChild(tile);
	},

	_getOffsetZoom: function (zoom) {
		var options = this.options;
		zoom = options.zoomReverse ? options.maxZoom - zoom : zoom;
		return zoom + options.zoomOffset;
	},

	_getTilePos: function (tilePoint) {
		var origin = this._map.getPixelOrigin(),
			tileSize = this.options.tileSize;

		return tilePoint.multiplyBy(tileSize).subtract(origin);
	},

	// image-specific code (override to implement e.g. Canvas or SVG tile layer)

	getTileUrl: function (tilePoint, zoom) {
		var subdomains = this.options.subdomains,
			index = (tilePoint.x + tilePoint.y) % subdomains.length,
			s = this.options.subdomains[index];

		return L.Util.template(this._url, L.Util.extend({
			s: s,
			z: this._getOffsetZoom(zoom),
			x: tilePoint.x,
			y: tilePoint.y
		}, this.options));
	},

	_createTileProto: function () {
		
	},
	
	_createTileProto: function() {
		if(this.options.img) {
			var img = this._tileImg = L.DomUtil.create('img', 'leaflet-tile');
			img.galleryimg = 'no';

			var tileSize = this.options.tileSize;
			img.style.width = tileSize + 'px';
			img.style.height = tileSize + 'px';
		} else {
			this._tileImg = L.DomUtil.create('div', 'leaflet-tile');
			this._tileImg.galleryimg = 'no';
	
			var tileSize = this.options.tileSize;
			this._tileImg.style.width = tileSize + 'px';
			this._tileImg.style.height = tileSize + 'px';
		}
	},

	_createTile: function() {
		//var tile = this._tileImg.cloneNode(false);
		if(this._gridImages.length == 0) {
			this._createGridTile(this.options.tileSize);
		}
		var tile = this._gridImages.shift();
		tile.src = "";
		tile.onselectstart = tile.onmousemove = L.Util.falseFn;
		return tile;
	},

	_getTile: function () {
		if (this.options.reuseTiles && this._unusedTiles.length > 0) {
			var tile = this._unusedTiles.pop();
			this._resetTile(tile);
			return tile;
		}
		return this._createTile();
	},

	_resetTile: function (tile) {
		// Override if data stored on a tile needs to be cleaned up before reuse
	},

	_loadTile: function (tile, tilePoint, zoom) {
		tile._layer = this;
		tile.onload = this._tileOnLoad;
		tile.onerror = this._tileOnError;
		if(this.options.img) {
			tile.src     = this.getTileUrl(tilePoint, zoom);
		} else {
			tile.style.background = "url("+this.getTileUrl(tilePoint, zoom)+")";
		}
		tile.style.visibility = "visible";
	},

	_tileOnLoad: function (e) {
		var layer = this._layer;

		this.className += ' leaflet-tile-loaded';

		layer.fire('tileload', {
			tile: this,
			url: this.src
		});

		layer._tilesToLoad--;
		if (!layer._tilesToLoad) {
			layer.fire('load');
		}
	},

	_tileOnError: function (e) {
		var layer = this._layer;

		layer.fire('tileerror', {
			tile: this,
			url: this.src
		});

		var newUrl = layer.options.errorTileUrl;
		if (newUrl) {
			this.src = newUrl;
		}
	},
	
	_createTileGrid: function() {
		var size = this._map.getSize();
		var tileSize = this.options.tileSize;
		
		var buffer = 2;
		if(this.options.buffer > 0) {
			buffer += (this.options.buffer * 2);
		}
		
		var gridWidth = Math.ceil(size.x / tileSize) + buffer;
		var gridHeight = Math.ceil(size.x / tileSize) + buffer;
		
		var numTiles = gridWidth * gridHeight;
		this._gridImages = [];
		for(var i = 0; i < numTiles; i++) {
			this._createGridTile(tileSize);
		}
	},
	
	_createGridTile: function(tileSize) {
		var img;
		if(this.options.img) {
			 img = L.DomUtil.create('img', 'leaflet-tile');
		} else {
			 img = L.DomUtil.create('div', 'leaflet-tile');
			 img.style.backgroundColor = "transparent";
		}
		img.style.width = tileSize + "px";
		img.style.height = tileSize + "px";
		img.style.visibility = "hidden";
		this._gridImages.push(img);
		this._container.appendChild(img);
		return img;
	},
	
	setVisibility: function(visible) {
		if(this._container) {
			if(visible) {
				this._container.style.display = "";
			} else {
				this._container.style.display = "none";
			}
		}
		this._visibility = visible;
	},
	
	getVisibility: function() {
		return this._visibility;
	}
});
