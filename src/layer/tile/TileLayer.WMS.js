L.TileLayer.WMS = L.TileLayer.extend({
	defaultWmsParams: {
		service: 'WMS',
		request: 'GetMap',
		version: '1.1.1',
		layers: '',
		styles: '',
		format: 'image/jpeg',
		transparent: false,
		gutter: 100
	},

	initialize: function(/*String*/ url, /*Object*/ options) {
		this._url = url;
		
		this.wmsParams = L.Util.extend({}, this.defaultWmsParams);
		this.wmsParams.width = this.wmsParams.height = this.options.tileSize;
		
		for (var i in options) {
			// all keys that are not TileLayer options go to WMS params
			if (!this.options.hasOwnProperty(i)) {
				this.wmsParams[i] = options[i];
			}
		}
		this.wmsParams.srs = "EPSG:900913";
		
		L.Util.setOptions(this, options);
		if (this.wmsParams.gutter > 0) {
			this.options.tileSize += this.wmsParams.gutter*2;
		} 
	},
	
	onAdd: function(map) {
		/*var projectionKey = (parseFloat(this.wmsParams.version) >= 1.3 ? 'crs' : 'srs');
		if(this.wmsParams[projectionKey] == undefined) {
			this.wmsParams[projectionKey] = map.options.crs.code;	
		}*/

		L.TileLayer.prototype.onAdd.call(this, map);
	},
	
	getTileUrl: function(/*Point*/ tilePoint, /*Number*/ zoom)/*-> String*/ {
		var tileSize = this.options.tileSize,
			nwPoint = tilePoint.multiplyBy(tileSize),
			sePoint = nwPoint.add(new L.Point(tileSize, tileSize)),
			nwMap = this._map.unproject(nwPoint, this._zoom, true),
			seMap = this._map.unproject(sePoint, this._zoom, true),
			nw = this._map.options.crs.project(nwMap),
			se = this._map.options.crs.project(seMap),
			bbox = [nw.x, se.y, se.x, nw.y].join(',');
		this.wmsParams.random = Math.random();
		return this._url + L.Util.getParamString(this.wmsParams) + "&bbox=" + bbox;
	},
	
	_createGridTile: function(tileSize) {
		var gutter = this.wmsParams.gutter;
		var img = L.TileLayer.prototype._createGridTile.apply(this, [tileSize]);
		img.style["backgroundPosition"] = -gutter + "px " + -gutter + "px";
		return img;
	}
});