# Validation Summary: How to Use Amazon Rekognition Custom Labels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Rekognition Custom Labels
- AWS SDK for Python (Boto3)
- Amazon S3
- SageMaker Ground Truth manifest files
- AWS Lambda
- Python

## Sources Consulted
- Amazon Rekognition Custom Labels Developer Guide: What is Amazon Rekognition Custom Labels? https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/what-is.html
- Amazon Rekognition Custom Labels Developer Guide: Guidelines and quotas. https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/limits.html
- Amazon Rekognition Custom Labels Developer Guide: Using a manifest file to import images. https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/md-create-dataset-ground-truth.html
- Amazon Rekognition Custom Labels Developer Guide: Object localization in manifest files. https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/md-create-manifest-file-object-detection.html
- Amazon Rekognition Custom Labels Developer Guide: Assigning image-level labels to an image. https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/md-assign-image-level-labels.html
- Boto3 Rekognition create_project reference. https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/create_project.html
- Boto3 Rekognition create_dataset reference. https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/create_dataset.html
- Boto3 Rekognition create_project_version reference. https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/create_project_version.html
- Boto3 Rekognition start_project_version reference. https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/start_project_version.html
- Boto3 Rekognition detect_custom_labels reference. https://docs.aws.amazon.com/boto3/latest/reference/services/rekognition/client/detect_custom_labels.html

## Issues Found
- The dataset guidance said there is a minimum of 10 images per label. AWS current quotas allow very small datasets, with documented minimum images per label varying by dataset context, so the text was changed to frame 50-100 images per label as a quality recommendation rather than an AWS minimum.
- The introductory examples included medical image classification. AWS documentation lists business and domain-specific image examples for Custom Labels, but does not present the service as a medical imaging/diagnosis service. The example was changed to "specialized domain images" to avoid implying a medical use case.
- The test dataset example referenced `manifests/test.manifest` without uploading it. Added an upload step for `test_manifest.jsonl` before creating the test dataset.
- The Lambda example used `boto3` and `os` without importing them. Added the missing imports.

## Review Notes
The Rekognition API calls, manifest field names, training status checks, model start/stop flow, `DetectCustomLabels` parameters, and bounding box response handling are consistent with current AWS documentation. All Python code blocks were syntax-checked with `ast.parse`.
