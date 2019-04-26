'use strict';

var iotHubName = 'HUB_NAME';
var storageAccountName = 'ACCOUNT_NAME';
var storageAccountKey = 'ACCOUNT_KEY';

class Camera {
    constructor(id, latitude, longitude, key, files) {
        this._id = id;
        this._latitude = latitude;
        this._longitude = longitude;
        this._key = key;
        this._files = files.slice(0);
        this._ready = false;
    }

    get id() {
        return this._id;
    }

    connect(iotHubName, storageAccountName, storageAccountKey, callback) {
        // Connect to blob storage
        var azure = require('azure-storage');
        this._storageAccountName = storageAccountName;
        this._blobService = azure.createBlobService(storageAccountName, storageAccountKey);

        // Connect to the IoT hub
        var connectionString = 'HostName=' + iotHubName + '.azure-devices.net;DeviceId=' + this._id + ';SharedAccessKey=' + this._key;
        var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
        this._client = clientFromConnectionString(connectionString);

        this._client.open((err) => {
            if (!err) {
                this._ready = true;
            }

            callback(this._ready);
        });
    }

    start() {
        // Register first callback for 5 to 60 seconds
        setTimeout(this.timer, (Math.random() * 55000) + 5000, this);
    }

    timer(self) {
        if (self._ready === true) {
            // "Trigger" the camera with a random photo
            var index = Math.floor(Math.random() * self._files.length);
            self.trigger(self._files[index], (err, result) => {});

            // Register another callback for 5 to 60 seconds
            setTimeout(self.timer, (Math.random() * 55000) + 5000, self);
        }
    }

    trigger(imageFileName, callback) {
        if (this._ready === true) {
            // Upload the image to blob storage
            this.upload(imageFileName, (err, result) => {
                if (err) {
                    callback(err, result);
                }
                else {
                    // Send an event to the IoT hub
                    this.send(imageFileName, (err, result) => {
                        console.log(this._id + ': https://' + this._storageAccountName + '.blob.core.windows.net/photos/' + imageFileName);
                        callback(err, result);
                    });
                }
            });
        }
    }

    upload(imageFileName, callback) {
        this._blobService.createBlockBlobFromLocalFile('photos', imageFileName, 'assets/photos/' + imageFileName, (err, result) => {
            callback(err, result);
        });
    }

    send(imageFileName, callback) {
        var Message = require('azure-iot-device').Message;

        var data = {
            'deviceId' : this._id,
            'latitude' : this._latitude,
            'longitude' : this._longitude,
            'url' : 'https://' + this._storageAccountName + '.blob.core.windows.net/photos/' + imageFileName,
            'timestamp' : new Date().toISOString()
        };

        var message = new Message(JSON.stringify(data));

        this._client.sendEvent(message, (err, result) => {
            callback(err, result);
        });
    }
}

// Load image file names
var fs = require('fs');

fs.readdir('photos', (err, files) => {
    // Create an array of cameras
    var cameras = JSON.parse(fs.readFileSync('cameras.json', 'utf8')).map(
        camera => new Camera(
            camera.deviceId,
            camera.latitude,
            camera.longitude,
            camera.key,
            files
        )
    );

    // Start the cameras
    cameras.forEach(camera => {
        camera.connect(iotHubName, storageAccountName, storageAccountKey, status => {
            if (status === true) {
                console.log(camera.id + ' connected');
                camera.start();
            }
            else {
                console.log(camera.id + ' failed to connect');
            }
        })
    });
});
