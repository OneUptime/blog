# Validation Summary: How to Build a Machine Learning Feature Store on AWS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon SageMaker Feature Store
- SageMaker Python SDK
- AWS SDK for JavaScript v3
- AWS Lambda
- Amazon SageMaker Runtime
- Amazon S3 and Parquet offline store
- Amazon Athena
- AWS Glue Data Catalog
- pandas

## Sources Consulted
- Amazon SageMaker Feature Store concepts: https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-concepts.html
- Use Feature Store with SDK for Python: https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-create-feature-group.html
- SageMaker Python SDK Feature Store APIs: https://sagemaker.readthedocs.io/en/v2/api/prep_data/feature_store.html
- Amazon SageMaker Feature Store PutRecord API: https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_feature_store_PutRecord.html
- AWS SDK for JavaScript v3 PutRecordCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/sagemaker-featurestore-runtime-2020-07-01/PutRecord
- AWS SDK for JavaScript v3 InvokeEndpointCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/runtime.sagemaker-2017-05-13/InvokeEndpoint
- Amazon SageMaker Feature Store offline store data format: https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-offline.html
- Amazon SageMaker Feature Store TTL documentation: https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-time-to-live.html

## Issues Found
- The SageMaker Python SDK examples used `load_feature_definitions(data_frame=None, feature_definitions=[...])`, but the SDK method infers definitions from a DataFrame and does not accept a manual `feature_definitions` argument. I changed the examples to pass `FeatureDefinition` objects to the `FeatureGroup` constructor.
- The IAM role ARN examples used a 9-digit account ID. I changed them to a 12-digit placeholder account ID.
- The diagram labeled the SageMaker Feature Store online store as DynamoDB. I changed it to "SageMaker Online Store" because the post uses SageMaker's managed online store APIs rather than direct DynamoDB tables.
- The real-time Lambda wrote to `user-realtime-features`, but the post never created that feature group. I added the matching online-only feature group definition.
- The batch feature pipeline declared `favorite_category` and `device_type` in the feature group schema but did not compute them. I added simple mode-based aggregations and kept missing string values as `unknown`.
- The batch feature pipeline used a broad `fillna(0)`, which could produce invalid values for string features and float-typed values for integral features. I changed it to fill numeric and string features separately and cast integral features to `int64`.
- The ingest example called `sagemaker.Session()` without importing `sagemaker`. I added the missing import.
- The ingest example claimed a maximum of 500 records per batch for `FeatureGroup.ingest`, but that limit is not part of the SDK method signature. I removed the misleading comment.
- The JavaScript inference example passed a string directly as the SageMaker Runtime request body. I changed it to `Buffer.from(...)`, matching the SDK v3 blob payload shape.
- The Athena point-in-time join used outer query aliases inside derived table `WHERE` clauses. I replaced it with a valid join-and-rank pattern using `ROW_NUMBER()` after joining candidate feature rows to each training label.

## Review Notes
The post is now technically consistent with the current documented SageMaker Feature Store and AWS SDK v3 APIs. In a production implementation, the Athena table names should usually come from `feature_group.athena_query().table_name` or an explicit `DataCatalogConfig`, because automatically generated Glue table names can vary by configuration.
