// dependencies
var AWS = require('aws-sdk');
var path = require('path');
var fs = require('fs');
var gm = require('gm').subClass({
	imageMagick : true
});

//var s3 = new AWS.S3({
//	region : 'us-east-2'
//});
var s3 = new AWS.S3();
var srcFileExt = null;

var create_thumbnail_and_upload = function(s3_image_data, dest_bucket, dest_key, cb) {
	gm(s3_image_data.Body).size(function(err, size) {
		if (err) {
			console.log("image size error: ");
			console.log(err);
			cb(true, {
				status : false,
				message : 'Unable to get image size.'
			});
			return;
		}
		console.log(size);
		// Infer the scaling factor to avoid stretching the image
		// unnaturally.
		// var scalingFactor = Math.min(widthT / size.width, heightT / size.height);
		// var width = scalingFactor * size.width;
		// var height = scalingFactor * size.height;

		// Transform the image buffer in memory.
		this.resize(size.width, size.height).quality(100).setFormat('jpg').stream(function(err, stdout, stderr) {
			if (err) {
				console.log(err);
				cb(true, {
					status : false,
					message : 'Unable to create thumnail image.'
				});
				return;

			} else {
				// console.log(stderr);
				console.log('here else');
				var chunks = [];
				stdout.on('data', function(chunk) {
					// console.log('chunks');
					// console.log(chunks);
					chunks.push(chunk);
				});
				stdout.on('end', function() {
					console.log('end');
					// console.log(chunks);
					var image = Buffer.concat(chunks);
					var s3_options = {
						Bucket : dest_bucket,
						Key : dest_key,
						Body : image,
						// ACL: 'public-read',
						ContentType : "image/jp2",
						ContentLength : image.length
					}
					s3.upload(s3_options, function(err, data) {
						if (err) {
							console.log(err);
							cb(true, {
								status : false,
								message : 'Unable to upload the image.'
							});
							return;
						} else {
							cb(null, {
								status : true,
								message : 'Thumnail image uploaded successfully.'
							});
							return;
						}

					})
				});

				stderr.on('data', function(data) {
					console.log('stderr ${size} data:', data);
				});
			}
		});
	});
};

var convert_image_and_upload = function(local_file_path, output_file_path, dest_bucket, dest_key, cb) {
	console.log('call convert_image_and_upload...');

	var exec = require('child_process').exec, child;
	cmd = 'convert  ' + local_file_path + " -quality 0  " + output_file_path;
	console.log(cmd);
	child = exec(cmd, function(error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		if (stderr) {
			console.log('stderr: ' + stderr);
			cb(stderr, "Unable to convert this file");
		} else {
			s3.putObject({
				Bucket : dest_bucket,
				Key : dest_key,
				Body : fs.createReadStream(output_file_path),
				ContentType : "image/jp2"
			}, function(err, data) {

				if (err) {
					console.log(err);
					cb(true, {
						status : false,
						message : 'Unable to upload the image.'
					});
					return;
				} else {
					cb(null, {
						status : true,
						message : 'Thumnail image uploaded successfully.'
					});
					return;
				}

			});
		}

	});
}

exports.handler = function(event, context, callback) {
	// Read options from the event.
	console.log(JSON.stringify(event.Records));
	var srcBucket = event.Records[0].s3.bucket.name;
	// var srcKey = decodeURIComponent(event.Records[0].s3.object.key);

	var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

	console.log("srcKey: " + srcKey);
	var dstBucket = srcBucket + "-output";

	var srcFileExt = srcKey.substr(srcKey.lastIndexOf('.') + 1);
	var srcFileKey = srcKey.substr(0, srcKey.lastIndexOf('.'));
	var srcBaseName = path.basename(srcKey);

	local_stored_file_path = "/tmp/" + srcBaseName;
	console.log("srcFileKey: " + srcFileKey);
	console.log("srcFileExt: " + srcFileExt);
	console.log("local_stored_file_path: " + local_stored_file_path);

	var validImageTypes = [ 'png', 'tif', 'tiff', 'TIF', 'TIFF' ];
	if (validImageTypes.indexOf(srcFileExt) < 0) {
		console.log('image extension not match');
		context.callbackWaitsForEmptyEventLoop = false;
		callback(null, {
			status : false,
			message : 'Image extension does not match.'
		});
	}
	console.log('getting object');

	// console.log("encodeURIComponent: " + encodeURIComponent(srcKey));
	// console.log("decodeURIComponent: " + decodeURIComponent(srcKey));
	// Download the image from S3, transform, and upload to a different S3
	// bucket.
	s3.getObject({
		Bucket : srcBucket,
		Key : srcKey
	}, function(err, data) {
		if (err) {
			console.log('unable to download file.' + srcBucket + " key: " + srcKey);
			console.log(err);
			context.callbackWaitsForEmptyEventLoop = false;
			callback(null, {
				status : false,
				message : 'Unable to download the image.'
			});
		} else {

			console.log('Conversion Image Starting...');
			// console.log(data);

			var dstKey = srcFileKey.toLowerCase() + ".jp2";
			var output_file_path = "/tmp/" + path.basename(srcFileKey) + ".jp2";
			// convert_image_and_upload(local_stored_file_path, output_file_path, dstBucket, dstKey,
			// function(upload_err, upload_data) {
			create_thumbnail_and_upload(data, dstBucket, dstKey, function(upload_err, upload_data) {
				if (upload_err) {
					// if there is problem just print to console and move on.
					context.callbackWaitsForEmptyEventLoop = false;
					callback(null, {
						status : false,
						message : 'Unable to convert_image_and_upload'
					});
				} else {
					console.log('Done File converted! ');
					callback(null, {
						status : true,
						message : 'Done convert_image_and_upload'
					});
				}
			});

		}
	});

};

// node-lambda run
