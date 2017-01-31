## Lamda Amazon Service 

Lamda is an Amazon service that runs your code in response to any events. 
You upload your application code as "Lambda" functions and AWS Lambda runs your code.
All you need to do is supply your code in one of the languages that AWS Lambda supports (currently Node.js Java , Python, C#).

For example whenever image uploads into your s3 bucket, 
you want to create its thumnail,  You create a lambda function in nodejs and attach it with s3-bucket. Now each time when any
image upload into that bucket, its thumbnail will be created automatically. 

In this project we are converting tiff images into jp2. 
<ul>
<li> 	Upload *.tiff image into  bucket named as  "mybucket".</li>
<li> 	It will convert *.tiff image into *.jp2 and upload to another bucket named as "mybucket-output".</li>
</ul>

## Installation
<ul>
<li>Checkout this branch and see package.json file. These are required npm modules that need to be installed.  </li>
<li>Run following command to install these node-modules.<br />
npm install
</li>
<li>Create new Lambda function, Zip this whole projecct and upload this zip file. </li>

<li>Set the Handler index.handler in the configuration</li>

<li>Attach event sources with s3-bucket with event-type  'PUT'.</li>



