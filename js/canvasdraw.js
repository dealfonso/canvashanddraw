/**
   Copyright 2021 Carlos A. (https://github.com/dealfonso)

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
(function(document, exports = {}) {
    let default_options = {
        temporaryCanvasSize: 64,
        temporaryCanvasMargin: 4,
        delayMsBetweenStrokes: 10,
        lineWidth: 4,
        lineColor: "#000000",
        lineCap: "round",
        drawDynamics: true,
        animate: true,
        maxPoints: 0,
        antiAliasing: true
    }

    exports.canvasDraw = {
        default_options: default_options
    }

    function pSBC(p,c0,c1,l){
        // https://stackoverflow.com/a/13542669/14699733
        let r,g,b,P,f,t,h,i=parseInt,m=Math.round,a=typeof(c1)=="string";
        if(typeof(p)!="number"||p<-1||p>1||typeof(c0)!="string"||(c0[0]!='r'&&c0[0]!='#')||(c1&&!a))return null;
        if(!this.pSBCr)this.pSBCr=(d)=>{
            let n=d.length,x={};
            if(n>9){
                [r,g,b,a]=d=d.split(","),n=d.length;
                if(n<3||n>4)return null;
                x.r=i(r[3]=="a"?r.slice(5):r.slice(4)),x.g=i(g),x.b=i(b),x.a=a?parseFloat(a):-1
            }else{
                if(n==8||n==6||n<4)return null;
                if(n<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(n>4?d[4]+d[4]:"");
                d=i(d.slice(1),16);
                if(n==9||n==5)x.r=d>>24&255,x.g=d>>16&255,x.b=d>>8&255,x.a=m((d&255)/0.255)/1000;
                else x.r=d>>16,x.g=d>>8&255,x.b=d&255,x.a=-1
            }return x};
        h=c0.length>9,h=a?c1.length>9?true:c1=="c"?!h:false:h,f=this.pSBCr(c0),P=p<0,t=c1&&c1!="c"?this.pSBCr(c1):P?{r:0,g:0,b:0,a:-1}:{r:255,g:255,b:255,a:-1},p=P?p*-1:p,P=1-p;
        if(!f||!t)return null;
        if(l)r=m(P*f.r+p*t.r),g=m(P*f.g+p*t.g),b=m(P*f.b+p*t.b);
        else r=m((P*f.r**2+p*t.r**2)**0.5),g=m((P*f.g**2+p*t.g**2)**0.5),b=m((P*f.b**2+p*t.b**2)**0.5);
        a=f.a,t=t.a,f=a>=0||t>=0,a=f?a<0?t:t<0?a:a*P+t*p:0;
        if(h)return"rgb"+(f?"a(":"(")+r+","+g+","+b+(f?","+m(a*1000)/1000:"")+")";
        else return"#"+(4294967296+r*16777216+g*65536+b*256+(f?m(a*255):0)).toString(16).slice(1,f?undefined:-2)
    }    

    function mergeobjects(o1, o2) {
        let result = {};
        for (let key in o1) {
            result[key] = o1[key];
            if (o2[key] !== undefined) {
                result[key] = o2[key];
            }
        }
        return result;
    }

    class Points {
        constructor(p_list) {
            let points = [ null ];
            for (let i = 0; i < p_list.length; i++) {
                if (!p_list[i]["x"] || !p_list[i]["y"]) {
                    points.push(null);
                    continue;
                }
                points.push({x: p_list[i]["x"], y: p_list[i]["y"]});
            }
            this.points = points;
            this.normalized = NaN;
        }
        normalize(size = 200) {
            this.normalized = size;
            let min_x = NaN;
            let min_y = NaN;
            let max_x = NaN;
            let max_y = NaN;
            for (let i = 0; i < this.points.length; i++) {
                if (this.points[i] == null) {
                    continue;
                }
                if (isNaN(min_x) || (this.points[i].x < min_x)) {
                    min_x = this.points[i].x;
                }
                if (isNaN(min_y) || (this.points[i].y < min_y)) {
                    min_y = this.points[i].y;
                }
                if (isNaN(max_x) || (this.points[i].x > max_x)) {
                    max_x = this.points[i].x;
                }
                if (isNaN(max_y) || (this.points[i].y > max_y)) {
                    max_y = this.points[i].y;
                }
            }
            let dx = max_x - min_x;
            let dy = max_y - min_y;
            let d = Math.max(dx, dy);
            let scale = size / d;
            let offset_x = (d - dx) / 2;
            let offset_y = (d - dy) / 2;
            for (let i = 0; i < this.points.length; i++) {
                if (this.points[i] == null) {
                    continue;
                }
                this.points[i].x = (this.points[i].x - min_x + offset_x) * scale;
                this.points[i].y = (this.points[i].y - min_y + offset_y) * scale;
            }
        }
        getPoints() {
            return this.points;
        }
    }
    class DrawHelper {
        /**
         * This class handles the drawing of a set of points in a canvas, making the effect of progressively drawing the points.
         *   - the points are drawn in a temporary canvas, that will be later copied to the real canvas. The temporary canvas has 
         *     a defined size to make sure that the resulting image has a defined size, independent of the size of the canvas that
         *     is showing the points (this is because of normalization)
         * 
         * (*) this behavior is very dependent of our case, because we want to use this canvas for IA image validation, so we want
         *    to have a defined size for the image in order to have the results normalized. And we want to show the normalized image
         *    in the canvas for validation purposes.
         * 
         * @param {*} el - the real canvas
         * @param {*} points - the points to draw
         * @param {*} normSize - the size of the temporary canvas
         * @param {*} normMargin - the margin of the temporary canvas
         */
        constructor(el, points = [], options = default_options) {
            this.el = el;
            this._cancel = false;

            // Get the options object
            this._options = mergeobjects(default_options, options);

            // Prepare the points to be drawn
            this._points = new Points(points);
            if (this._options.temporaryCanvasSize > 0) {
                this._options.temporaryCanvasMargin += Math.ceil(this._options.lineWidth / 2);
                this._points.normalize(this._options.temporaryCanvasSize - (this._options.temporaryCanvasMargin * 2));
            }

            // Initialize to null, ready to be prepared
            this.tmpCanvas = null;
        }

        _prepareTmpCanvas() {
            if (this.tmpCanvas !== null) {
                // Already prepared
                return;
            }

            if (this._options.temporaryCanvasSize <= 0) {
                // Not want a temporary canvas
                return;
            }

            // Create a temporary canvas to draw the points on (to have control on the target size)
            var tmpCanvas = document.createElement("canvas");
            tmpCanvas.width = this._options.temporaryCanvasSize;
            tmpCanvas.height = this._options.temporaryCanvasSize;

            var tmpCtx = tmpCanvas.getContext('2d');
            tmpCtx.lineWidth = this._options.lineWidth;
            tmpCtx.strokeStyle = this._options.lineColor;
            tmpCtx.lineCap = this._options.lineCap;
            tmpCtx.lineJoin = this._options.lineCap;

            this.tmpCanvas = tmpCanvas;
        }

        _disposeTmpCanvas() {
            if (this.tmpCanvas !== null) {
                this.tmpCanvas.remove();
                this.tmpCanvas = null;
            }
        }

        _makeMovement(ctx, p0, p1, p2, p3, dx, dy) {
            /**
             * Draws the line between p1 and p2, but considering that the previous point was p0 and the next point is p3, so that 
             *   the intersection of the two vectors can be calculated and such intersection is used as the control point of a
             *   quadratic curve to draw the line.
             * @param {CanvasRenderingContext2D} ctx - the context of the canvas
             * @param {Point} p0 - the previous point
             * @param {Point} p1 - the first point
             * @param {Point} p2 - the second point
             * @param {Point} p3 - the next point
             * @param {number} dx - the offset x of the canvas
             * @param {number} dy - the offset y of the canvas
             * @param {number} m - the precalculated size of the size between p1 and p2
             */
            ctx.moveTo(p1.x + dx, p1.y + dy);
            if ((p0 === null) || (p1 === null) || (p2 === null) || (p3 === null)) {
                ctx.lineTo(p2.x + dx, p2.y + dy);
            } else {
                let d0 = {
                    x: p1.x - p0.x,
                    y: p1.y - p0.y
                }
                let d2 = {
                    x: p3.x - p2.x,
                    y: p3.y - p2.y
                }
                let b = (p0.y + (d0.y * ((p2.x - p0.x) / d0.x)) - p2.y) / (d2.y - (d2.x * d0.y) / d0.x);
                if (isNaN(b)) {
                    b = (p0.x + (d0.x * ((p2.y - p0.y) / d0.y)) - p2.x) / (d2.x - (d2.y * d0.x) / d0.y);
                }
                let c = {
                    x: p0.x + (d0.x * b),
                    y: p0.y + (d0.y * b)
                }
                // We are filtering out the points that are too close to the line and those that are too far
                if ((isNaN(b)) || (!isFinite(b)) || (Math.abs(b) > 10)) {
                    ctx.lineTo(p2.x + dx, p2.y + dy);
                } else {
                    ctx.quadraticCurveTo(c.x + dx, c.y + dy, p2.x + dx, p2.y + dy);
                }
            }
        }

        clear() {
            let ctx = this.el.getContext('2d');
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        /**
         * Draws a line between the points in the given list. If a point is null, the drawing will be stopped and the next point will be the start to continue drawing.
         * @param {*} ctx Canvas Context in which to draw the points
         * @param {*} points Arrray of points to draw ([{x: x, y: y}, {x: x, y: y}, ...])
         * @param {*} dx Offset in x direction
         * @param {*} dy Offset in y direction
         * @param {*} count Amount of points to draw
         */
         drawPoints(ctx, points, dx, dy, count = null, variableLineWidth = true, smoothWidth = 0) {
            if (smoothWidth <= 0) {
                // Less or equal to accept smoothWidth as "false"
                smoothWidth = 0;
            }
            if (count == null) {
                count = points.length;
            }
            if (count > points.length) {
                count = points.length;
            }
            let p0 = null;
            let p1 = null;
            let p2 = null;
            let p3 = null;

            // This is the size of the line to be considered as the "quickest drawing"
            let fQuick = Math.sqrt(Math.min(ctx.canvas.width, ctx.canvas.height));
            // When considered a quick line, this is the size of the line
            let fQuickSize = 0.5;

            ctx.save();
            let moveto = true;
            for (let i = 0; i < count; i++) {
                p2 = points[i];
                p3 = null;
                if (p2 == null) {
                    moveto = true;
                    continue;
                }
                if (i < count - 1) {
                    p3 = points[i + 1];
                }
                if (moveto) {
                    // Not needed, because we are drawing by segments
                    // ctx.moveTo(p2.x + dx, p2.y + dy);
                    p0 = null;
                    p1 = null;
                    moveto = false;
                } else {
                    let actualLineWidth = this._options.lineWidth;
                    if (variableLineWidth) {
                        // We need to calculate the actual line width. To do so, we need to calculate what means a "quick" line, to 
                        //   be drawin in a smaller size.
                        // The quick line is a line that is drawn between two points that are far apart. We consider that a line is
                        //   "quick" if is is longer than the square root of the size of the canvas (fQuick). And such line is drawn
                        //   in a size which is a percentage (fQuickSize) of the size of the line. The variations in the size of the
                        //   line will be applied as proportional to the difference between the smallest and biggest line size.
                        let mX = p2.x - p1.x;
                        let mY = p2.y - p1.y;
                        let m = Math.sqrt(mX * mX + mY * mY);    
                        let relLength = Math.min(1, m/fQuick);
                        let relSize = Math.round((1 - relLength * (1 - fQuickSize)) * this._options.lineWidth);
                        actualLineWidth = relSize;
                    }

                    // If not smoothing the line, the line will be always drawn, and we'll also draw if the lineWidth is smaller
                    //   this is because, when not smoothing the line, it will mean that we are drawing the front color. And if 
                    //   the lineWidth is smaller, it will mean that we want to either draw the front color with a smaller sized
                    //   line or we are drawing the shadow color to antialiase the line.
                    // If smooting the line (i.e., antialiasing), but the actualLineWidth is the same, we do not have the need of
                    //   antialiasing in this stroke. This is why we are not drawing in this case.
                    if ((smoothWidth === 0) || (actualLineWidth < this._options.lineWidth)) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.lineWidth = ((1 - smoothWidth) * actualLineWidth) + (this._options.lineWidth * smoothWidth);
                        this._makeMovement(ctx, p0, p1, p2, p3, dx, dy);
                        ctx.stroke();
                        ctx.restore();
                    }
                }
                p0 = p1;
                p1 = p2;
            }
            ctx.restore();
        }

        cancel() {
            /**
             * Cancels the drawing.
             */
            this._cancel = true;
        }

        _cancelAnimation() {
            /**
             * Effectively does the tasks to cancel the animation
             */
            if (this.interval != null) {
                clearInterval(this.interval);
                this.interval = null;
            }
            this._cancel = false;
            this._disposeTmpCanvas();
        }

        drawAnimated() {
            /**
             * Draws the animated line.
             * 
             * (*) Not using requestAnimationFrame because we want to control the drawing speed more easily.
             */
            let points = this._points.getPoints();
            let count = this._options.delayMsBetweenStrokes<=0?Math.min((this._options.maxPoints<=0)?points.length:this._options.maxPoints, points.length):0;

            // Prepare the temporary canvas (if needed)
            this._cancelAnimation();
            this._prepareTmpCanvas();

            // Return a thenable promise to be able to chain the drawing with other actions
            return new Promise((resolve, reject) => {
                if (this.interval !== null) {
                    clearInterval(this.interval);
                }
                this.interval = setInterval(function() {
                    // If cancelling, stop the drawing
                    if (this._cancel) {
                        this._cancelAnimation();
                        reject();
                        return;
                    }

                    // Get the canvas context, just in case it was changed before drawing
                    var ctx = this.el.getContext('2d');

                    let tmpCtx = ctx;
                    let marginX = 0;
                    let marginY = 0;
                    if (this.tmpCanvas !== null) {
                        tmpCtx = this.tmpCanvas.getContext('2d');
                        marginX = this._options.temporaryCanvasMargin;
                        marginY = this._options.temporaryCanvasMargin;
                    }

                    // Draw in the temporary canvas.
                    tmpCtx.clearRect(0, 0, tmpCtx.canvas.width, tmpCtx.canvas.height);
                    if (this._options.drawDynamics && this._options.antiAliasing) {
                        let colorLighten1 = pSBC(0.6, this._options.lineColor);
                        let colorLighten2 = pSBC(0.8, this._options.lineColor);
                        tmpCtx.strokeStyle = colorLighten1;
                        this.drawPoints(tmpCtx, points, marginX, marginY, count, true, 1);

                        tmpCtx.strokeStyle = colorLighten2;
                        this.drawPoints(tmpCtx, points, marginX, marginY, count, true, 0.8);
                    }

                    tmpCtx.strokeStyle = this._options.lineColor;
                    this.drawPoints(tmpCtx, points, marginX, marginY, count, this._options.drawDynamics);

                    if (this.tmpCanvas !== null) {
                        // Calculate the position and size of the place to copy the scaled drawing
                        let sX = ctx.canvas.width / this._options.temporaryCanvasSize;
                        let sY = ctx.canvas.height / this._options.temporaryCanvasSize;
                        let scale = Math.min(sX, sY);
                        let oX = (ctx.canvas.width - (this._options.temporaryCanvasSize * scale)) / 2;
                        let oY = (ctx.canvas.height - (this._options.temporaryCanvasSize * scale)) / 2;

                        // Copy the temporary canvas to the real one (scaling)
                        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.drawImage(this.tmpCanvas, 0, 0, this._options.temporaryCanvasSize, this._options.temporaryCanvasSize, oX, oY, this._options.temporaryCanvasSize * scale, this._options.temporaryCanvasSize * scale);
                    }

                    if (count == Math.min((this._options.maxPoints<=0)?points.length:this._options.maxPoints, points.length)) {
                        this._cancelAnimation();
                        resolve();
                        return;
                    }
                    count++;
                }.bind(this), this._options.delayMsBetweenStrokes);
            });
        }        
    }
    class HandDraw {
        constructor(el, options = {}) {
            // Adjust the options with the data-* attributes
            this._options = mergeobjects({}, options);
            let delay = parseInt(el.getAttribute('data-delay'));
            if (! isNaN(delay)) {
                this._options.delayMsBetweenStrokes = delay;
            }
            let drawDynamics = el.getAttribute('data-draw-dynamics');
            if (drawDynamics !== null) {
                this._options.drawDynamics = drawDynamics.toLowerCase() === 'true';
            }

            // Prepare the rest of the object
            this.el = el;
            this._drawHelper = null;


            // If autostarting start drawing
            let autostart = this.el.getAttribute('data-autostart');
            if (autostart === null) {
                autostart = true;
            } else {
                autostart = autostart.toLowerCase() === 'true';
            }
            if (autostart) {
                this.draw();
            }
        }

        /**
         * Draws a set of points in the canvas (if any of the points is null, the drawing will be stopped and the next point will be the start to continue drawing).
         * @param {*} points Array of points to draw ([{x: x, y: y}, {x: x, y: y}, ...]); if no points are given, it will try to draw the points in the data-* attributes.
         * @returns {Promise} Promise that will be resolved when the drawing is finished.
         */
        draw(points = null) {
            // If no points are given, use the data-* attributes
            if (points === null) {
                points = JSON.parse(this.el.getAttribute('data-points'));
            }

            // Cancel any previous drawing
            if (this._drawHelper !== null) {
                this._drawHelper.cancel();
            }

            // Create the helper and draw
            this._drawHelper = new DrawHelper(this.el, points, this._options);
            return this._drawHelper.drawAnimated();
        }
        /**
         * Draws the last set of points in the canvas, again.
         * @returns {Promise} Promise that will be resolved when the drawing is finished.
         */
        redraw() {
            // If no previous drawing, do nothing
            if (this._drawHelper === null) {
                return;
            }

            // Use the previous drawing points and settings
            return this._drawHelper.drawAnimated();
        }
        /**
         * Cancels the drawing (if any).
         */
        cancel() {
            // Cancel the drawing if any
            if (this._drawHelper == null) {
                return;
            }
            this._drawHelper.cancel();
        }
    }
    function init() {
        document.querySelectorAll('canvas').forEach(function(el) {
            el.handDraw = new HandDraw(el, {});
            let parent = el.parentElement;
            el.width = parent.clientWidth;
            el.height = parent.clientHeight;
        });
    }
    if (document.addEventListener !== undefined) {
        document.addEventListener('DOMContentLoaded', function(e) {
            init();
        });
    }
})(document, window);