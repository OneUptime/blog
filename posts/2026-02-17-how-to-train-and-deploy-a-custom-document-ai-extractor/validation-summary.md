# Validation Summary: How to Train and Deploy a Custom Document AI Extractor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Document AI
- Document AI Workbench custom extractors
- Document AI Python client library
- Python
- Processor version training, evaluation, deployment, and processing

## Sources Consulted
- Google Cloud Document AI custom-based extraction: https://cloud.google.com/document-ai/docs/custom-based-extraction
- Google Cloud Document AI train and evaluate overview: https://docs.cloud.google.com/document-ai/docs/training-overview
- Google Cloud Document AI evaluate performance: https://docs.cloud.google.com/document-ai/docs/evaluate
- Google Cloud Document AI train processor version sample: https://cloud.google.com/document-ai/docs/samples/documentai-train-processor-version
- Google Cloud Document AI list evaluations sample: https://docs.cloud.google.com/document-ai/docs/samples/documentai-list-evaluations
- Google Cloud Document AI manage processor versions: https://docs.cloud.google.com/document-ai/docs/manage-processor-versions
- Document AI Python `TrainProcessorVersionRequest` reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.TrainProcessorVersionRequest
- Document AI Python `DocumentServiceClient` / `ListDocumentsRequest` reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1beta3.services.document_service.DocumentServiceClient
- Document AI RPC reference for `Evaluation`, `ConfidenceLevelMetrics`, `Metrics`, and `MultiConfidenceMetrics`: https://docs.cloud.google.com/document-ai/docs/reference/rpc/google.cloud.documentai.v1
- Document AI Python `ProcessRequest` reference: https://docs.cloud.google.com/python/docs/reference/documentai/latest/google.cloud.documentai_v1.types.ProcessRequest

## Issues Found
- The post said the test split needed at least 5 labeled documents. Google Cloud's custom model guide says custom model training needs a minimum of 10 documents in the training set and 10 in the testing set. Updated the requirement and readiness check to use 10 test documents.
- The dataset readiness code used `documentai_v1.DocumentProcessorServiceClient` and `documentai_v1.ListDocumentsRequest`, but dataset document listing is exposed through the v1beta3 `DocumentServiceClient` / `ListDocumentsRequest`. Updated the imports, client, request, enum references, and pager iteration.
- The evaluation code attempted to read `f1_score`, `precision`, and `recall` directly from `MultiConfidenceMetrics`. Those fields live on `Evaluation.Metrics` inside each `ConfidenceLevelMetrics` entry. Updated the example to select the confidence-threshold entry with the highest F1 score and print its metrics.
- Several Python examples accepted a `location` parameter but created clients without a regional endpoint. Official samples configure `ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")`; updated the examples accordingly.
- The processor-version listing snippet omitted its `documentai_v1` import. Added the missing import.

## Review Notes
The post is technically relevant and the corrected examples align with current official Google Cloud Document AI documentation. The snippets still assume Application Default Credentials and valid project, processor, version, and file inputs, which is normal for concise blog examples.
