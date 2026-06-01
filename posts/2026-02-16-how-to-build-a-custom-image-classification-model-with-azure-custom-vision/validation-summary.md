# Validation Summary: How to Build a Custom Image Classification Model with Azure Custom Vision

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Custom Vision
- Custom Vision Training API and Prediction API
- Azure Custom Vision Python SDK
- Python
- Image classification
- Edge model export formats including TensorFlow Lite, CoreML, ONNX, DockerFile, and OpenVino

## Sources Consulted
- Microsoft Learn: Quickstart: Image classification with Custom Vision SDK - https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/quickstarts/image-classification
- Microsoft Learn: Quickstart: Build an image classification model with the Custom Vision portal - https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/getting-started-build-a-classifier
- Microsoft Learn: Limits and quotas - Custom Vision Service - https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/limits-and-quotas
- Microsoft Learn: Select a domain for a Custom Vision project - https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/select-domain
- Microsoft Learn: Export your model for use with mobile devices - https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/export-your-model
- Microsoft Learn: Export a model programmatically - https://learn.microsoft.com/en-us/azure/ai-services/custom-vision-service/export-programmatically
- Microsoft Learn: Projects - Create REST API - https://learn.microsoft.com/en-us/rest/api/customvision/projects/create?view=rest-customvision-v3.3
- Microsoft Learn: Images REST API - https://learn.microsoft.com/en-us/rest/api/customvision/images?view=rest-customvision-v3.3
- Microsoft Azure product page: Azure AI Custom Vision - https://azure.microsoft.com/products/cognitive-services/custom-vision-service/

## Issues Found
- The original project creation used the default General domain while the post later exported the trained model. Microsoft documentation states that export is available only for projects using compact domains. I changed the SDK example to select the `General (compact)` classification domain with `trainer.get_domains()` and use its `id` when creating the project.
- The original image upload helper omitted `.gif`, even though Custom Vision accepts `jpg`, `png`, `bmp`, and `gif` training images. I added `.gif` to the accepted extensions.
- The image guidance described 50 images per tag as a strict minimum. Current Custom Vision limits list a lower classification minimum, while Microsoft recommends 50+ images per tag. I changed the text to describe 50 images as the recommended starting point.
- The image guidance said images should be at least `256x256` and up to 6 MB. Microsoft documents the requirement as 256 pixels on the shortest edge, with a 6 MB limit for training images and 4 MB limit for prediction images. I corrected that wording.
- The export API options in the comment used `Dockerfile` and `OpenVINO`. The official Python export documentation lists `DockerFile` and `OpenVino` as allowed platform values, so I corrected the API-value spelling in the code comment.
- The dataset-size recommendation used a specific `50-10,000 images per class` range that is not an official Custom Vision per-class limit. I changed it to a more accurate guidance phrase: tens to thousands of images per class.

## Review Notes
Microsoft has announced planned retirement of Azure Custom Vision, with support for existing customers until September 25, 2028. The post remains technically valid for current Custom Vision users, but future updates should mention the retirement notice and migration paths to Azure Machine Learning AutoML or other Azure AI alternatives.
