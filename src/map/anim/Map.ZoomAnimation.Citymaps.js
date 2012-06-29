L.Map.include(!L.DomUtil.TRANSITION ? {} : {
	_zoomToIfCenterInView: function(center, zoom, centerOffset) {
		
		if (this._animatingZoom) { return true; }
		if (!this.options.zoomAnimation) { return false; }
		
		var zoomDelta = zoom - this._zoom;
			scale = this.options.scales[this._zoom] / this.options.scales[zoom],
			offset = centerOffset.divideBy(1 - 1/scale);
		//if offset does not exceed half of the view
		if (!this._offsetIsWithinView(offset, 1)) { return false; }
		
		this._mapPane.className += ' leaflet-zoom-anim';
		
		this
			.fire('movestart')
			.fire('zoomstart');

		var centerPoint = this.containerPointToLayerPoint(this.getSize().divideBy(2)),
			origin = centerPoint.add(offset);
		
		this._prepareTileBg();
	
		this._runAnimation(center, zoom, scale, origin);
		
		return true;
	}
});