# Validation Summary: How to Use Step Functions Distributed Map for Large-Scale Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Step Functions
- Step Functions Distributed Map and Inline Map
- Amazon S3 ItemReader and ResultWriter
- AWS Lambda
- AWS IAM
- AWS CLI
- Python with boto3 and Pillow
- Amazon SNS service integration

## Sources Consulted
- AWS Step Functions Developer Guide: Map workflow state - https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-map-state.html
- AWS Step Functions Developer Guide: Using Map state in Distributed mode - https://docs.aws.amazon.com/step-functions/latest/dg/state-map-distributed.html
- AWS Step Functions Developer Guide: ItemReader (Map) - https://docs.aws.amazon.com/step-functions/latest/dg/input-output-itemreader.html
- AWS Step Functions Developer Guide: ItemBatcher (Map) - https://docs.aws.amazon.com/step-functions/latest/dg/input-output-itembatcher.html
- AWS Step Functions Developer Guide: ResultWriter (Map) - https://docs.aws.amazon.com/step-functions/latest/dg/input-output-resultwriter.html
- AWS Step Functions service quotas - https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- AWS CLI Command Reference: describe-map-run - https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/describe-map-run.html
- AWS Step Functions pricing - https://aws.amazon.com/step-functions/pricing/

## Issues Found
- The post described Distributed Map datasets as "virtually unlimited" and listed Inline Map as having a "~40,000" item maximum. Updated this to reflect the documented Step Functions limits: Inline Map is constrained by the 256 KiB payload and 25,000-event history limits, while Distributed Map supports large S3 datasets and up to 10,000 parallel child executions.
- The comparison table said Distributed Map input comes from "S3 objects directly" and results are always written to S3. Updated this to say Distributed Map can use JSON input or S3 data sources, and that results can be returned or exported to S3.
- The setup example said it processed "all CSV files in an S3 bucket" but the state machine reads one specific CSV object. Changed the wording to "a large CSV file in an S3 bucket."
- The ResultWriter description said each child execution writes its own result file. AWS documentation says Step Functions consolidates child execution results by status and writes files such as `SUCCEEDED_0.json`, `FAILED_0.json`, plus a `manifest.json`. Updated the explanation.
- The S3 object-list thumbnail Lambda expected each item to contain `Bucket`, but the documented `s3:listObjectsV2` item input contains object metadata such as `Key`, not the bucket name. Updated the Lambda example to use the bucket configured in the state machine.
- The IAM policy snippet was marked as JSON but included a JavaScript-style comment, which made it invalid JSON. Removed the comment.
- The cost section described Distributed Map pricing only as state transitions in parent and child executions. Updated it to mention the documented per-iteration Distributed Map transition and Express child workflow request/duration billing.

## Review Notes
The examples remain illustrative and use placeholder ARNs, bucket names, and Lambda function names. In production, IAM permissions should be scoped to the specific state machine, execution ARNs, buckets, prefixes, and Lambda functions used by the workflow.
