# Validation Summary: How to Use Lambda for Data Transformation in ETL Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon S3 event notifications
- Amazon Kinesis Data Streams
- Amazon Data Firehose
- AWS Step Functions
- AWS CloudFormation
- Python 3.12, Boto3, pandas, PyArrow
- Node.js, AWS SDK for JavaScript v3

## Sources Consulted
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS Lambda CreateEventSourceMapping API documentation: https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html
- AWS Lambda S3 trigger tutorial: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
- AWS CloudFormation AWS::Lambda::Function reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS CloudFormation Lambda EphemeralStorage reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-function-ephemeralstorage.html
- AWS SDK for JavaScript v3 S3 GetObjectCommand documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/
- Amazon Data Firehose PutRecordBatch API documentation: https://docs.aws.amazon.com/firehose/latest/APIReference/API_PutRecordBatch.html
- pandas DataFrame.to_parquet documentation: https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.to_parquet.html

## Issues Found
- The JSON log normalization example imported gzip stream helpers and used `.gz` example input, but the code read the S3 object with `transformToString()` and never decompressed gzip content. Changed the example to read bytes with `transformToByteArray()` and use `gunzipSync()` when the key ends with `.gz`.
- The Firehose example sent `PutRecordBatchCommand` requests without checking `FailedPutCount`. The Firehose API can report per-record failures even when the API call succeeds, so the example now checks `FailedPutCount` and throws when records fail.
- The Lambda CloudFormation snippet described `MemorySize: 3008` as "Max out for heavy data processing." That is inaccurate for current Lambda memory limits and was not the maximum. Changed the comment to "Increase for heavier data processing."

## Review Notes
- The examples assume required third-party dependencies such as pandas and PyArrow are packaged with the Lambda deployment or supplied by a compatible layer/container image.
- The local JavaScript snippets passed `node --check`, and the Python snippet passed `python3 -m py_compile`.
