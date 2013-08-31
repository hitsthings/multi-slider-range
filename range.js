(function(){
    function each(fn, arr) {
        var i = arr.length;
        while(i--) {
            fn(arr[i]);
        }
    }

    function filter(fn, arr) {
        for(var ret = [], i = 0; i < arr.length; i++) {
            if (fn(arr[i])) {
                ret.push(arr[i]);
            }
        }
        return ret;
    }

    function reduceRight(fn, seed, arr) {
        each(function(item) {
            seed = fn(seed, item);
        }, arr);
        return seed;
    }

    function partial(fn/*, ...args*/) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function() {
            return fn.apply(this, args.concat(Array.prototype.slice.call(arguments)));
        }
    }

    function compose(/*...fns*/) {
        var fns = arguments;
        return function() {
            return reduceRight(function (arg, fn) { return fn(arg); }, arguments[0], fns);
        };
    }

    function invoke(fn) {
        return fn.apply(this, arguments);
    }

    function findInput(name, range) {
        return range.querySelector ?
            range.querySelector('input[name="' + name + '"]') :
            filter(function(el) {
                return el.tagName === 'INPUT' && el.getAttribute('name') === name;
            }, range.children)[0];
    }

    function findSlider(name, range) {
        return range.querySelector ?
            range.querySelector('.slider[data-name="' + name + '"]') :
            filter(function(el) {
                return hasClass('slider', el) && el.getAttribute('data-name') === name;
            }, range.children)[0];
    }

    function createInput(name, value, range) {
        var input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', name);
        input.setAttribute('value', value);
        range.appendChild(input);
        return input;
    }

    function createSlider(name, value, range) {
        var slider = document.createElement('div');
        slider.className = 'slider';
        slider.setAttribute('data-name', name);
        slider.setAttribute('data-value', value);
        slider.setAttribute('tabindex', 0);
        range.appendChild(slider);
        return slider;
    }

    function getSliders(root) {
        return root.querySelectorAll ?
            root.querySelectorAll('.range > .slider') :
            filter(isSlider, root.getElementsByClassName('slider'));
    }

    function getSliderInputs(root) {
        return root.querySelectorAll ?
            root.querySelectorAll('.range > input') :
            filter(isSliderInput, root.getElementsByTagName('input'));
    }

    function isSlider(el) {
        return hasClass('slider', el) && el.parentNode && hasClass('range', el.parentNode);
    }

    function isSliderInput(el) {
        return el.tagName === 'INPUT' && el.parentNode && hasClass('range', el.parentNode);
    }

    function hasClass(clazz, el) {
        return el.classList ?
            el.classList.contains(clazz) :
            ~((' ' + el.className + ' ').replace(/[\t\n\f\r]/g, ' ').indexOf(' ' + clazz + ' '));
    }

    function getEvent(e) {
        return e || window.event;
    }

    function preventDefault(e) {
        e.preventDefault ? e.preventDefault() : (e.returnValue = false);
    }

    function addListener(type, fn, el) {
        el.addEventListener ? el.addEventListener(type, fn) : el.attachEvent(type, fn);
    }

    function removeListener(type, fn, el) {
        el.removeEventListener ? el.removeEventListener(type, fn) : el.detachEvent(type, fn);
    }

    function mouseXToValue(slide, mouseX) {
        var ratioLeft = (mouseX - slide.rangeXStart) / slide.rangeWidth;
        return ratioLeft * slide.width + slide.min;
    }
    function nearestStep(slide, value) {
        if (value < slide.min) return slide.min;
        if (value > slide.max) return slide.max;
        
        return Math.round((value - slide.min)/slide.step)*slide.step + slide.min;
    }
    function getOffsetLeft(el) {
        var o = 0;
        do {
            o += el.offsetLeft;
        } while((el = el.offsetParent));
        return o;
    }
    function moveSlider(slider, slide, value, init) {
        if (value > slide.max) value = slide.max;
        else if (value < slide.min) value = slide.min;
        
        if (!init && value === slide.value) return;
        
        var percent = 100*(value - slide.min) / slide.width;
        slider.style.left = percent + '%';
        slider.setAttribute('data-value', value);
        slide.input.setAttribute('value', value);
        slide.value = value;

        if (init) return;
        
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent('change', true, true);
        slider.dispatchEvent(evt);
    }
    function getSlide(slider) {
        var range = slider.parentNode;
        var rangeXStart = getOffsetLeft(range);
        var rangeWidth = range.offsetWidth;
        var min = Number(range.getAttribute('data-min')) | 0;
        var max = range.getAttribute('data-max');
        max = max == null ? 100 : Number(max);
        var step = Number(range.getAttribute('data-step')) || 1;
        
        var value = slider.getAttribute('data-value');
        var name = slider.getAttribute('data-name');

        var input = findInput(name, range);
        
        var slide = {
            min : min,
            max : max,
            width : max - min,
            step : step,
            value : value,
            name : name,
            rangeXStart : rangeXStart,
            rangeWidth : rangeWidth,
            input : input,
            range : range
        };
        slide.value = nearestStep(slide, value == null ? (max < min ? min : (max + min) / 2) : Number(value));
        return slide;
    }

    function beginHandleDrag(e) {
        e = getEvent(e);
        if (isSlider(e.target)) {
            preventDefault(e);
            
            var slider = e.target;
            var slide = getSlide(slider);
            
            var endHandleDrag = function (e) {
                e = getEvent(e);
                removeListener('mouseup', endHandleDrag, document.documentElement);
                removeListener('mousemove', handleDrag, document.documentElement);
            };
            var handleDrag = function (e) {
                e = getEvent(e);
                var rawValue = mouseXToValue(slide, e.pageX);
                var value = nearestStep(slide, rawValue);
                if (slide.value !== value) {
                    moveSlider(slider, slide, value);
                }
            }
            addListener('mouseup', endHandleDrag, document.documentElement);
            addListener('mousemove', handleDrag, document.documentElement);
        }
    }

    function handleSlide(e) {
        e = getEvent(e);
        if (e.keyCode === 37 || e.keyCode === 39) { // left/right
            if (isSlider(e.target)) {
                preventDefault(e);

                var slider = e.target;
                var slide = getSlide(slider);
                var valueAdd = e.keyCode === 37 ? -1 : +1;
                moveSlider(slider, slide, slide.value + valueAdd);
            }
        }
    }

    function initializeSlider(slider) {
        var slide = getSlide(slider);
        if (!slide.input) {
            slide.input = createInput(slide.name, slide.value, slide.range);
        }
        moveSlider(slider, slide, slide.value, true);
    }

    function initializeInput(input) {
        var name = input.getAttribute('name');
        var range = input.parentNode;
        var slider = findSlider(name, range);
        if (!slider) {
            initializeSlider(createSlider(name, input.getAttribute('value'), range));
        }
    }

    addListener('mousedown', beginHandleDrag, document.documentElement);
    addListener('keydown', handleSlide, document.documentElement);

    var initializeSliders = partial(each, initializeSlider);
    var initializeInputs = partial(each, initializeInput);
    addListener('DOMContentLoaded', partial(each, invoke, [
        compose(initializeSliders, partial(getSliders, document)),
        compose(initializeInputs, partial(getSliderInputs, document))
    ]), window);
})();