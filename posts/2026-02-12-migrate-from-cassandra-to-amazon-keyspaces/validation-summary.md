# Validation Summary: How to Migrate from Cassandra to Amazon Keyspaces

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon Keyspaces for Apache Cassandra
- Apache Cassandra and CQL
- AWS CLI
- cqlsh and cqlsh-expansion
- AWS Glue
- Apache Spark Cassandra Connector
- Python Cassandra driver
- Amazon CloudWatch

## Sources Consulted
- Amazon Keyspaces supported Cassandra APIs, operations, functions, and data types: https://docs.aws.amazon.com/keyspaces/latest/devguide/cassandra-apis.html
- Amazon Keyspaces quotas: https://docs.aws.amazon.com/keyspaces/latest/devguide/quotas.html
- Amazon Keyspaces CQL elements and counter restrictions: https://docs.aws.amazon.com/keyspaces/latest/devguide/cql.elements.html
- Amazon Keyspaces user-defined types: https://docs.aws.amazon.com/keyspaces/latest/devguide/udts.html
- Amazon Keyspaces lightweight transactions capacity behavior: https://docs.aws.amazon.com/keyspaces/latest/devguide/lightweight_transactions.html
- Amazon Keyspaces cqlsh connection guidance: https://docs.aws.amazon.com/keyspaces/latest/devguide/programmatic.cqlsh.html
- Amazon Keyspaces Python driver guidance: https://docs.aws.amazon.com/keyspaces/latest/devguide/using_python_driver.html
- Amazon Keyspaces CREATE TABLE CQL reference: https://docs.aws.amazon.com/keyspaces/latest/devguide/cql.ddl.table.html
- Amazon Keyspaces TTL settings: https://docs.aws.amazon.com/keyspaces/latest/devguide/TTL-how-to-create-table.html
- Amazon Keyspaces offline migration with AWS Glue and Spark: https://docs.aws.amazon.com/keyspaces/latest/devguide/migrating-offline.html
- Amazon Keyspaces Spark Cassandra Connector configuration: https://docs.aws.amazon.com/keyspaces/latest/devguide/spark-tutorial-step3.html
- Spark Cassandra Connector properties: https://docs.datastax.com/en/dse/5.1/spark/cassandra-properties.html
- Amazon Keyspaces CloudWatch metrics and dimensions: https://docs.aws.amazon.com/keyspaces/latest/devguide/metrics-dimensions.html
- AWS CLI create-keyspace command reference: https://docs.aws.amazon.com/cli/latest/reference/keyspaces/create-keyspace.html
- AWS CLI CloudWatch get-metric-statistics command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html

## Issues Found
- The "Unsupported Features" list included supported features. Renamed it to "Compatibility Differences" and corrected LWT, UDT, batch, and counter descriptions to match current Amazon Keyspaces documentation.
- The batch-statement limit was stated as 30 statements for all batches. Updated it to distinguish logged batches, logged batches with static columns, and unlogged batches.
- The counter guidance implied counters might not be supported. Updated the text and schema-check output to reflect that counters are supported but have table restrictions and retry caveats.
- The AWS CLI tag shorthand used uppercase `Key` and `Value`. Updated it to the documented `key=...,value=...` shorthand.
- The Keyspaces cqlsh examples used plain `cqlsh` without showing the AWS-recommended `cqlsh-expansion` path for SigV4/TLS. Updated the examples to use `cqlsh-expansion`.
- The AWS Glue Spark example used underscored option names that do not match Spark Cassandra Connector property names. Updated the snippet to use documented `spark.cassandra.*` configuration keys.
- The Python Keyspaces connection example used an outdated certificate filename and a generic TLS protocol constant. Updated it to use a Keyspaces certificate bundle path and `PROTOCOL_TLS_CLIENT`.
- The CloudWatch command used `p99` with `--statistics`, which is not valid for `get-metric-statistics`. Simplified the example to request the `Average` statistic.

## Review Notes
The post is now technically valid as a high-level migration guide. Future improvements could add more operational detail around large migrations, such as using S3 staging, request throttling, and separate Glue jobs as described in AWS's offline migration guidance.
