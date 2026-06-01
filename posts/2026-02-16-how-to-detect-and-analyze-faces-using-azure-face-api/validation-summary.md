# Validation Summary: How to Detect and Analyze Faces Using Azure Face API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Face API
- Azure AI Vision Face Python SDK
- Python
- REST API
- Azure AI Services rate limits and quotas

## Sources Consulted
- Microsoft Learn: Azure AI Face client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/ai-vision-face-readme?view=azure-python-preview
- Microsoft Learn: FaceClient class for Python - https://learn.microsoft.com/en-us/python/api/azure-ai-vision-face/azure.ai.vision.face.faceclient?view=azure-python-preview
- Microsoft Learn: Face detection, attributes, and input data - https://learn.microsoft.com/en-us/azure/ai-services/face/concept-face-detection
- Microsoft Learn: Call the Detect API - https://learn.microsoft.com/en-us/azure/ai-services/face/how-to/identity-detect-faces
- Microsoft Learn: Face Detection Operations - Detect REST API - https://learn.microsoft.com/en-us/rest/api/face/face-detection-operations/detect?view=rest-face-v1.2
- Microsoft Learn: FaceAttributeTypeDetection03 enum - https://learn.microsoft.com/en-us/python/api/azure-ai-vision-face/azure.ai.vision.face.models.faceattributetypedetection03?view=azure-python-preview
- Microsoft Learn: Azure Face service quotas and limits - https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/identity-quotas-limits/

## Issues Found
- The post used the older `azure-cognitiveservices-vision-face` SDK and `FaceClient.face.detect_with_url` / `detect_with_stream` calls. Updated the install command and examples to the current `azure-ai-vision-face` client, `AzureKeyCredential`, `detect_from_url`, and `detect`.
- The examples requested glasses, exposure, noise, occlusion, and accessories while using `detection_03`. Microsoft documents `detection_03` as supporting only a narrower attribute set. Updated the broad-attribute examples to use `detection_01` and kept `recognition_04` for `qualityForRecognition`.
- The examples requested `return_face_id=True`, which now requires limited access approval. Changed the tutorial examples to use `return_face_id=False` because they only need rectangles, landmarks, and attributes.
- The REST example used `/face/v1.0/detect` and `detection_03` with unsupported attributes. Updated it to `/face/v1.2/detect`, normalized endpoint joining, set `returnFaceId=false`, and used `detection_01` for the broad attribute set.
- The responsible-use note said face detection and basic attribute analysis are still generally available. Updated it to reflect Microsoft's current limited-access language, retired emotion/gender capabilities, and limited sensitive attributes.
- The metadata description mentioned age, which is a limited capability and not used in the examples. Replaced it with supported attributes covered by the post.
- The retry example checked for `"429"` in a generic exception string. Updated it to catch `HttpResponseError` and inspect `status_code`.
- The detection model comparison overstated `detection_03` as the best default for all new projects. Updated the guidance to distinguish newer detection accuracy from attribute availability.

## Review Notes
The code examples are documentation-style snippets and were reviewed for API shape, parameter names, model compatibility, and syntax. They still require an approved Azure Face resource, valid endpoint/key, and accessible image inputs to run.
