'use strict';

var http = require("http");
var url = require("url");
var path = require("path");
var fs = require("fs");

var IO = require('./io');
var port = 8080;

var app = http.createServer(function(request, response) {

    var uri = url.parse(request.url).pathname
        , filename = path.join(process.cwd(), 'client', uri);

    try{
        if (fs.statSync(filename).isDirectory()) filename += 'index.html';

        fs.readFile(filename, "binary", function(err, file) {
            if(err) {        
                response.writeHead(500, {"Content-Type": "text/plain"});
                response.write(err + "\n");
                response.end();
                return;
            }

            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    }
    catch(err){
        response.writeHead(404, {"Content-Type": "text/plain"});
        response.write("404 Not Found\n");
        response.end();
    }
});
app.listen(port);

IO(app, {});

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");
