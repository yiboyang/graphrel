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
*/


// only allow 1 or 2 digit numbers for now (that is from 0-99)
var alRegex = /^(\d{1,2}:(\[(\d{1,2}(,\d{1,2})*)?\],?))+$/

// handle to user input textarea box
var albox = document.getElementById('alBox');

albox.addEventListener('keyup', function () {
    if (alRegex.test(albox.value))
        albox.className = "valid";
    else {
        albox.className = "invalid";
    }
});
