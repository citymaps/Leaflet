L.Map.Citymaps = L.Map.extend({
	
	city: null,
	
	// constructor

	initialize: function(id, options) {
		L.Util.setOptions(this, options);
		var zoom = this.options.zoom;
		this._maxZoom = this.options.numZoomLevels - 1;
		if(zoom > this._maxZoom) {
			zoom = this._maxZoom;
		} else if (zoom < 0) {
			zoom = 0;
		}
		this.options.crs.scales = this._calculateScales(this.options.scales);
		this._scale = this.options.crs.scale(zoom);
		L.Map.prototype.initialize.apply(this, arguments);
		
		this.on('movestart', this._removeTileBg, this);
		this.on('zoomstart', this._zoomStart, this);
		this.on('viewreset', this._viewReset, this);
	},
	
	_viewReset: function() {
		this._removeTileBg = true;
	},
	
	_zoomStart: function() {
		this._removeTileBg = false;
	},
	
	_removeTileBg: function() {
		if(this._tileBg && this._removeTileBg) {
			this._tileBg.innerHTML = '';
			this._removeTileBg = false;
		}
	},
	
	_getRestrictedBounds: function(zoom) {
		zoom = zoom == undefined ? this._zoom : zoom;
		return new L.Bounds(
			this.project(this.options.restrictedExtent._southWest, zoom),
			this.project(this.options.restrictedExtent._northEast, zoom)
		);
	},
	
	_calculateScales: function(scales) {
		var metersPerInch = 2.54 / 100,
				newScales = [],
				ppi = 72,
				latitude = 0,
				earthRadius = 6378137,
				earthCircumference = earthRadius * Math.PI * 2;

		for(var i = 0; i < this.options.resolutions.length; i++) {
			var res = this.options.resolutions[i];
			var a = earthCircumference / res;
			var z = (Math.log(a) / Math.log(2)) - 8;
			var scale = 256 * Math.pow(2,z);
			newScales[i] = scale;
		}

		return newScales;
	},

	pixelToLatLng: function(/*Point*/ point) {
		//return this.unproject(point.add(this._initialTopLeftPoint));
		var e = {pageX: point.x, pageY: point.y};
		var containerPoint = this.mouseEventToContainerPoint(e),
			layerPoint = this.containerPointToLayerPoint(containerPoint),
			latlng = this.layerPointToLatLng(layerPoint);
		return latlng;
	},

	latLngToPixel: function(/*LatLng*/ latlng) {
		return this.project(latlng)._round()._subtract(this._getTopLeftPoint());
	},
	
	_initLayout: function() {
		L.Map.prototype._initLayout.apply(this);
		if(this.options.autoSize) {
			this.fitToScreen();
			//window.onresize = L.Util.bind(this.fitToScreen, this);
		}
		
	},
	
	_initInteraction: function() {
		if(this.options.deceleration) {
			this.handlers.dragging = L.Handler.Kinetic;
		}
		this.handlers.touchZoom = L.Handler.TouchZoom.Citymaps;
		L.Map.prototype._initInteraction.apply(this);
		
	},
	
	getResolution: function() {
		return this.options.resolutions[this._zoom];
	},
	
	getRawScale: function() {
		return this.options.scales[this._zoom];
	},
	
	_restrictExtent: function(e) {
		if(this.options.restrictedExtent && e.target._moveDelta) {
			//var delta = new L.Point(el._leaflet_pos.x - point.x, el._leaflet_pos.y - point.y);
			var delta = e.target._moveDelta;
			var bounds = this.getPixelBounds(),
			sw = this.unproject(new L.Point(bounds.min.x+delta.x, bounds.max.y+delta.y)),
			ne = this.unproject(new L.Point(bounds.max.x+delta.x, bounds.min.y+delta.y));
			var LLbounds = new L.LatLngBounds(sw, ne);
			if(this.options.restrictedExtent) {
				if(!this.options.restrictedExtent.contains(LLbounds)) {
					this._mapPane.stopNextMove = true;
				}
			}
		}
	},
	
	project: function(/*LatLng*/ latlng, /*(optional) Number*/ zoom)/*-> Point*/ {
		zoom = (typeof zoom == 'undefined' ? this._zoom : zoom);
		return this.options.crs.latLngToPoint(latlng, zoom);
	},

	unproject: function(/*Point*/ point, /*(optional) Number*/ zoom, /*(optional) Boolean*/ unbounded)/*-> Object*/ {
		zoom = (typeof zoom == 'undefined' ? this._zoom : zoom);
		return this.options.crs.pointToLatLng(point, zoom, unbounded);
	},
	
	fitToScreen: function() {
		this._container.style.width = $(window).width() + "px";
		this._container.style.height = $(window).height() + "px";
		this._sizeChanged = true;
		
	},
	
	_getRestrictedPoint: function(point) {
		if(this.restrictedBounds) {
			var size = this.getSize();
			var dx = this.restrictedBounds.max.x - this.restrictedBounds.min.x;
			var dy = this.restrictedBounds.max.y - this.restrictedBounds.min.y;
			
			if(size.x > dx && size.y > dy) {
					point.x = this.restrictedBounds.min.x - ((size.x - dx) / 2);
					point.y = this.restrictedBounds.min.y - ((size.y - dy) / 2); 
			} else {
				if(point.x < this.restrictedBounds.min.x) {
					point.x += size.x / 2;
				} else if (point.x+size.x > this.restrictedBounds.max.x) {
					point.x -= size.x / 2;
				}
				
				if(point.y < this.restrictedBounds.min.y) {
					point.y += size.y / 2;
				} else if (point.y+size.y > this.restrictedBounds.max.y) {
					point.y -= size.y / 2;
				}
			}
			//point = this.unproject(projPoint);
		}
		return point;
	},
	
	scale: function(zoom) {
		return scales[zoom];
	}
	
	/*_resetView: function(center, zoom, preserveMapOffset) {
		
		var zoomChanged = (this._zoom != zoom);
		if(zoomChanged) {
			this.restrictedBounds = this._getRestrictedBounds(zoom);
		}
		this._bounds = null;
		this.fire('movestart');
		//if(zoomChanged) { this.fire('zoomstart'); }

		this._zoom = zoom;

		this._initialTopLeftPoint = this._getNewTopLeftPoint(center);
		if(this.restrictedBounds) {
			this._initialTopLeftPoint = this._getRestrictedPoint(this._initialTopLeftPoint);
		}
		
		if (!preserveMapOffset) {
			L.DomUtil.setPosition(this._mapPane, new L.Point(0, 0));
		} else {
			var offset = L.DomUtil.getPosition(this._mapPane);
			this._initialTopLeftPoint._add(offset);
		}
		
		this._tileLayersToLoad = this._tileLayersNum;
		this.fire('viewreset', {hard: !preserveMapOffset});

		this.fire('move');
		if (zoomChanged) { this.fire('zoomend'); }
		this.fire('moveend');

		if (!this._loaded) {
			this._loaded = true;
			this.fire('load');
		}
	}*/
	
});