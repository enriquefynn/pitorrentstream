'use strict';
var app = angular.module('app.torrentCtrl', ['app.factory']);

app.controller('torrentCtrl', ['$scope', 'socket', function($scope, socket){
    self = this;
    
    self.server_status = {status: 'Disconnected', class: 'error'};
    self.files = [];
    self.selected_file = '';

    function calc_completed(file)
    {
        var completed = self.files[file].pieces.length /
                    (self.files[file].endPiece - self.files[file].startPiece);
        completed = Math.round(completed*100);
        if (completed > 100)
            completed = 100;
        return completed;
    }

    socket.on('info', function(data){
        self.server_status = data;
    });

    socket.on('disconnect', function(){
        self.server_status = {status: 'Disconnected', class:'error'};
    });

    socket.on('cache', function(cache){
        self.server_status = {status: 'Connected', class: 'success'};
        self.files = cache.files;
        for (var file in self.files)
            self.files[file].completed = calc_completed(file);
    });

    socket.on('piece', function(data){
        //console.log(data);
        for (var file in self.files)
        {
             if (data.piece >= self.files[file].startPiece && data.piece <= self.files[file].endPiece)
             {
                self.files[file].pieces.push(data.piece);
                self.files[file].completed = calc_completed(file);
                break;
             }
        }
        self.download_speed = data.speed.toLowerCase() + '/s';
    });

    this.start = function(magnet){
        socket.emit('start', magnet);
    };
    
    this.select = function(file){
        socket.emit('select_file', file);
        self.selected_file = file;
    };

    this.stream = function(file){
        socket.emit('stream_file', file);
    };

    this.download = function(file){
        //socket.emit('resume_file', file);
    };

    this.pause = function(file){
        //socket.emit('pause_file', file);
    };

    this.remove = function(file){
        //socket.emit('remove_file', file);
    };

}]);
