'use strict';
var app = angular.module('app.torrentCtrl', ['app.factory']);

app.controller('torrentCtrl', ['$scope', 'socket', function($scope, socket){
    self = this;
    
    self.server_status = {status: 'Disconnected', class: 'error'};
    self.files = [];
    self.selected_file = 0;

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

    socket.on('piece', function(piece){
        for (var file in self.files)
        {
             if (piece >= self.files[file].startPiece && piece <= self.files[file].endPiece)
             {
                self.files[file].pieces.push(piece);
                self.files[file].completed = calc_completed(file);
                break;
             }
        }
    });

    this.start = function(magnet){
        socket.emit('start', magnet);
    };
    
    this.select = function(file){
        socket.emit('stream_file', file);
    };
    
}]);
