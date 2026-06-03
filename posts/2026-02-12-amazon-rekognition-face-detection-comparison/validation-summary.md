# Validation Summary: How to Use Amazon Rekognition for Face Detection and Comparison

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS
- Amazon Rekognition
- AWS SDK for Python (Boto3)
- Python
- Amazon S3 image inputs
- Face detection, face comparison, face collections, and face search

## Sources Consulted
- Amazon Rekognition DetectFaces API / Boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/detect_faces.html
- Amazon Rekognition Detecting faces in an image guide: https://docs.aws.amazon.com/rekognition/latest/dg/faces-detect-images.html
- Amazon Rekognition CompareFaces API reference: https://docs.aws.amazon.com/rekognition/latest/APIReference/API_CompareFaces.html
- Amazon Rekognition IndexFaces API reference: https://docs.aws.amazon.com/rekognition/latest/APIReference/API_IndexFaces.html
- Amazon Rekognition SearchFacesByImage API reference: https://docs.aws.amazon.com/rekognition/latest/APIReference/API_SearchFacesByImage.html
- Amazon Rekognition Face Liveness guide: https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html
- Boto3 Rekognition client documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rekognition.html

## Issues Found
- The post said face detection finds every face in an image. AWS documents DetectFaces as detecting the 100 largest faces in an image, so the wording was corrected.
- The `Attributes=['ALL']` comment said `DEFAULT` returns just the bounding box. AWS documents the default attributes as bounding box, confidence, landmarks, pose, and quality, so the comment was corrected.
- The identity verification example described the selfie as "live" and called `EyesOpen` a liveness indicator. AWS documents Rekognition Face Liveness as the anti-spoofing/liveness workflow, so the wording was changed to describe `EyesOpen` as a quality check rather than liveness.

## Review Notes
The Python snippets are syntactically valid and use current Rekognition/Boto3 operation names and parameters. For production identity verification, the sample should be combined with Rekognition Face Liveness, human review, and risk-based controls where appropriate.
