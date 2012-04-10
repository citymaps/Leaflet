L.TileLayer.Data = L.TileLayer.Citymaps.extend({
	
	initialize: function(name, options) {
		L.TileLayer.Citymaps.prototype.initialize.apply(this,[name,"",options]);
		this.options.unloadInvisibleTiles = true;
	},
	
	_addTile: function(tilePoint, container) {
		var key = key = tilePoint.x + ':' + tilePoint.y;
		this._tiles[key] = true;
		this.fire('tileadd', {tile: tilePoint});
	},
	
	/*drawTile: function(tile, tilePoint, zoom) {
		this.fire('tileadd', {tile: tilePoint, canvas: tile});
	},*/
	
	_removeOtherTiles: function(bounds) {
		var kArr, x, y, key, tile;

		for (key in this._tiles) {
			if (this._tiles.hasOwnProperty(key)) {
				kArr = key.split(':');
				x = parseInt(kArr[0], 10);
				y = parseInt(kArr[1], 10);

				// remove tile if it's out of bounds
				if (x < bounds.min.x || x > bounds.max.x || y < bounds.min.y || y > bounds.max.y) {

					this.fire("tileremove", {tile: new L.Point(x,y)});

					delete this._tiles[key];
				}
			}
		}
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
	}
});