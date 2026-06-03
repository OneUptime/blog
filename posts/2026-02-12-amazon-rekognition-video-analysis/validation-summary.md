# Validation Summary: How to Use Amazon Rekognition for Video Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Rekognition Video
- Amazon S3
- Amazon SNS
- Amazon Kinesis Video Streams
- Amazon Kinesis Data Streams
- Python
- Boto3

## Sources Consulted
- Amazon Rekognition Developer Guide: Working with stored video analysis operations - https://docs.aws.amazon.com/rekognition/latest/dg/video.html
- Amazon Rekognition Developer Guide: Calling Amazon Rekognition Video operations - https://docs.aws.amazon.com/rekognition/latest/dg/api-video.html
- Boto3 Rekognition `start_label_detection` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/start_label_detection.html
- Boto3 Rekognition `get_label_detection` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/get_label_detection.html
- Boto3 Rekognition `start_face_detection` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/start_face_detection.html
- Boto3 Rekognition `get_face_detection` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/get_face_detection.html
- Boto3 Rekognition `start_content_moderation` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/start_content_moderation.html
- Boto3 Rekognition `get_content_moderation` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/get_content_moderation.html
- Boto3 Rekognition `start_text_detection` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/start_text_detection.html
- Boto3 Rekognition `get_text_detection` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/get_text_detection.html
- Boto3 Rekognition `create_stream_processor` reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/create_stream_processor.html
- Boto3 Rekognition `start_stream_processor` reference - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rekognition/client/start_stream_processor.html

## Issues Found
- The description and introduction implied text extraction from live video streams. Rekognition `StartTextDetection` is for stored videos in S3, while Rekognition stream processors support face search and connected-home label detection. Updated the wording to say text extraction is for stored videos.
- The label timestamp explanation said timestamps show exactly when objects appear. AWS documents that video detection timestamps are in milliseconds from the start of the video but are not guaranteed to be accurate to the individual frame. Changed the wording to "approximately."
- The face detection section described "tracking" faces. `StartFaceDetection`/`GetFaceDetection` detect faces over time but do not assign persistent identities across frames. Updated this to "detect faces."
- The pipeline default included `faces`, but the code did not start a face detection job or include `get_face_detection` in the waiter map. Added the missing `start_face_detection` call and `faces` getter mapping.

## Review Notes
The examples use polling for simplicity. AWS's recommended production pattern is to use the SNS completion notification, often consumed through SQS or Lambda, before retrieving results.
