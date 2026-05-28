# Validation Summary: How to Extract Key-Value Pairs from Forms Using Document AI Form Parser

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Document AI
- Document AI Form Parser
- Python
- Google Cloud Storage
- Google Cloud client libraries for Python

## Sources Consulted
- Google Cloud Document AI Form Parser documentation: https://cloud.google.com/document-ai/docs/form-parser
- Google Cloud Document AI create processor sample: https://cloud.google.com/document-ai/docs/samples/documentai-create-processor
- Google Cloud Document AI online processing request sample: https://cloud.google.com/document-ai/docs/samples/documentai-process-document
- Google Cloud Document AI handle processing response documentation: https://cloud.google.com/document-ai/docs/handle-response
- Google Cloud Document AI Python `ProcessRequest` reference: https://cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.ProcessRequest
- Google Cloud Document AI Python `Document.Page.FormField` reference: https://cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Document.Page.FormField
- Google Cloud Document AI Python `Document.Page.Table.TableCell` reference: https://cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.Document.Page.Table.TableCell

## Issues Found
- The processor creation and processing examples created `DocumentProcessorServiceClient` without configuring the regional API endpoint. Google Cloud's Python samples specify `ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")`, especially when using a location other than `us`. Updated the examples to configure `ClientOptions`, use `client.common_location_path`, and use `client.processor_path`.
- The checkbox extraction example checked `field.field_value.value_type`, but the Python `FormField` type exposes checkbox state on `field.value_type`. Updated the code and comments to use `field.value_type` with `filled_checkbox` and `unfilled_checkbox`.
- The complete pipeline initialized `tables` and `checkboxes` in the structured output but never populated them. Updated the example to call the previously defined `extract_tables(document)` and `extract_checkboxes(document)` helpers.

## Review Notes
The snippets were checked for Python syntax after edits. Runtime execution against Google Cloud was not performed because it requires a configured Google Cloud project, credentials, processor, and sample documents.
