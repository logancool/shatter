// triangulation using https://github.com/ironwallaby/delaunay

const TWO_PI = Math.PI * 2;
var WC_IMG, AD_IMG;
const DURATION = 1;
var vertices = [],
    indices = [],
    fragments = [];

dur = 0;

var wc_cont = document.getElementById('wc_cont');
var ad_cont = document.getElementById('ad_cont');
var closeBtn = document.getElementById("close_btn");

function init() {
    window.onload = function () {

        TweenMax.set(wc_cont, {perspective:100});

        WC_IMG = new Image();
        AD_IMG = new Image();

        WC_IMG.src = 'images/WC_1.png';
        AD_IMG.src = 'images/AU_1.jpg';
        WC_IMG.width = wc_cont.style.width = screen.width;
        AD_IMG.width = 768;
        AD_IMG.height = 485;
        ad_cont.style.width = AD_IMG.width + 'px';
        ad_cont.style.height = AD_IMG.height + 'px';
        //WC_IMG.style.zIndex = 2;

        resetAd();

    };
}

function addCloseBtn() {
    closeBtn.addEventListener("click", closeClicked);
    closeBtn.style.display = "block";
    document.body.appendChild(closeBtn);
};

function closeClicked() {

    wc_cont.appendChild(WC_IMG);
    ad_cont.removeChild(AD_IMG);

    //hide the image behind
    AD_IMG.style.display = "none";
    closeBtn.style.display = "none";

    //remove previous listeners
    WC_IMG.removeEventListener('click', initShatterObj);
    closeBtn.removeEventListener("click", closeClicked);

    resetAd();
}


function resetAd() {
    wc_cont.appendChild(WC_IMG);
    WC_IMG.addEventListener('click', initShatterObj);
    fade(WC_IMG, 0, 1); //fade the website back
    fade(AD_IMG, 0, 1); // fade the ad out
    AD_IMG.style.display = "block";
}

function placeAd(clickPos) {

    fade(AD_IMG, 0, 1); // fade the ad out

    ad_cont.style.marginTop = 0;
    ad_cont.style.marginLeft = 0;
    ad_cont.style.marginRight = 0;
    ad_cont.style.marginBottom = 0;
    ad_cont.style.top = clickPos[1] - ad_cont.clientHeight / 2 + 'px';
    ad_cont.style.left = clickPos[0] - ad_cont.clientWidth / 2 + 'px';

    var tempX = screen.width / 2 - ad_cont.clientWidth / 2;
    var tempY = screen.height / 2 - ad_cont.clientHeight / 2
    setTimeout(function () {
        TweenLite.to(ad_cont, DURATION, {left: tempX, top: tempY});
    }, 4000);


}

function initShatterObj(event) {
    var clickPos = [];
    var box = WC_IMG.getBoundingClientRect(),
        top = box.top,
        left = box.left;

    clickPos[0] = event.clientX - left;
    clickPos[1] = event.clientY - top;


    ad_cont.appendChild(AD_IMG);
    wc_cont.removeChild(WC_IMG);

    triangulate(clickPos);
    shatter(clickPos);
    addCloseBtn();
    placeAd(clickPos);

}

function triangulate(clickPos) {
    var rings = [{
            r: 50,
            c: 12
        }, {
            r: 150,
            c: 12
        }, {
            r: 300,
            c: 12
        }, {
            r: 1200,
            c: 12
        } // very large in case of corner clicks
        ],
        x,
        y,
        centerX = clickPos[0],
        centerY = clickPos[1];

    //console.log("click: " + clickPos);

    vertices.push([centerX, centerY]);

    rings.forEach(function (ring) {
        var radius = ring.r,
            count = ring.c,
            variance = radius * 0.25;

        for (var i = 0; i < count; i++) {
            x = Math.cos((i / count) * TWO_PI) * radius + centerX + randomRange(-variance, variance);
            y = Math.sin((i / count) * TWO_PI) * radius + centerY + randomRange(-variance, variance);
            vertices.push([x, y]);
        }
    });

    vertices.forEach(function (v) {
        v[0] = clamp(v[0], 0, WC_IMG.width);
        v[1] = clamp(v[1], 0, WC_IMG.height);
    });

    indices = Delaunay.triangulate(vertices);
}

function shatter(clickPos) {
    var p0, p1, p2,
        fragment;

    var tl0 = new TimelineMax({
        onComplete: shatterCompleteHandler
    });

    for (var i = 0; i < indices.length; i += 3) {
        p0 = vertices[indices[i + 0]];
        p1 = vertices[indices[i + 1]];
        p2 = vertices[indices[i + 2]];

        fragment = new Fragment(p0, p1, p2);

        var dx = fragment.centroid[0] - clickPos[0],
            dy = fragment.centroid[1] - clickPos[1],
            d = Math.sqrt(dx * dx + dy * dy),
            rx = 30 * sign(dy),
            ry = 90 * -sign(dx),
            delay = d * 0.001 * randomRange(1, 1.1);
        fragment.canvas.style.zIndex = Math.floor(d).toString();

        var tl1 = new TimelineMax();


        tl1.to(fragment.canvas, 1, {
            z: -100,
            rotationX: 1,
            rotationY: 1,
            ease: Cubic.easeIn
        });
        tl1.to(fragment.canvas, 0.4, {alpha: 0}, 0.6);
        tl0.insert(tl1, delay);
        fragments.push(fragment);
        wc_cont.appendChild(fragment.canvas);
    }

}

function shatterCompleteHandler() {
    // add pooling?
    fragments.forEach(function (f) {
        wc_cont.removeChild(f.canvas);
    });
    fragments.length = 0;
    vertices.length = 0;
    indices.length = 0;
    //placeImage();
}

//////////////
// MATH UTILS
//////////////

function randomRange(min, max) {
    return min + (max - min) * Math.random();
}

function fade(component, from, to) {
    TweenLite.fromTo(component, DURATION, {opacity: from}, {opacity: to});
}
function clamp(x, min, max) {
    return x < min ? min : (x > max ? max : x);
}

function sign(x) {
    return x < 0 ? -1 : 1;
}

//////////////
// FRAGMENT
//////////////

function isRetina() {
    if (window.devicePixelRatio > 1) {
        return true;
    }
    else {
        return false;
    }
}

Fragment = function (v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;

    this.computeBoundingBox();
    this.computeCentroid();
    this.createCanvas();
    this.clip();
};
Fragment.prototype = {
    computeBoundingBox: function () {
        var xMin = Math.min(this.v0[0], this.v1[0], this.v2[0]),
            xMax = Math.max(this.v0[0], this.v1[0], this.v2[0]),
            yMin = Math.min(this.v0[1], this.v1[1], this.v2[1]),
            yMax = Math.max(this.v0[1], this.v1[1], this.v2[1]);

        if (isRetina()){
            this.box = {
                x: xMin/2,
                y: yMin/2,
                w: (xMax - xMin)/2,
                h: (yMax - yMin)/2
            };
        }
        else {
            this.box = {
                x: xMin,
                y: yMin,
                w: xMax - xMin,
                h: yMax - yMin
            };
        }
    },
    computeCentroid: function () {
        var x = (this.v0[0] + this.v1[0] + this.v2[0]) / 3,
            y = (this.v0[1] + this.v1[1] + this.v2[1]) / 3;

        this.centroid = [x, y];
    },
    createCanvas: function () {
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.box.w;
        this.canvas.height = this.box.h;
        this.canvas.style.width = this.box.w + 'px';
        this.canvas.style.height = this.box.h + 'px';
        this.canvas.style.left = this.box.x + 'px';
        this.canvas.style.top = this.box.y + 'px';
        this.ctx = this.canvas.getContext('2d');
    },
    clip: function () {
        this.ctx.translate(-this.box.x, -this.box.y);
        this.ctx.beginPath();
        this.ctx.moveTo(this.v0[0], this.v0[1]);
        this.ctx.lineTo(this.v1[0], this.v1[1]);
        this.ctx.lineTo(this.v2[0], this.v2[1]);
        this.ctx.closePath();
        this.ctx.clip();
        this.ctx.drawImage(WC_IMG, 0, 0);
    }
};

//load ad
init();