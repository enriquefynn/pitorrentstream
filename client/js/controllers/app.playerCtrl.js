'use strict';
var app = angular.module('app.playerCtrl', ['app.factory']);

app.controller('playerCtrl', ['$scope', 'socket', function($scope, socket)
{
    var self = this;

    self.start = function(address_streaming){socket.emit('start_player', address_streaming);}
    self.pause = function(){socket.emit('pause_player');}
    self.forward = function(){socket.emit('forward_player');}
    self.backward = function(){socket.emit('backward_player');}
    self.volume_up = function(){socket.emit('volume_up');}
    self.volume_down = function(){socket.emit('volume_down');}
    self.stop = function(){socket.emit('stop_player');}


}]);
