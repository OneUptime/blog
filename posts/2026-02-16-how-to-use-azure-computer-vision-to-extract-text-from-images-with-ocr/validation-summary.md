# Validation Summary: How to Use Azure Computer Vision to Extract Text from Images with OCR

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Vision / Computer Vision
- Image Analysis Read OCR 4.0
- Azure AI Document Intelligence Read
- Python
- Azure SDK for Python
- Image Analysis REST API

## Sources Consulted
- Microsoft Learn: OCR - Optical Character Recognition, https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-ocr
- Microsoft Learn: What is Image Analysis?, https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-image-analysis
- Microsoft Learn: Azure Image Analysis client library for Python, https://learn.microsoft.com/en-us/python/api/overview/azure/ai-vision-imageanalysis-readme
- Microsoft Learn: ImageAnalysisClient class, https://learn.microsoft.com/en-us/python/api/azure-ai-vision-imageanalysis/azure.ai.vision.imageanalysis.imageanalysisclient
- Microsoft Learn: Analyze Image REST API 2024-02-01, https://learn.microsoft.com/en-us/rest/api/computervision/analyze/image?view=rest-computervision-v4.0+%282024-02-01%29
- Microsoft Learn: Analyze Image Stream REST API 2024-02-01, https://learn.microsoft.com/en-us/rest/api/computervision/analyze/image-stream?view=rest-computervision-v4.0+%282024-02-01%29
- Microsoft Learn: Azure AI Document Intelligence client library for Python, https://learn.microsoft.com/en-us/python/api/overview/azure/ai-documentintelligence-readme
- Microsoft Learn: Document Intelligence Read model, https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/read?view=doc-intel-4.0.0
- PyPI: azure-cognitiveservices-vision-computervision, https://pypi.org/project/azure-cognitiveservices-vision-computervision/
- Microsoft Azure pricing: Azure Vision in Foundry Tools, https://azure.microsoft.com/en-us/pricing/details/cognitive-services/computer-vision/

## Issues Found
- The post described the old Computer Vision Read SDK as the latest OCR 4.0 path. Replaced the deprecated `azure-cognitiveservices-vision-computervision` package with the current `azure-ai-vision-imageanalysis` package for image OCR.
- The original examples used asynchronous `read_in_stream`, `client.read`, `Operation-Location`, and `get_read_result` patterns from the previous Computer Vision Read API. Updated local-image, URL, and word-level examples to use `ImageAnalysisClient.analyze` and `analyze_from_url` with `VisualFeatures.READ`.
- The post said the image URL example supported PDFs. Corrected this to image formats supported by Image Analysis 4.0.
- The multi-page PDF example used the old Computer Vision SDK. Updated it to use Azure AI Document Intelligence `prebuilt-read`, which Microsoft recommends for text-heavy and multi-page documents.
- The REST Image Analysis URL used the wrong path for the 2024-02-01 image-stream API. Corrected it to `/imageanalysis:analyze` with `overload=stream`.
- The post used `bounding_box` field names for Image Analysis 4.0 results. Updated examples to use `bounding_polygon`, matching the current SDK and REST response shape.
- The post claimed OCR text should be at least 50 pixels tall. Corrected this to Microsoft's documented 12-pixel minimum for a 1024 x 768 image.
- The post included a fixed throughput and price estimate. Replaced these with service-limit and pricing guidance that points readers to current Azure pricing, since those values vary by resource, region, and current pricing.
- The post made broad language and region availability claims. Reworded them to align with Microsoft documentation and avoid unsupported absolute claims.

## Review Notes
Image Analysis 4.0 is documented as generally available for supported use cases, but Microsoft also notes the Image Analysis 4.0 service is deprecated and scheduled for retirement on September 25, 2028. Future updates should revisit the recommended OCR path before publication.
