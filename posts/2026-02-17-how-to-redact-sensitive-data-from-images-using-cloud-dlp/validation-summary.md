# Validation Summary: How to Redact Sensitive Data from Images Using Cloud DLP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Sensitive Data Protection / Cloud DLP
- Cloud DLP `redactImage` API
- Python `google-cloud-dlp` client library
- Python `google-cloud-storage` client library
- Cloud Storage
- Cloud Functions / Functions Framework

## Sources Consulted
- Google Cloud Sensitive Data Protection: Redact sensitive data from images: https://docs.cloud.google.com/sensitive-data-protection/docs/redacting-sensitive-data-images
- Google Cloud Python DLP `RedactImageRequest` reference: https://docs.cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.RedactImageRequest
- Google Cloud Python DLP `ImageRedactionConfig` reference: https://docs.cloud.google.com/python/docs/reference/dlp/latest/google.cloud.dlp_v2.types.RedactImageRequest.ImageRedactionConfig
- Google Cloud Python DLP `RedactImageResponse` reference: https://cloud.google.com/python/docs/reference/dlp/3.18.0/google.cloud.dlp_v2.types.RedactImageResponse
- Google Cloud Sensitive Data Protection quotas and limits: https://cloud.google.com/sensitive-data-protection/limits

## Issues Found
- The post stated that SVG is a supported image redaction format and showed `IMAGE_SVG` in the Python comment. Google documents SVG as a `ByteContentItem` enum value, but the image redaction guide says content redaction is not supported for SVG. I changed the supported redaction formats to PNG, JPEG, and BMP and removed `IMAGE_SVG` from the comment.
- The first Python example printed `response.inspect_result.findings` without requesting findings. Google documents `inspect_result` as populated only when `include_findings` is true. I added `"include_findings": True` to that request.
- The Cloud Functions example used an `image_redaction_configs` entry with only `{"redact_all_text": False}`. I changed it to explicit per-InfoType redaction configs matching the `inspect_config`, which aligns with the official examples and avoids relying on an ambiguous empty redaction target.
- The first Python example imported `base64` but did not use it. I removed the unused import.

## Review Notes
The Cloud DLP API and client library names are still valid, though the Google Cloud product documentation now presents the service as Sensitive Data Protection. The 4 MB `projects.image.redact` request limit is correct as of the reviewed documentation.
