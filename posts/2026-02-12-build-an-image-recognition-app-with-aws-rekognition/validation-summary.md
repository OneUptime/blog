# Validation Summary: How to Build an Image Recognition App with AWS Rekognition

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Rekognition Image
- AWS Rekognition Custom Labels
- AWS Lambda
- Amazon API Gateway
- Amazon S3
- Amazon DynamoDB
- AWS CloudFormation
- Python
- Boto3

## Sources Consulted
- AWS Boto3 Rekognition `detect_labels` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/detect_labels.html
- AWS Boto3 Rekognition `detect_faces` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/detect_faces.html
- AWS Boto3 Rekognition `detect_text` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/detect_text.html
- AWS Boto3 Rekognition `compare_faces` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/compare_faces.html
- AWS Boto3 Rekognition `create_project_version` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/create_project_version.html
- AWS Boto3 Rekognition `start_project_version` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/start_project_version.html
- AWS Boto3 Rekognition `detect_custom_labels` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/detect_custom_labels.html
- AWS CloudFormation `AWS::S3::Bucket CorsConfiguration` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-corsconfiguration.html
- AWS CloudFormation `AWS::S3::Bucket CorsRule` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-corsrule.html
- AWS Rekognition pricing documentation: https://aws.amazon.com/rekognition/pricing/

## Issues Found
- The CloudFormation S3 bucket used a fixed bucket name, `image-recognition-uploads`. S3 bucket names are globally unique, so the sample could fail for most readers if that name is already taken. Changed it to use `!Sub image-recognition-uploads-${AWS::AccountId}-${AWS::Region}`.
- The Custom Labels example trained a project version and then showed inference without the required `StartProjectVersion` step. Added a `start_model` helper and a note to wait until `describe_project_versions` reports `RUNNING` before calling `detect_custom_labels`.
- The Lambda router used `datetime.utcnow()`, which is deprecated in current Python versions. Replaced it with timezone-aware `datetime.now(timezone.utc)`.

## Review Notes
- The Rekognition API parameter names and response fields in the examples match the current Boto3 documentation.
- The text detection example correctly uses `Filters.WordFilter.MinConfidence`; AWS documents that this filters word detections with values from 0 to 100.
- The pricing note is broadly accurate for the cited range, but Rekognition pricing varies by API group, region, usage tier, Image Properties usage, and Custom Labels inference-unit runtime.
