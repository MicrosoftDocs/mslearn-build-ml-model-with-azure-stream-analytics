// TODO: this assumes you set the environment variables for these values.
// If not, replace the value with the proper text.
var iotHubName = process.env.HUB_NAME;
var storageAccountName = process.env.ACCOUNT_NAME;

// TODO: replace the following value with the storage account key.
var storageAccountKey = 'ACCOUNT_KEY';

// Upload an image to blob storage
var azure = require('azure-storage');
var blobService = azure.createBlobService(storageAccountName, storageAccountKey);

blobService.createBlockBlobFromLocalFile('photos', 'image_19.jpg', 'assets/photos/image_19.jpg', (err, result, response) => {
    if (err) {
        console.log('Error uploading blob: ' + err);
    }
    else {
        console.log("Blob uploaded");

        // Get information about polar_cam_0003 from cameras.js
        var fs = require('fs');
        var cameras = JSON.parse(fs.readFileSync('cameras.json', 'utf8'));
        var camera = cameras.find(o => o.deviceId === 'polar_cam_0003');

        // Send an event to the IoT hub and include the blob's URL
        var Message = require('azure-iot-device').Message;
        var connectionString = 'HostName=' + iotHubName + '.azure-devices.net;DeviceId=' + camera.deviceId + ';SharedAccessKey=' + camera.key;
        var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
        var client = clientFromConnectionString(connectionString);

        client.open(err => {
            if (err) {
                console.log('Error connecting to IoT hub: ' + err);
            }
            else {
                var data = {
                    'deviceId' : camera.deviceId,
                    'latitude' : camera.latitude,
                    'longitude' : camera.longitude,
                    'url' : 'https://' + storageAccountName + '.blob.core.windows.net/photos/image_19.jpg',
                    'timestamp' : new Date().toISOString()
                };

                var message = new Message(JSON.stringify(data));

                client.sendEvent(message, (err, result) => {
                    if (err) {
                        console.log('Error sending event: ' + err);
                    }
                    else {
                        console.log("Event transmitted");
                    }
                });
            }
        });
    }
});
