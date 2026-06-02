# Validation Summary: How to Set Up Amazon Fraud Detector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Fraud Detector
- AWS CLI
- Boto3 for Python
- Amazon S3
- Amazon CloudWatch
- Machine learning model training and fraud prediction rules

## Sources Consulted
- Amazon Fraud Detector User Guide: Monitoring with CloudWatch: https://docs.aws.amazon.com/frauddetector/latest/ug/monitoring-cloudwatch.html
- Amazon Fraud Detector User Guide: Event dataset requirements: https://docs.aws.amazon.com/frauddetector/latest/ug/create-event-dataset.html
- Amazon Fraud Detector User Guide: Online Fraud Insights: https://docs.aws.amazon.com/frauddetector/latest/ug/online-fraud-insights.html
- Amazon Fraud Detector User Guide: Labels: https://docs.aws.amazon.com/frauddetector/latest/ug/labels.html
- AWS CLI Command Reference: create-variable: https://docs.aws.amazon.com/cli/latest/reference/frauddetector/create-variable.html
- AWS CLI Command Reference: put-event-type: https://docs.aws.amazon.com/cli/latest/reference/frauddetector/put-event-type.html
- AWS CLI Command Reference: create-model-version: https://docs.aws.amazon.com/cli/latest/reference/frauddetector/create-model-version.html
- AWS CLI Command Reference: create-detector-version: https://docs.aws.amazon.com/cli/latest/reference/frauddetector/create-detector-version.html
- AWS CLI Command Reference: send-event: https://docs.aws.amazon.com/cli/latest/reference/frauddetector/send-event.html
- Boto3 FraudDetector get_event_prediction reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/frauddetector/client/get_event_prediction.html

## Issues Found
- Added the current AWS service availability caveat: Amazon Fraud Detector is no longer open to new customers as of November 7, 2025. This keeps the setup guide accurate for readers starting new projects.
- Fixed the `put-event-type` CLI example. The AWS CLI expects event variables, entity types, and labels as lists of strings, not objects with `name` fields.
- Removed undeclared event variables from the event type example so it matches the variables used by the training data and prediction code.
- Enabled event ingestion on the event type because later examples use event storage and feedback APIs.
- Updated variable types for `card_bin` and `user_agent` to `CARD_BIN` and `USERAGENT`, matching Amazon Fraud Detector's supported semantic variable types.
- Corrected the training data guidance from a hard requirement of 10,000 records and 500 fraud examples to AWS's current required and recommended thresholds.
- Fixed the Python prediction example so it returns the locally generated `event_id`; the `get_event_prediction` response does not include `eventId`.
- Fixed the feedback example so it creates a Fraud Detector client and sends non-empty `eventVariables`, which are required by the `SendEvent` API.
- Added missing imports to the monitoring example and corrected the CloudWatch metric names and dimension key to match Amazon Fraud Detector's documented metrics.
- Corrected the large-transaction rule comment to match its `review` outcome.

## Review Notes
AWS CLI was not installed in the workspace, so CLI command validation was performed against the current official AWS CLI command reference rather than local `aws --help` output.
