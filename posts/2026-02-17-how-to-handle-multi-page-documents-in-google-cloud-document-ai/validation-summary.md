# Validation Summary: How to Handle Multi-Page Documents in Google Cloud Document AI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Document AI
- Document AI Python client library
- Cloud Storage batch output
- PDF processing with pypdf
- Python

## Sources Consulted
- Google Cloud Document AI limits: https://docs.cloud.google.com/document-ai/limits
- Google Cloud Document AI client library quickstart: https://docs.cloud.google.com/document-ai/docs/process-documents-client-libraries
- Google Cloud Document AI batch processing sample: https://docs.cloud.google.com/document-ai/docs/samples/documentai-batch-process-document
- Google Cloud DocumentOutputConfig REST reference: https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/DocumentOutputConfig
- Google Cloud Document AI PageRef Python reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Document.PageAnchor.PageRef
- PyPDF2 PyPI project page: https://pypi.org/project/PyPDF2/
- pypdf PdfWriter documentation: https://pypdf.readthedocs.io/en/stable/modules/PdfWriter.html

## Issues Found
- The post stated that synchronous Document AI requests are limited to 20MB. Current Google Cloud limits list online processing at 40MB, so the file-size limit was corrected.
- The post stated that batch processing supports up to 2,000 pages per document. Current Document AI limits are processor-specific and the documented examples are lower, such as 100 pages for Form Parser, 500 pages for Layout Parser or Enterprise Document OCR, and 1,000 pages for Custom Splitter. The limit description was updated.
- The post treated 15 pages as a universal synchronous limit. Current docs note that many processors support 15 pages online, and some support up to 30 pages with `imageless_mode`; some specialized processors have lower limits. The wording was adjusted to avoid overgeneralizing.
- The Python client examples created `DocumentProcessorServiceClient()` without a regional endpoint. Google's Python samples set `api_endpoint` based on the processor location, so the examples now use `ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")`.
- The PDF splitting example used `PyPDF2`. The PyPDF2 project states that 3.0.x is the last PyPDF2 line and development continues under `pypdf`, so the import was updated to `from pypdf import PdfReader, PdfWriter`.
- The batch output example commented that `field_mask` shards output. `field_mask` filters included fields, while sharding is configured with `sharding_config`. The comment was corrected.

## Review Notes
- The reviewed Python code blocks parse successfully with Python 3 syntax checking.
- The batch example keeps `field_mask="text,entities,pages.pageNumber"`, which matches Google's sample pattern and is valid for limiting returned output fields.
