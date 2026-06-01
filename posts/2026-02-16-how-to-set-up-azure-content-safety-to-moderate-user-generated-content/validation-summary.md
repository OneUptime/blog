# Validation Summary: How to Set Up Azure Content Safety to Moderate User-Generated Content

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure AI Content Safety
- Azure AI Content Safety Python SDK (`azure-ai-contentsafety`)
- Python
- Flask
- Azure Portal
- Text moderation
- Image moderation
- Text blocklists

## Sources Consulted
- Microsoft Learn: Azure AI Content Safety client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/ai-contentsafety-readme?view=azure-python
- Microsoft Learn: ContentSafetyClient class - https://learn.microsoft.com/en-us/python/api/azure-ai-contentsafety/azure.ai.contentsafety.contentsafetyclient?view=azure-python
- Microsoft Learn: BlocklistClient class - https://learn.microsoft.com/en-us/python/api/azure-ai-contentsafety/azure.ai.contentsafety.blocklistclient?view=azure-python
- Microsoft Learn: AnalyzeTextOptions class - https://learn.microsoft.com/en-us/python/api/azure-ai-contentsafety/azure.ai.contentsafety.models.analyzetextoptions?view=azure-python
- Microsoft Learn: ImageData class - https://learn.microsoft.com/en-us/python/api/azure-ai-contentsafety/azure.ai.contentsafety.models.imagedata?view=azure-python
- Microsoft Learn: Azure AI Content Safety overview, regions, pricing tiers, and rate limits - https://learn.microsoft.com/en-us/azure/ai-services/content-safety/overview
- Microsoft Learn: Azure AI Content Safety harm categories and severity levels - https://learn.microsoft.com/en-us/azure/ai-services/content-safety/concepts/harm-categories

## Issues Found
- The severity scale was described as continuous `0` through `6` with ranges such as `0-1`, `2-3`, and `4-5`. The current SDK defaults to four severity output values: `0`, `2`, `4`, and `6`. Updated the description to match the default four-level output used by the code.
- The self-harm flag threshold used `1`, but the default four-level output does not return `1`. Updated the example threshold to `2` and adjusted the comment to match the default severity output.
- The image moderation example manually base64-encoded the image and passed a string to `ImageData(content=...)`. The official Python SDK sample passes image bytes to `ImageData(content=...)`. Updated the example to pass `image_bytes` directly and removed the unnecessary `base64` import.
- The blocklist management example called blocklist management methods on `ContentSafetyClient`. The current stable SDK uses `BlocklistClient` for text blocklist management. Updated the example to import and instantiate `BlocklistClient`, then use it for blocklist create/update and item operations.

## Review Notes
The Flask endpoint snippet references application-specific helper functions such as `save_comment`, which is acceptable for an integration example but would need implementation in a real app. The Python code blocks were syntax-checked with `ast.parse` after edits.
