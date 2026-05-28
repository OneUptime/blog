# Validation Summary: How to Migrate AWS DynamoDB Tables to Google Cloud Firestore with Dataflow

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- AWS DynamoDB
- Amazon S3
- Google Cloud Storage Transfer Service
- Google Cloud Dataflow
- Apache Beam Python SDK
- Google Cloud Firestore
- Python
- AWS CLI
- Google Cloud CLI

## Sources Consulted
- AWS CLI `dynamodb export-table-to-point-in-time`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/export-table-to-point-in-time.html
- DynamoDB export to S3 overview and PITR requirement: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.HowItWorks.html
- DynamoDB table export output format: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.Output.html
- Google Cloud `gcloud transfer jobs create`: https://docs.cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Google Cloud Dataflow pipeline options: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Apache Beam Python `PipelineOptions`: https://beam.apache.org/releases/pydoc/current/apache_beam.options.pipeline_options.html
- Firestore aggregation queries for Python: https://firebase.google.com/docs/firestore/query-data/aggregation-queries
- Firestore Python aggregation API reference: https://cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.aggregation
- Firestore index definition reference: https://firebase.google.com/docs/reference/firestore/indexes
- Google Cloud `gcloud firestore indexes composite create`: https://cloud.google.com/sdk/gcloud/reference/firestore/indexes/composite/create
- Boto3 DynamoDB `Table.item_count`: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/item_count.html

## Issues Found
- The Dataflow file glob skipped DynamoDB's exported `AWSDynamoDB/<ExportId>/data/` directory. Updated the `ReadFromText` path to include that export structure.
- The Python sample imported `WriteToFirestore` from `apache_beam.io.gcp.firestore`, but the post writes through a custom `DoFn` and does not use that transform. Removed the unused import.
- DynamoDB binary attributes in `B` and `BS` are base64-encoded in DynamoDB JSON. Updated the parser to decode them to Python `bytes` before writing to Firestore.
- The Firestore batch comment described a fixed 500-operation batch limit. Updated the comment to describe the 400-write batch size as a conservative configured size.
- The Firestore count verification used a shortcut API form that is not the documented Python aggregation example. Updated it to use `google.cloud.firestore_v1.aggregation.AggregationQuery`.
- The DynamoDB verification code treated `Table.item_count` like an exact live count. Added a code comment noting that DynamoDB updates this metadata approximately every six hours.
- The data-model mapping overstated a direct Global Secondary Index to composite-index equivalence. Updated it to mention composite indexes or denormalized query patterns.
- The wrap-up implied the same pipeline could be rerun for incremental syncs without caveats. Updated it to say the shown pipeline can rerun against newer full exports and that DynamoDB incremental exports require additional handling for their different record shape.

## Review Notes
The migration approach is technically plausible as an illustrative pipeline, but production migrations should also handle idempotency, retry behavior, dead-letter logging, Firestore write throughput ramp-up, document size limits, reserved/path-unsafe key values in document IDs, and a more exact source-side verification strategy when exact counts are required.
