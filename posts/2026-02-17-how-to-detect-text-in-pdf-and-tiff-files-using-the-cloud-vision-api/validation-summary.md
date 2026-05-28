# Validation Summary: How to Detect Text in PDF and TIFF Files Using the Cloud Vision API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Vision API
- Cloud Vision async PDF/TIFF OCR
- Google Cloud Storage
- Google Cloud CLI / gsutil
- Python
- google-cloud-vision Python client
- google-cloud-storage Python client

## Sources Consulted
- Google Cloud Vision API: Detect text in files (PDF/TIFF): https://docs.cloud.google.com/vision/docs/pdf
- Google Cloud Vision API quotas and limits: https://docs.cloud.google.com/vision/quotas
- Google Cloud Vision REST reference for files.asyncBatchAnnotate and OutputConfig: https://docs.cloud.google.com/vision/docs/reference/rest/v1/files/asyncBatchAnnotate
- Google Cloud Vision Python client reference for OutputConfig: https://docs.cloud.google.com/python/docs/reference/vision/latest/google.cloud.vision_v1.types.OutputConfig

## Issues Found
- The post said synchronous processing of PDFs would mean long request times and potential timeouts. Updated this to the more precise current behavior: synchronous file annotation is for small batches, while large PDF/TIFF processing should use the async API.
- The prerequisites omitted Application Default Credentials, which the Python client library requires for local execution. Added `gcloud auth application-default login`.
- The output-reading example sorted JSON files lexicographically by object name. This can produce incorrect page order for files such as `output-101-to-105.json`. Updated the code to sort by the numeric starting page in the output filename.
- The batch-processing example claimed a maximum of 5 documents per batch call. Current official limits document pages per `files:asyncBatchAnnotate` request and request size constraints, but does not state that 5-file limit for async file annotation. Reworded the comment to refer generally to Vision API limits.

## Review Notes
The main async PDF/TIFF OCR flow is consistent with current Google Cloud documentation: supported MIME types are `application/pdf` and `image/tiff`, the async API writes JSON output to Cloud Storage, `DOCUMENT_TEXT_DETECTION` is valid, and PDF/TIFF files are limited to 2,000 pages per async file annotation request. The `batch_size` examples are within the documented 1-100 range.
