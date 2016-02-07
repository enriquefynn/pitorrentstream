'use strict';
var http = require('http');
var fs = require('fs');
var TAG = 'SOCKET.IO';
var torrent = require('./torrent');
var promise = require('bluebird');
var numeral = require('numeral');

var IO = function(app, config){
    var io = require('socket.io')(app);
    var filesP;
    var timeout;
    try{
        io.on('connection', function(socket){
            socket.emit('info', {status: 'Connected', class: 'success'});
            var cache = {files: {}};

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

            socket.on('begin_stream', function(file){
                torrent.begin_stream(file);
            });
        });
    }
    catch(err){
        console.error(TAG, 'Failed to init:', err);
    }
};

module.exports = IO;
