L.TileLayer.Citymaps = L.TileLayer.extend({
	
	initialize: function(name, url, options) {
		L.TileLayer.prototype.initialize.apply(this, [url, options]);
		
		L.Util.setOptions(this, options);
		this._name = name;
		this._url = url;
	},
	
	_reset: function(clearOldContainer) {
		L.TileLayer.prototype._reset.apply(this, arguments);
		this._initialOffset = null;
	},
	
	_update: function() {
		this.fire('layer_updated');
		L.TileLayer.prototype._update.apply(this);
	},
	
	_initContainer: function() {
		L.TileLayer.prototype._initContainer.apply(this, arguments);
		this.setVisibility(this._visibility);
	},
	
	_loadTile: function(tile, tilePoint, zoom) {
		L.TileLayer.prototype._loadTile.apply(this, arguments);
		tile.tilePoint = tilePoint;
		tile.zoom = zoom;
	},

	
});