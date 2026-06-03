# Validation Summary: How to Build a Video Surveillance System on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Kinesis Video Streams
- Kinesis Video Streams Producer SDK and GStreamer `kvssink`
- Amazon Rekognition Video and Rekognition Image face collections
- Amazon Kinesis Data Streams
- AWS Lambda
- Amazon DynamoDB
- Amazon SNS
- Amazon S3 lifecycle configuration
- API Gateway
- Python and boto3

## Sources Consulted
- Amazon Rekognition CreateStreamProcessor API Reference: https://docs.aws.amazon.com/rekognition/latest/APIReference/API_CreateStreamProcessor.html
- Amazon Rekognition streaming video output documentation: https://docs.aws.amazon.com/rekognition/latest/dg/streaming-video-kinesis-output.html
- Amazon Rekognition feature availability changes: https://docs.aws.amazon.com/rekognition/latest/dg/rekognition-availability-changes.html
- Amazon Rekognition pricing: https://aws.amazon.com/rekognition/pricing/
- Kinesis Video Streams GStreamer `kvssink` examples: https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/examples-gstreamer-plugin.html
- Kinesis Video Streams `CreateStream` boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesisvideo/client/create_stream.html
- Kinesis Video Streams archived media `GetClip` boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/kinesis-video-archived-media/client/get_clip.html
- Amazon S3 lifecycle configuration documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- DynamoDB `Table.query` boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/query.html
- Rekognition `IndexFaces` boto3 reference: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/index_faces.html

## Issues Found
- The architecture showed Lambda processing video before Rekognition, but the Rekognition stream processor consumes Kinesis Video Streams directly and writes results to Kinesis Data Streams. Updated the diagram and description so Lambda processes Rekognition results instead.
- The post presented Rekognition Streaming Video as generally available for new builds. AWS documentation says Streaming Video is no longer available to new customers effective April 30, 2026. Added a caveat and suggested confirming account access or using Rekognition Image APIs on sampled frames for new deployments.
- The result-processing Lambda tried to read `InputInformation.KinesisVideo.StreamName`, but documented Rekognition output includes `StreamArn`, not `StreamName`. Added a helper to derive the stream name from the ARN.
- The result-processing Lambda reused `context.aws_request_id` for multiple detection events and used second-level timestamps, which could overwrite events when `camera` and `timestamp` are used as keys. Updated the example to generate a UUID per event and store millisecond timestamps.
- The dashboard query example did not state the required DynamoDB key schema and used second-level timestamps while the writer now stores milliseconds. Added the table-key assumption and aligned the query time range to milliseconds.
- The S3 lifecycle JSON omitted a rule filter. Current S3 lifecycle configuration requires `Filter` unless using the legacy `Prefix` field. Added a prefix filter for archived footage.

## Review Notes
The GStreamer `kvssink`, Kinesis Video Streams `CreateStream`, Rekognition `CreateStreamProcessor`, Rekognition `IndexFaces`, Kinesis archived media `GetClip`, DynamoDB query, and S3 transition storage-class examples are otherwise consistent with current official documentation. Pricing values should still be recalculated before publication because AWS regional pricing can change.
