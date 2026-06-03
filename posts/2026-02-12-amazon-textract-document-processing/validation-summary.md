# Validation Summary: How to Use Amazon Textract for Document Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Textract
- AWS SDK for Python (Boto3)
- Amazon S3 document input
- Python
- OCR and document processing

## Sources Consulted
- Amazon Textract DetectDocumentText Boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/detect_document_text.html
- Amazon Textract AnalyzeDocument Boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/analyze_document.html
- Amazon Textract AnalyzeExpense Boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/analyze_expense.html
- Amazon Textract AnalyzeID Boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/analyze_id.html
- Amazon Textract StartDocumentAnalysis API reference: https://docs.aws.amazon.com/textract/latest/APIReference/API_StartDocumentAnalysis.html
- Amazon Textract GetDocumentAnalysis Boto3 documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/get_document_analysis.html
- Amazon Textract synchronous processing documentation: https://docs.aws.amazon.com/textract/latest/dg/sync.html
- Amazon Textract Block API reference: https://docs.aws.amazon.com/textract/latest/APIReference/API_Block.html

## Issues Found
- The async polling example did not handle the `PARTIAL_SUCCESS` terminal status returned by `GetDocumentAnalysis`. This could cause the sample to keep polling indefinitely for jobs that completed with partial success. I updated `get_async_results` to print the partial-success status message and continue retrieving available blocks.

## Review Notes
- The Python snippets are syntactically valid under Python 3.12.
- `boto3` is not installed in the local environment, so live SDK execution was not performed. API names, request fields, response fields, feature type values, block types, pagination, and job statuses were checked against current AWS Boto3 and Amazon Textract documentation.
- The table and form parsing examples intentionally cover common text-only cases. Production parsers may also need to account for `SELECTION_ELEMENT`, merged cells, table titles, table footers, layout blocks, and query results depending on enabled Textract features.
