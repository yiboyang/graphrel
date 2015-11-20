// regex for validating user-input adjacency list
// var reg = /^(\d+:(\[(\d+(,\d+)*)?\],?))+$/
/*
\d+ means a number, i.e. one or more digits (\d is the digit class), like 1, 2, 23

,\d+ means we want a comma followed by a number

\d+(,\d+)* means we want a number followed by (...), where (...) can repeat zero or infinitely many times, 
giving us a list of comma separated numbers

\[(\d+(,\d+)*)?\],? means we want '[' optionally followed by \d+(,\d+)* then by ']' then optionally by ','

\d+:(\[(\d+(,\d+)*)?\],?) means we want a number followed by ':' followed by stuff in ()

(\d+:(\[(\d+(,\d+)*)?\],?))+ means we want \d+:(\[(\d+(,\d+)*)?\],?) to appear one or  infinitely many times

^(\d+:(\[(\d+(,\d+)*)?\],?))+$ means we want to match the string from beginning to end, not any substring 

pattern|^$ means pattern or empty string
*/

// only allow 1 or 2 digit numbers for now (that is from 0-99)
var reg = /^(\d{1,2}:(\[(\d{1,2}(,\d{1,2})*)?\],?))+$|^$/

function validate() {
    if (!reg.test(this.value))
        this.className = "invalid";
    else {
        if (this.value.trim()) {
            try {
                var obj = eval("({" + this.value + "})"); // use the evil eval b/c JSON.parse fails on '0'
            } catch (e) {
                this.className = "invalid";
                return;
            }

            for (var src in obj) {
                for (var i = 0; i < obj[src].length; i++) {
                    if (!(obj[src][i] in obj)) { // if target node does not appear in the collection of nodes
                        this.className = "invalid";
                        return;
                    }
                }
            }
        }
        else var obj = []; // else empty string

        this.className = "valid";
        window.parent.graphWin.createFromList(obj);
    }
}


var observe;
if (window.attachEvent) {
    observe = function (element, event, handler) {
        element.attachEvent('on' + event, handler);
    };
} else {
    observe = function (element, event, handler) {
        element.addEventListener(event, handler, false);
    };
}

function init() {
    text = document.getElementById('alBox');
    // hack to auto adjust textarea height
    function resize() {
        text.style.height = 'auto';
        text.style.height = text.scrollHeight + 'px';
    }
    /* 0-timeout to get the already changed text */
    function delayedResize() {
        window.setTimeout(resize, 0);
    }
    observe(text, 'change', resize);
    observe(text, 'cut', delayedResize);
    observe(text, 'paste', delayedResize);
    observe(text, 'drop', delayedResize);
    observe(text, 'keydown', delayedResize);

    observe(text, 'keyup', validate);
    observe(text, 'change', validate);

    text.focus();
    text.select();
    resize();
}
