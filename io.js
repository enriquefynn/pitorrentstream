'use strict';
var http = require('http');
var fs = require('fs');
var TAG = 'SOCKET.IO';
var torrent = require('./torrent');
var promise = require('bluebird');
var numeral = require('numeral');
var omxplayer = require('./omxplayer');
var mplayer = require('./mplayer');

var IO = function(app, config){
    var io = require('socket.io')(app);
    var filesP;
    var timeout;
    var streamP;
    var subsP;
    var cache = {files: {}};
    var players = {'omxplayer': omxplayer, 'mplayer': mplayer};
    var current_player = 'omxplayer';
    try{
        io.on('connection', function(socket){
            socket.emit('info', {status: 'Connected', class: 'success'});

            try{
                if (filesP.isFulfilled())
                    cache.files = filesP.value();
            }
            catch(err){
                console.error(TAG, err);
            }

            socket.emit('cache', cache);

            var on_download = function(data){
                for (var file in cache.files)
                {
                    if (data.piece >= cache.files[file].startPiece && 
                            data.piece <= cache.files[file].endPiece)
                    {
                        cache.files[file].pieces.push(data.piece);
                    }
                }
                //FIXME: Be more connection friendly
                data.speed = numeral(data.speed).format('0.0b')
                io.emit('piece', data);
            }

            socket.on('start', function(magnet){
                torrent.remove_files();
                filesP = torrent.create(magnet, on_download);
                socket.emit('info', {status: 'Gathering metadata', class:'information'});
                filesP.then(function(files){
                    cache.files = filesP.value();
                    socket.emit('cache', cache);
                })
                .catch(function(err){
                    socket.emit('info', {status: err.message, class: 'error'});
                });
            });

            socket.on('select_file', function(file){
                torrent.select_file(file);
            });

            socket.on('deselect_file', function(file){
                torrent.deselect_file(file);
            });

            socket.on('get_subtitles', function(data){
                var fname = data.name;
                var lang = data.lang;
                subsP = torrent.get_subtitles(fname, lang);
                subsP.then(function(sfile){
                    if(!('subtitles' in cache.files[fname]))
                        cache.files[fname].subtitles = {};
                    cache.files[fname].subtitles[lang] = sfile;
                    socket.emit('subtitle');
                }).catch(function(error) {
                    socket.emit('subtitle_fail');
                });
            });

            socket.on('begin_stream', function(file){
                streamP = torrent.begin_stream(file);
                streamP.then(function(addr){
                    cache.address_streaming = {file: file, addr: addr};
                    socket.emit('address_streaming', {file: file, addr: addr});
                });
            });

            socket.on('stop_stream', function(){
                players[current_player].stop();
                var destroyedP =  torrent.stop_stream();
                destroyedP.then(function(){
                    cache = {files: {}};
                    socket.emit('cache', cache);
                });
            });

            //Player options TODO: Move somewhere
            socket.on('start_player', function(data){
                        var url = data.url;
                        var lang = data.lang;
                        var fname = data.fname;
                        socket.emit('info', {status: 'Player trying to start', class:'information'});
                        var subpath = '';
                        if(lang != undefined && lang != '')
                            subpath = cache.files[fname].subtitles[lang];
                        var error_code = players[current_player].play(url, subpath);
                        error_code.then(function(code){
                            if (code != 0)
                                socket.emit('info', {status: 'Player exited with error: ' + code, class:'error'});
                            });
            });
            socket.on('pause_player', function(){
                players[current_player].pause();
            });
            socket.on('stop_player', function(){
                players[current_player].stop();
            });
            socket.on('forward_player', function(){
                players[current_player].forward();
            });
            socket.on('backward_player', function(){
                players[current_player].backward();
            });
            socket.on('volume_up', function(){
                players[current_player].volume_up();
            });
            socket.on('volume_down', function(){
                players[current_player].volume_down();
            });
        });
    }
    catch(err){
        console.error(TAG, 'Failed to init:', err);
    }
};

module.exports = IO;
