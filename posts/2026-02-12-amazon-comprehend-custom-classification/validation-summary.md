# Validation Summary: How to Use Amazon Comprehend Custom Classification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Comprehend Custom Classification
- AWS SDK for Python (Boto3)
- Amazon S3
- Python
- CSV training data

## Sources Consulted
- Amazon Comprehend Developer Guide: Custom classification - https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html
- Amazon Comprehend Developer Guide: Preparing classifier training data - https://docs.aws.amazon.com/comprehend/latest/dg/prep-classifier-data.html
- Amazon Comprehend Developer Guide: Multi-label mode - https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification-training-multi-label.html
- Amazon Comprehend Developer Guide: Guidelines and quotas - https://docs.aws.amazon.com/comprehend/latest/dg/guidelines-and-limits.html
- Amazon Comprehend API Reference: ClassifyDocument - https://docs.aws.amazon.com/comprehend/latest/APIReference/API_ClassifyDocument.html
- Boto3 Comprehend client: create_document_classifier - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/comprehend/client/create_document_classifier.html
- Boto3 Comprehend client: create_endpoint - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/comprehend/client/create_endpoint.html
- AWS CLI Command Reference: start-document-classification-job - https://docs.aws.amazon.com/cli/latest/reference/comprehend/start-document-classification-job.html

## Issues Found
- The post stated that users need at least 50 labeled examples per category for all custom classification training. AWS quotas distinguish CSV modes: multi-class requires 50 training documents per class, while multi-label requires 10 training documents per class and 50 training documents total. Updated the guidance and validation script accordingly.
- The post implied that training directly gives you an endpoint. Amazon Comprehend trains a classifier model first; users create an endpoint from the trained model for real-time inference. Updated the wording.
- The post said there were optional hyperparameters to tune, but the documented `CreateDocumentClassifier` API does not expose custom model hyperparameters. Removed that implication.
- The inference examples assumed `classify_document` always returns `Classes`. AWS returns `Classes` for multi-class models and `Labels` for multi-label models. Updated the examples to handle both response fields.
- The standalone `TicketRouter` code block used `boto3` without importing it. Added the missing import.
- The training-data validator did not handle empty labels inside a multi-label list and used the wrong minimum label count for multi-label data. Updated the validator.

## Review Notes
The code snippets are syntactically valid Python. The examples still use placeholder S3 bucket names and IAM role ARNs, which readers must replace with real AWS resources in the same Region and with the required Comprehend data access permissions.
