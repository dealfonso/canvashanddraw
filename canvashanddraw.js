/**
   Copyright 2023 Carlos A. (https://github.com/dealfonso)

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
        maxPoints: 0,
        antiAliasing: true,
        reducePoints: true
    };
    function distance(p1, p2, p) {
        let den = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        if (den == 0) {
            return null;
        }
        return Math.abs((p2.x - p1.x) * (p1.y - p.y) - (p2.y - p1.y) * (p1.x - p.x)) / den;
    }
    function pSBC(p, c0, c1, l) {
        let r, g, b, P, f, t, h, i = parseInt, m = Math.round, a = typeof c1 == "string";
        if (typeof p != "number" || p < -1 || p > 1 || typeof c0 != "string" || c0[0] != "r" && c0[0] != "#" || c1 && !a) return null;
        if (!this.pSBCr) this.pSBCr = d => {
            let n = d.length, x = {};
            if (n > 9) {
                [ r, g, b, a ] = d = d.split(","), n = d.length;
                if (n < 3 || n > 4) return null;
                x.r = i(r[3] == "a" ? r.slice(5) : r.slice(4)), x.g = i(g), x.b = i(b), x.a = a ? parseFloat(a) : -1;
            } else {
                if (n == 8 || n == 6 || n < 4) return null;
                if (n < 6) d = "#" + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (n > 4 ? d[4] + d[4] : "");
                d = i(d.slice(1), 16);
                if (n == 9 || n == 5) x.r = d >> 24 & 255, x.g = d >> 16 & 255, x.b = d >> 8 & 255, 
                x.a = m((d & 255) / .255) / 1e3; else x.r = d >> 16, x.g = d >> 8 & 255, x.b = d & 255, 
                x.a = -1;
            }
            return x;
        };
        h = c0.length > 9, h = a ? c1.length > 9 ? true : c1 == "c" ? !h : false : h, f = this.pSBCr(c0), 
        P = p < 0, t = c1 && c1 != "c" ? this.pSBCr(c1) : P ? {
            r: 0,
            g: 0,
            b: 0,
            a: -1
        } : {
            r: 255,
            g: 255,
            b: 255,
            a: -1
        }, p = P ? p * -1 : p, P = 1 - p;
        if (!f || !t) return null;
        if (l) r = m(P * f.r + p * t.r), g = m(P * f.g + p * t.g), b = m(P * f.b + p * t.b); else r = m((P * f.r ** 2 + p * t.r ** 2) ** .5), 
        g = m((P * f.g ** 2 + p * t.g ** 2) ** .5), b = m((P * f.b ** 2 + p * t.b ** 2) ** .5);
        a = f.a, t = t.a, f = a >= 0 || t >= 0, a = f ? a < 0 ? t : t < 0 ? a : a * P + t * p : 0;
        if (h) return "rgb" + (f ? "a(" : "(") + r + "," + g + "," + b + (f ? "," + m(a * 1e3) / 1e3 : "") + ")"; else return "#" + (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0)).toString(16).slice(1, f ? undefined : -2);
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
            if (p_list === null) {
                p_list = [];
            }
            let points = [ null ];
            for (let i = 0; i < p_list.length; i++) {
                if (p_list[i] === null) {
                    points.push(null);
                    continue;
                }
                let x = p_list[i].x;
                let y = p_list[i].y;
                if (x === null || y === null || x === undefined || y === undefined) {
                    points.push(null);
                    continue;
                }
                points.push({
                    x: x,
                    y: y
                });
            }
            this.points = points;
        }
        reduce_points() {
            if (this.points.length < 2) {
                return;
            }
            let p0 = this.points[0];
            let p1 = this.points[1];
            let points = [];
            let p2 = null;
            for (let i = 2; i < this.points.length; i++) {
                let advance = true;
                p2 = this.points[i];
                if (p0 !== null && p1 !== null) {
                    if (p2 === null) {
                        points.push(p1);
                        points.push(p2);
                        p0 = null;
                        p1 = null;
                    } else {
                        let d = distance(p0, p2, p1);
                        if (d === null) {
                            advance = false;
                        } else {
                            if (d > .1) {
                                points.push(p1);
                            } else {
                                advance = false;
                            }
                        }
                    }
                } else {
                    if (p1 !== null) {
                        points.push(p1);
                    }
                }
                if (advance) {
                    p0 = p1;
                }
                p1 = p2;
            }
            points.push(p2);
            this.points = points;
        }
        normalize(width, height = null, keepAspectRatio = true) {
            if (height === null) {
                height = width;
            }
            let min_x = NaN;
            let min_y = NaN;
            let max_x = NaN;
            let max_y = NaN;
            for (let i = 0; i < this.points.length; i++) {
                if (this.points[i] == null) {
                    continue;
                }
                if (isNaN(min_x) || this.points[i].x < min_x) {
                    min_x = this.points[i].x;
                }
                if (isNaN(min_y) || this.points[i].y < min_y) {
                    min_y = this.points[i].y;
                }
                if (isNaN(max_x) || this.points[i].x > max_x) {
                    max_x = this.points[i].x;
                }
                if (isNaN(max_y) || this.points[i].y > max_y) {
                    max_y = this.points[i].y;
                }
            }
            let dx = max_x - min_x;
            let dy = max_y - min_y;
            let scaleX = width / dx;
            let scaleY = height / dy;
            if (keepAspectRatio) {
                scaleX = scaleY = Math.min(scaleX, scaleY);
            }
            let offset_x = (width - dx * scaleX) / 2;
            let offset_y = (height - dy * scaleY) / 2;
            for (let i = 0; i < this.points.length; i++) {
                if (this.points[i] == null) {
                    continue;
                }
                this.points[i].x = (this.points[i].x - min_x) * scaleX + offset_x;
                this.points[i].y = (this.points[i].y - min_y) * scaleY + offset_y;
            }
        }
        getPoints() {
            return this.points;
        }
    }
    class DrawHelper {
        constructor(el, points = [], options = default_options) {
            this.el = el;
            this._cancel = false;
            this._options = mergeobjects(default_options, options);
            this._points = new Points(points);
            if (this._options.reducePoints) {
                this._points.reduce_points();
            }
            if (this._options.temporaryCanvasSize > 0) {
                this._options.temporaryCanvasMargin += Math.ceil(this._options.lineWidth / 2);
                this._points.normalize(this._options.temporaryCanvasSize - this._options.temporaryCanvasMargin * 2);
            }
            this.tmpCanvas = null;
        }
        getPoints() {
            return this._points.getPoints();
        }
        _prepareTmpCanvas() {
            if (this.tmpCanvas !== null) {
                return;
            }
            if (this._options.temporaryCanvasSize <= 0) {
                return;
            }
            var tmpCanvas = document.createElement("canvas");
            tmpCanvas.width = this._options.temporaryCanvasSize;
            tmpCanvas.height = this._options.temporaryCanvasSize;
            var tmpCtx = tmpCanvas.getContext("2d");
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
            ctx.moveTo(p1.x + dx, p1.y + dy);
            let l = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
            if (p0 === null || p3 === null || l < this._options.lineWidth) {
                ctx.lineTo(p2.x + dx, p2.y + dy);
            } else {
                let d0 = {
                    x: p1.x - p0.x,
                    y: p1.y - p0.y
                };
                let d2 = {
                    x: p3.x - p2.x,
                    y: p3.y - p2.y
                };
                let b = (p0.y + d0.y * ((p2.x - p0.x) / d0.x) - p2.y) / (d2.y - d2.x * d0.y / d0.x);
                if (isNaN(b)) {
                    b = (p0.x + d0.x * ((p2.y - p0.y) / d0.y) - p2.x) / (d2.x - d2.y * d0.x / d0.y);
                }
                let c = {
                    x: p0.x + d0.x * b,
                    y: p0.y + d0.y * b
                };
                let dp1c = Math.sqrt((p1.x - c.x) ** 2 + (p1.y - c.y) ** 2);
                let dp2c = Math.sqrt((p2.x - c.x) ** 2 + (p2.y - c.y) ** 2);
                let dr = Math.max(dp1c, dp2c) / l;
                if (isNaN(b) || !isFinite(b) || dr > 3) {
                    ctx.lineTo(p2.x + dx, p2.y + dy);
                } else {
                    ctx.quadraticCurveTo(c.x + dx, c.y + dy, p2.x + dx, p2.y + dy);
                }
            }
        }
        clear() {
            let ctx = this.el.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
        drawPoints(ctx, points, dx, dy, count = null, variableLineWidth = true, smoothWidth = 0) {
            if (smoothWidth <= 0) {
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
            let fQuick = Math.sqrt(Math.min(ctx.canvas.width, ctx.canvas.height));
            let fQuickSize = .5;
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
                    p0 = null;
                    p1 = null;
                    moveto = false;
                } else {
                    let actualLineWidth = this._options.lineWidth;
                    if (variableLineWidth) {
                        let mX = p2.x - p1.x;
                        let mY = p2.y - p1.y;
                        let m = Math.sqrt(mX * mX + mY * mY);
                        let relLength = Math.min(1, m / fQuick);
                        let relSize = Math.round((1 - relLength * (1 - fQuickSize)) * this._options.lineWidth);
                        actualLineWidth = relSize;
                    }
                    if (smoothWidth === 0 || actualLineWidth < this._options.lineWidth) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.lineWidth = (1 - smoothWidth) * actualLineWidth + this._options.lineWidth * smoothWidth;
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
            this._cancel = true;
        }
        _cancelAnimation() {
            if (this.interval != null) {
                clearInterval(this.interval);
                this.interval = null;
            }
            this._cancel = false;
            this._disposeTmpCanvas();
        }
        drawAnimated() {
            let points = this._points.getPoints();
            let count = this._options.delayMsBetweenStrokes <= 0 ? Math.min(this._options.maxPoints <= 0 ? points.length : this._options.maxPoints, points.length) : 0;
            this._cancelAnimation();
            this._prepareTmpCanvas();
            return new Promise((resolve, reject) => {
                if (this.interval !== null) {
                    clearInterval(this.interval);
                }
                this.interval = setInterval(function() {
                    if (this._cancel) {
                        this._cancelAnimation();
                        reject();
                        return;
                    }
                    var ctx = this.el.getContext("2d");
                    let tmpCtx = ctx;
                    let marginX = 0;
                    let marginY = 0;
                    if (this.tmpCanvas !== null) {
                        tmpCtx = this.tmpCanvas.getContext("2d");
                        marginX = this._options.temporaryCanvasMargin;
                        marginY = this._options.temporaryCanvasMargin;
                    }
                    tmpCtx.clearRect(0, 0, tmpCtx.canvas.width, tmpCtx.canvas.height);
                    if (this._options.drawDynamics && this._options.antiAliasing) {
                        let colorLighten1 = pSBC(.6, this._options.lineColor);
                        let colorLighten2 = pSBC(.8, this._options.lineColor);
                        tmpCtx.strokeStyle = colorLighten2;
                        this.drawPoints(tmpCtx, points, marginX, marginY, count, true, .8);
                        tmpCtx.strokeStyle = colorLighten1;
                        this.drawPoints(tmpCtx, points, marginX, marginY, count, true, .6);
                    }
                    tmpCtx.strokeStyle = this._options.lineColor;
                    this.drawPoints(tmpCtx, points, marginX, marginY, count, this._options.drawDynamics);
                    if (this.tmpCanvas !== null) {
                        let sX = ctx.canvas.width / this._options.temporaryCanvasSize;
                        let sY = ctx.canvas.height / this._options.temporaryCanvasSize;
                        if (!this._options.keepAspectRatio) {
                            sX = sY = Math.min(sX, sY);
                        }
                        let oX = (ctx.canvas.width - this._options.temporaryCanvasSize * sX) / 2;
                        let oY = (ctx.canvas.height - this._options.temporaryCanvasSize * sY) / 2;
                        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.drawImage(this.tmpCanvas, 0, 0, this._options.temporaryCanvasSize, this._options.temporaryCanvasSize, oX, oY, this._options.temporaryCanvasSize * sX, this._options.temporaryCanvasSize * sY);
                    }
                    if (count == Math.min(this._options.maxPoints <= 0 ? points.length : this._options.maxPoints, points.length)) {
                        this._cancelAnimation();
                        resolve();
                        return;
                    }
                    count++;
                }.bind(this), this._options.delayMsBetweenStrokes);
            });
        }
    }
    class CanvasHandDraw {
        static default_options = default_options;
        constructor(el, options = {}) {
            this._options = Object.assign({}, options);
            let delay = parseInt(el.getAttribute("data-delay"));
            if (!isNaN(delay)) {
                this._options.delayMsBetweenStrokes = delay;
            }
            let drawDynamics = el.getAttribute("data-draw-dynamics");
            if (drawDynamics !== null) {
                this._options.drawDynamics = drawDynamics.toLowerCase() === "true";
            }
            let reducePoints = el.getAttribute("data-reduce-points");
            if (reducePoints !== null) {
                this._options.reducePoints = reducePoints.toLowerCase() === "true";
            }
            let maxPoints = el.getAttribute("data-max-points");
            if (maxPoints !== null) {
                maxPoints = parseInt(maxPoints);
                if (!isNaN(maxPoints)) {
                    this._options.maxPoints = maxPoints;
                }
            }
            this.el = el;
            this._drawHelper = null;
            let autostart = this.el.getAttribute("data-autostart");
            if (autostart === null) {
                autostart = true;
            } else {
                autostart = autostart.toLowerCase() === "true";
            }
            if (autostart) {
                this.draw();
            }
        }
        draw(points = null, options = {}) {
            if (points === null) {
                points = JSON.parse(this.el.getAttribute("data-points"));
            }
            if (this._drawHelper !== null) {
                this._drawHelper.cancel();
            }
            let optionsMerged = Object.assign({}, this._options, options);
            this._drawHelper = new DrawHelper(this.el, points, optionsMerged);
            return this._drawHelper.drawAnimated();
        }
        redraw() {
            if (this._drawHelper === null) {
                return;
            }
            return this._drawHelper.drawAnimated();
        }
        cancel() {
            if (this._drawHelper == null) {
                return;
            }
            this._drawHelper.cancel();
        }
        getPoints() {
            if (this._drawHelper === null) {
                return;
            }
            return this._drawHelper.getPoints();
        }
        clear() {
            let ctx = this.el.getContext("2d");
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }
    function init() {
        document.querySelectorAll("canvas.canvashanddraw").forEach(function(el) {
            el.canvasHandDraw = new CanvasHandDraw(el, {});
            let parent = el.parentElement;
            el.width = parent.clientWidth;
            el.height = parent.clientHeight;
        });
    }
    if (document.addEventListener !== undefined) {
        document.addEventListener("DOMContentLoaded", function(e) {
            init();
        });
    }
    exports.CanvasHandDraw = CanvasHandDraw;
})(document, window);
