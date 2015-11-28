// only allow 1 or 2 digit numbers for now (that is from 0-99)
var reg = /^(\d{1,2}:(\[(\d{1,2}(,\d{1,2})*)?\],?))+$|^$/

function validate(listStr) {
    // status code -1: fatal/syntax error; 0: semantic error; 2: empty string
    if (!reg.test(listStr))
        return -1;
    else {
        listStr = listStr.trim();
        if (listStr) { // if not empty  string
            try {
                var obj = eval("({" + listStr + "})"); // use the evil eval b/c JSON.parse fails on '0'
            } catch (e) {
                return -1;
            }

            for (var src in obj) {
                for (var i = 0; i < obj[src].length; i++) {
                    if (!(obj[src][i] in obj)) { // if target node does not appear in the collection of nodes
                        return 0;
                    }
                }
            }
        }
        else var obj = [];
        return obj;
    }
}

function validateTextBox() {
    var result = validate(this.value);
    if (result === -1 || result === 0) // may add missing nodes to resolve semantic error "smartly"
        this.className = "invalid";
    else {
        this.className = "valid";
        window.parent.graphWin.createFromList(result);
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

var text = document.getElementById('alBox');
// hack to auto adjust textarea height
function resize() {
    text.style.height = 'auto';
    text.style.height = text.scrollHeight + 'px';
}
/* 0-timeout to get the already changed text */
function delayedResize() {
    window.setTimeout(resize, 0);
}

// attach events
function init() {
    observe(text, 'change', resize);
    observe(text, 'cut', delayedResize);
    observe(text, 'paste', delayedResize);
    observe(text, 'drop', delayedResize);
    observe(text, 'click', delayedResize);
    observe(text, 'keydown', delayedResize);

    observe(text, 'keyup', validateTextBox);
    observe(text, 'change', validateTextBox);

    text.focus();
    text.select();
    resize();
}
