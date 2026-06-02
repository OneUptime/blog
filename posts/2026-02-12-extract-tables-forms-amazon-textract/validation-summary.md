# Validation Summary: How to Extract Tables and Forms with Amazon Textract

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Textract
- AWS SDK for Python (Boto3)
- Python
- CSV
- pandas
- Mermaid

## Sources Consulted
- Amazon Textract API Reference: AnalyzeDocument - https://docs.aws.amazon.com/textract/latest/APIReference/API_AnalyzeDocument.html
- Amazon Textract API Reference: GetDocumentAnalysis - https://docs.aws.amazon.com/textract/latest/APIReference/API_GetDocumentAnalysis.html
- Amazon Textract API Reference: Block - https://docs.aws.amazon.com/textract/latest/APIReference/API_Block.html
- Amazon Textract API Reference: Relationship - https://docs.aws.amazon.com/textract/latest/dg/API_Relationship.html
- Amazon Textract Developer Guide: Tables - https://docs.aws.amazon.com/textract/latest/dg/how-it-works-tables.html
- Amazon Textract Developer Guide: Form Data (Key-Value Pairs) - https://docs.aws.amazon.com/textract/latest/dg/how-it-works-kvp.html
- Amazon Textract Developer Guide: Processing Documents Synchronously - https://docs.aws.amazon.com/textract/latest/dg/sync.html
- Boto3 Textract Client Documentation: analyze_document - https://docs.aws.amazon.com/boto3/latest/reference/services/textract/client/analyze_document.html
- Botocore Textract Client Documentation: start_document_analysis - https://docs.aws.amazon.com/botocore/latest/reference/services/textract/client/start_document_analysis.html

## Issues Found
- The table extractor claimed to handle merged cells by reading `RowSpan` and `ColumnSpan` from regular `CELL` blocks. AWS documentation states that regular `CELL` blocks always have row span and column span of 1, while merged regions are represented by separate `MERGED_CELL` blocks referenced by the `TABLE` block. Updated the explanation and code to traverse `MERGED_CELL` relationships and copy merged-cell text into the covered cells.
- The synchronous `AnalyzeDocument` examples were described as extracting from a document without noting the single-page limitation of synchronous Textract processing. Updated the relevant docstrings to say "single-page document."
- The async polling loop handled `SUCCEEDED` and `FAILED` but not `PARTIAL_SUCCESS`, which is a valid terminal `JobStatus` for `GetDocumentAnalysis`. Updated the loop to break on `SUCCEEDED` or `PARTIAL_SUCCESS`.

## Review Notes
The Python code snippets were checked for syntax after edits. The examples use current Textract feature type values (`TABLES` and `FORMS`) and current Boto3 method names. In production, the async polling example should also inspect `Warnings` and `StatusMessage` when a job returns `PARTIAL_SUCCESS`.
