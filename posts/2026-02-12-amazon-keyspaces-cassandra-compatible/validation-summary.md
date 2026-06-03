# Validation Summary: How to Set Up Amazon Keyspaces (Cassandra-Compatible)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Keyspaces for Apache Cassandra
- Apache Cassandra CQL
- AWS CLI
- IAM service-specific credentials
- SigV4 authentication
- Python Cassandra driver
- Java DataStax Cassandra driver
- Amazon CloudWatch

## Sources Consulted
- Amazon Keyspaces supported Cassandra APIs, operations, functions, and data types: https://docs.aws.amazon.com/keyspaces/latest/devguide/cassandra-apis.html
- Amazon Keyspaces consistency levels: https://docs.aws.amazon.com/keyspaces/latest/devguide/consistency.html
- Amazon Keyspaces lightweight transactions: https://docs.aws.amazon.com/keyspaces/latest/devguide/lightweight_transactions.html
- Amazon Keyspaces batch statements: https://docs.aws.amazon.com/keyspaces/latest/devguide/batchStatements.html
- AWS CLI `keyspaces create-table` command reference: https://docs.aws.amazon.com/cli/latest/reference/keyspaces/create-table.html
- Amazon Keyspaces Python driver connection guide: https://docs.aws.amazon.com/keyspaces/latest/devguide/using_python_driver.html
- Amazon Keyspaces Java driver connection guide: https://docs.aws.amazon.com/keyspaces/latest/devguide/using_java_driver.html
- Amazon Keyspaces service endpoints: https://docs.aws.amazon.com/keyspaces/latest/devguide/programmatic.endpoints.html
- Amazon Keyspaces PITR documentation: https://docs.aws.amazon.com/keyspaces/latest/devguide/PointInTimeRecovery.html
- Amazon Keyspaces CloudWatch metrics and dimensions: https://docs.aws.amazon.com/keyspaces/latest/devguide/metrics-dimensions.html
- Amazon Keyspaces partition key design best practices: https://docs.aws.amazon.com/keyspaces/latest/devguide/bp-partition-key-design.html

## Issues Found
- The unsupported-features list incorrectly said lightweight transactions and UDTs are unsupported. Current Amazon Keyspaces documentation lists LWTs and UDTs as supported, with `ALTER TYPE` unsupported, so the list was corrected.
- The post said secondary indexes are unsupported but custom indexes are supported. Current AWS documentation lists `CREATE INDEX` as unsupported, so the text now says secondary indexes, including custom indexes, are unsupported.
- The post said BATCH statements across multiple tables are unsupported. Current AWS documentation says logged batches can write to multiple Amazon Keyspaces tables in the same AWS account and Region, so that item was removed.
- The consistency-level summary omitted read consistency `ONE`. Current AWS documentation supports `ONE`, `LOCAL_ONE`, and `LOCAL_QUORUM` for reads, so the wording was corrected.
- The TLS setup described the Starfield certificate as required. Current AWS documentation requires Amazon Root CA certificates and lists Starfield as optional for backward compatibility, so the certificate download and Python sample were updated to use an Amazon root CA bundle.
- The Python TLS sample used `SSLContext(PROTOCOL_TLSv1_2)`, which is deprecated in modern Python. It was replaced with `create_default_context(cafile=...)`.
- The provisioned table AWS CLI schema used `order` for a clustering key. The current AWS CLI shape uses `orderBy`, so the field was corrected.
- The CloudWatch alarm used `ThrottledRequests`, which is not an Amazon Keyspaces metric in the current metrics documentation. It was changed to `WriteThrottleEvents`, with the required `Operation` dimension, and the metric list now includes `ReadThrottleEvents` and `WriteThrottleEvents`.
- The data modeling section recommended keeping partition sizes under 1 GB. Current Amazon Keyspaces documentation says logical partitions can span storage partitions and are virtually unbounded; performance guidance focuses on distributing traffic and per-partition throughput. The guidance was corrected accordingly.
- The wrap-up advised special caution for UDTs and LWTs as feature gaps. Since both are supported, the examples were changed to custom indexes, user-defined functions, and materialized views.

## Review Notes
The AWS CLI was not installed in the local workspace, so command verification was performed against the official AWS CLI command reference and Amazon Keyspaces Developer Guide. The Java sample is broadly aligned with AWS's DataStax driver SigV4 guidance, although production applications should ensure their runtime trust store contains the required Amazon Trust Services certificates.
