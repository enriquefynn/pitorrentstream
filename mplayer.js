'use strict';
var spawn = require('child_process').spawn;
var promise = require('bluebird');
var mplayer;

function kill_player(){
    spawn('pkill', ['mplayer']);
}

function command_factory(command){
    return (function(){mplayer.stdin.write(command);})
}

module.exports={
    play: function(url){
        kill_player();
        try{
            var error_code = promise.defer();
            mplayer = spawn('mplayer', ['-slave', '-quiet', url]);
            mplayer.on('close', function(code){
                error_code.resolve(code);
            })
            return error_code.promise;
        }
        catch(err){
            console.error(err);
        }
    },

    pause: command_factory('pause\n'),
    forward: command_factory('seek 5'),
    backward: command_factory('seek -5'),
    volume_init: command_factory('volume 10 1'),
    volume_up: command_factory('volume 1'),
    volume_down: command_factory('volume -1'),
    stop: kill_player
}
