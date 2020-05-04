'use strict';

// Connect to the storage account
var storage = require('azure-storage');

var blobService = storage.createBlobService(
    process.env.ACCOUNT_NAME,
    process.env.ACCOUNT_KEY
);

// Load image file names and create an array of cameras
var fs = require('fs');

fs.readdir('photos', (err, files) => {
    var cameras = JSON.parse(fs.readFileSync('cameras.json', 'utf8')).map(
        camera => new Camera(
            camera.deviceId,
            camera.latitude,
            camera.longitude,
            blobService,
            files
        )
    );

    // Start the cameras
    cameras.forEach(camera => {
        camera.start();
    });
});

class Camera {
    constructor(id, latitude, longitude, blobService, files) {
        this._id = id;
        this._latitude = latitude;
        this._longitude = longitude;
        this._blobService = blobService;
        this._files = files.slice(0);
        this._interval = 300000;
    }

    start() {
        // Register first callback
        setTimeout(this.timer, Math.random() * this._interval, this);
        console.log('Started ' + this._id);
    }

    timer(self) {
        // Randomly select a photo
        var index = Math.floor(Math.random() * self._files.length);
        var filename = self._files[index]

        // Define the metadata to be written to the blob
        var metadata = {
            'latitude': self._latitude,
            'longitude': self._longitude,
            'id': self._id
        };

        // Upload the blob
        self._blobService.createBlockBlobFromLocalFile('photos', filename, 'photos/' + filename, { 'metadata': metadata }, (err, result) => {
            if (!err) {
                console.log(self._id + ': Uploaded ' + filename);
            }
            else {
                console.log(self._id + ': Error uploading ' + filename);
            }
        });

        // Register the next callback
        setTimeout(self.timer, Math.random() * self._interval, self);
    }
}