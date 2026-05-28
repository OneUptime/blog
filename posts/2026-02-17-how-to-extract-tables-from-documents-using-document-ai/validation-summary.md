# Validation Summary: How to Extract Tables from Documents Using Document AI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Document AI
- Document AI Form Parser
- Document AI Layout Parser
- Python
- Pandas
- Cloud Functions
- Cloud Storage events
- BigQuery

## Sources Consulted
- Google Cloud Document AI Form Parser documentation: https://docs.cloud.google.com/document-ai/docs/form-parser
- Google Cloud Document AI processor creation documentation: https://docs.cloud.google.com/document-ai/docs/create-processor
- Google Cloud Document AI Form Parser Python sample: https://docs.cloud.google.com/document-ai/docs/samples/documentai-process-form-document
- Google Cloud Document AI processors.process REST reference: https://docs.cloud.google.com/document-ai/docs/reference/rest/v1/projects.locations.processors/process
- Google Cloud Document AI processor list: https://docs.cloud.google.com/document-ai/docs/processors-list
- Google Cloud Enterprise Document OCR documentation: https://cloud.google.com/document-ai/docs/enterprise-document-ocr

## Issues Found
- The post said any Document AI processor can detect tables and listed OCR as a common table-heavy choice. Google documents table extraction for Form Parser and Layout Parser, while Enterprise Document OCR focuses on OCR/layout elements and add-ons. Updated the wording to recommend processors that return table structure, specifically Form Parser and Layout Parser.
- The Document AI Python client examples accepted a location argument but did not configure the regional API endpoint. Google samples configure `ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")`. Added regional client options to the processor creation, document processing, and Cloud Function examples.
- The install command omitted `google-cloud-bigquery` and `functions-framework`, even though later code imports BigQuery and Functions Framework. Added those packages to the install command.
- The post implied merged-cell handling is generally available from the table extraction flow. Google documents Form Parser as best suited for simple tables, while the Document AI table cell schema includes span fields. Adjusted the wording to say span handling applies when the processor output includes spanning cells.

## Review Notes
All Python snippets were syntax-checked with `ast.parse`. Runtime execution was not performed because the examples require Google Cloud credentials, a configured Document AI processor, input documents, and BigQuery resources.
