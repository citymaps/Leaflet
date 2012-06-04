L.DivIcon = L.Icon.extend({
	options: {
		iconSize: new L.Point(12, 12), // also can be set through CSS
		/*
		iconAnchor: (Point)
		popupAnchor: (Point)
		*/
		className: 'leaflet-div-icon'
	},

	createIcon: function () {
		var div = document.createElement('div');
		this._setIconStyles(div, 'icon');
		div.innerHTML = this.options.iconUrl;
		div.className += " leaflet-marker-label";
		div.style.fontSize = this.options.fontSize + "pt";
		div.style.textAlign = this.options.textAlign;
		div.style.width = this.options.size.x + "px";
		div.style.height = this.options.size.y + "px";
		return div;
	},

	createShadow: function () {
		return null;
	}
});
