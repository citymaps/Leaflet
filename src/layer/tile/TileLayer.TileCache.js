L.TileLayer.TileCache = L.TileLayer.Citymaps.extend({
	
	initialize: function(name, url, layername, options) {
		L.TileLayer.Citymaps.prototype.initialize.apply(this,[name,url,options]);
		this._layername = layername;
	},
	
	getTileUrl: function(tilePoint, zoom) {
		function zeroPad(number, length) {
        number = String(number);
        var zeros = [];
        for(var i=0; i<length; ++i) {
            zeros.push('0');
        }
        return zeros.join('').substring(0, length - number.length) + number;
    }
    var components;
    var params = "";
    if(this.options.config) {
   		components = [
   			this._layername,
   			zoom,
   			tilePoint.x,
   			tilePoint.y + "." + "png"
   		]; 	
   		params = "config="+this.options.config;
    } else {
    	var full_x = zeroPad(tilePoint.x, 9);
	    var full_y = zeroPad(tilePoint.y, 9);
	 		zoom = zeroPad(zoom, 2);
	    components = [
	        this._layername,
	        zeroPad(zoom, 2),
	        full_x.substring(0,3),
	        full_x.substring(3,6),
	        full_x.substring(6),
	        full_y.substring(0,3),
	        full_y.substring(3,6),
	        full_y.substring(6) + '.' + "png"
	    ];
	    
    }
    var path = components.join('/'); 
    /*var url = this.url;
    if (url instanceof Array) {
        url = this.selectUrl(path, url);
    }*/
    var url = this._url;
    if(this.options.subdomains) {
	   	var ind = Math.floor(Math.random()*this.options.subdomains.length);
	   	url = url.replace('{s}',this.options.subdomains[ind]);
    }
    if(this.options.cacheVersion) {
    	url = url.replace('{v}',this.options.cacheVersion);
    }
    url = (url.charAt(url.length - 1) == '/') ? url : url + '/';
    url = url + path;
    if(params != "") {
    	url += "?"+params;
    }
    return url;
	}
});