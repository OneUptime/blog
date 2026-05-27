# Validation Summary: How to Use Document AI Layout Parser to Convert PDFs to Structured Text

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Document AI
- Document AI Layout Parser
- Python
- Google Cloud Python client library
- Google Cloud CLI
- Cloud Storage batch processing
- PDF processing

## Sources Consulted
- Google Cloud Document AI Layout Parser documentation: https://docs.cloud.google.com/document-ai/docs/layout-parse-chunk
- Google Cloud Document AI processor list: https://docs.cloud.google.com/document-ai/docs/processors-list
- Google Cloud Document AI limits: https://docs.cloud.google.com/document-ai/limits
- Google Cloud Document AI Python client reference, DocumentProcessorServiceClient: https://cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.services.document_processor_service.DocumentProcessorServiceClient
- Google Cloud Document AI Python client reference, DocumentLayoutBlock: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Document.DocumentLayout.DocumentLayoutBlock
- Google Cloud Document AI Python client reference, LayoutTextBlock: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Document.DocumentLayout.DocumentLayoutBlock.LayoutTextBlock
- Google Cloud Document AI Python client reference, LayoutTableBlock: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Document.DocumentLayout.DocumentLayoutBlock.LayoutTableBlock
- Google Cloud Document AI Python client reference, LayoutListBlock: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Document.DocumentLayout.DocumentLayoutBlock.LayoutListBlock
- Google Cloud Document AI batch processing sample: https://cloud.google.com/document-ai/docs/samples/documentai-batch-process-document

## Issues Found
- The extraction examples used generic `page.blocks`, `page.paragraphs`, and page table fields instead of Layout Parser's structured `document.document_layout.blocks` output. Updated the examples to walk `DocumentLayoutBlock` values and handle text, table, and list blocks.
- The Markdown conversion example inferred headings from bounding boxes and font heuristics, but Layout Parser exposes text block types such as `heading-1`, `heading-2`, `paragraph`, `header`, and `footer`. Updated the conversion logic to use those structured block types.
- The table conversion example used generic table cell layouts and `document.text` anchors. Updated it to use Layout Parser table rows, cells, and nested cell blocks.
- The multi-column example manually split paragraphs into left and right columns, which can work against Layout Parser's document-order output. Replaced it with an example that reads `document.document_layout.blocks` in returned order.
- The code examples did not configure the regional Document AI endpoint. Added `ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")` and client path helpers.
- The performance notes listed a 20MB synchronous file limit and claimed batch processing is more cost-effective. Updated the limit to the current 40MB online file-size limit, added the 500-page Layout Parser batch limit, and clarified that billing is per page.

## Review Notes
The Python snippets were checked with `ast.parse` for syntax. Runtime execution was not performed because it requires Google Cloud credentials, a configured Document AI processor, and Cloud Storage resources.
