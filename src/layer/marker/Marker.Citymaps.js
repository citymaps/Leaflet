L.Marker.Citymaps = L.Marker.extend({
	_rotateIcon: function(deg, update) {
		deg = Math.round(deg);
		if(L.Browser.ie8) {
			var rad = (deg / 180) * Math.PI;
	    var costheta = Math.cos(rad);
	    var sintheta = Math.sin(rad);
			this._icon.style.filter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', dx=-50, dy=-50, M11="+costheta+",M12="+(-sintheta)+", M21="+sintheta+", M22="+costheta+")";
		} else {
			if(update) {
				this._icon.style[L.DomUtil.TRANSFORM] = this._icon.style[L.DomUtil.TRANSFORM].replace(this.angle+"deg",deg+"deg");
			} else {
				this._icon.style[L.DomUtil.TRANSFORM] += ' rotate('+deg+'deg)';
				this.naturalAngle = deg;
			}
		}
		
		this.angle = deg;
	},
	
	/*_fireMouseEvent: function(e) {
		if(e.type == 'mousedown') {
			L.DomEvent.preventDefault(e);
		} else {
			L.Marker.prototype._fireMouseEvent.apply(this,[e]);
		}
	},*/
	
	addClass: function(className) {
		var classes = this._icon.className.split(" ");
		found = false;
		for(c in classes) {
			if(c == className) {
				found = true;
			}
		}
		if(!found) {
			this._icon.className += ' ' + className;
		}
	},
	
	removeClass: function(className) {
		var classes = this._icon.className.split(" ");
		var new_classes = "";
		for(c in classes) {
			if(c != className) {
				if(new_classes == "") {
					new_classes = c;
				} else {
					new_classes += ' ' + c;
				}
			}
		}
		this._icon.className = new_classes;
	},
	
	bindPopup: function(content, div, options) {
		options = L.Util.extend({offset: this.options.icon.popupAnchor}, options);
		
		this._popup = new L.Popup.Custom(div, options);
		this._popup.setContent(content);
		
		this.on('click', this.openPopup, this);
		
		return this;
	}
});