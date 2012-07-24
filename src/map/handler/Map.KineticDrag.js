L.Map.KineticDrag = L.Map.Drag.extend({
	
	points: [],
	
	maxPoints: 100,
	
	interval: 10,
	
	intervalID: null,
	
	threshold: 0,
	
	addHooks: function() {
		L.Map.Drag.prototype.addHooks.apply(this);
	},
	
	enable: function() {
		this._map.on('mousedown', this._onMouseDown, this);
		L.Map.Drag.prototype.enable.apply(this);
	},
	
	disable: function() {
		this._map.off('mousedown', this._onMouseDown, this);
		L.Map.Drag.prototype.disable.apply(this);
	},
	
	_onMouseDown: function() {
		if(this.intervalID != null) {
			this._stopPanning();
		}
	},
	
	_onDragStart: function() {
		
		if(this.moveEndTimer) {
			clearTimeout(this.moveEndTimer);
			this.moveEndTimer = null;
		}
		this.points = [];
		L.Map.Drag.prototype._onDragStart.apply(this);
	},
	
	_onPreDrag: function(e) {
		if(this._restrictToMaxBounds(e.delta)) {
			this._draggable.doMove = false;
		} else {
			this._draggable.doMove = true;
			L.Map.Drag.prototype._onPreDrag.apply(this);
		}
	},
	
	_restrictToMaxBounds: function(delta) {
		if(this._map.options.maxBounds) {
			var bounds = this._map.getPixelBounds();
			bounds.min = bounds.min.subtract(delta);
			bounds.max = bounds.max.subtract(delta);
			var LLBounds = this._map.unprojectBounds(bounds);
			//var newLatLng = this._map.unproject(tl);
			if(!this._map.options.maxBounds.contains(LLBounds)) {
				return true;
			}
		}
		return false;
	},
	
	_onDrag: function() {
		var pos = this._draggable._newPos;
		this.points.unshift({xy: pos, tick: new Date().getTime()});
		if(this.points.length > this.maxPoints) {
			this.points.pop();
		}
		L.Map.Drag.prototype._onDrag.apply(this);
	},

	_onDragEnd: function() {
		if(this.intervalID != null) {
			clearInterval(this.intervalID);
		}
		if(this._draggable == null) {
			return;
		}
		var res = this._getSpecs();
		var max_speed = 3.0;
		//console.log("Kinetic Start");
    if (res) {
    	var v0 = res.speed > max_speed ? max_speed : res.speed;
 
      var fx = Math.cos(res.theta);
      var fy = -Math.sin(res.theta);

      var time = 0;
      var initialTime = new Date().getTime();

      var lastX = 0;
      var lastY = 0;
      

      var a = -0.0040;
     
      var callback = function() {
        if(this.intervalID == null) {
        		this._map.fire('moveend');
						this._map.fire('dragend');
            return;
        }

        time += this.interval;
        var realTime = new Date().getTime() - initialTime;
            /*if(realTime > 1000)
        {
          a -= 0.0005;
        }*/
      
        //console.log("deltat", realTime - time);
        var t = (time + realTime) / 2.0;
        //var t = time;
        //console.log("t", t);
        
        
        
        var p = (a * Math.pow(t, 2)) / 2.0 + v0 * t;
        var x = p * fx;
        var y = p * fy;

        var dragging = true;
        var v = a * t + v0;

        if (v <= 0) {
            return this._stopPanning();
        }
				var dx = x - lastX, dy = y - lastY;
				//console.log("Kinetic Move");
				var delta = new L.Point(dx,dy);
				if(this._restrictToMaxBounds(delta)) {
					this._stopPanning();
				} else {
					this._map._rawPanBy(delta);
					this._map.fire('move');
					this._map.fire('drag');
	        lastX = x;
	        lastY = y;
				}
      };
      
      this.intervalID = window.setInterval(
          L.Util.bind(callback, this),
          this.interval);
    } else {
    	this._map.fire('moveend');
			this._map.fire('dragend');
    }
	},
	
	_stopPanning: function() {
		clearInterval(this.intervalID);
		this.intervalID = null;
		this.moveEndTimer = window.setTimeout(L.Util.bind(function() {
			this._map.fire('moveend');
			this._map.fire('dragend');
		},this), 200);
    
	},
	
	
	
	_getSpecs: function() {
		var last, now = new Date().getTime();
    for(var i=0, points=this.points, l=points.length, point; i<l; i++) {
        point = points[i];
        if(now - point.tick > 200) { // FIXME 200
            break;
        }
        last = point;
    }
    if(!last) {
        return;
    }
    var xy = this._draggable._newPos;
    var time = new Date().getTime() - last.tick;
    var dist = Math.sqrt(Math.pow(xy.x - last.xy.x, 2) +
                         Math.pow(xy.y - last.xy.y, 2));
    var speed = dist / time;
    if(speed == 0 || speed < this.threshold) {
        return;
    }
    var theta = Math.asin((xy.y - last.xy.y) / dist);
    if(last.xy.x <= xy.x) {
        theta = Math.PI - theta;
    }
    return {speed: speed, theta: theta};
	}
	
});

L.Map.addInitHook('addHandler', 'dragging', L.Map.KineticDrag);
