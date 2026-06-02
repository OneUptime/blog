# Validation Summary: How to Run Apache Spark Jobs on Amazon EMR

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Amazon EMR
- Apache Spark and PySpark
- AWS CLI
- Amazon S3 and EMRFS
- YARN
- AWS Step Functions

## Sources Consulted
- AWS CLI Command Reference: `aws emr add-steps` - https://docs.aws.amazon.com/cli/latest/reference/emr/add-steps.html
- Amazon EMR Management Guide: Adding steps to an Amazon EMR cluster with the AWS CLI - https://docs.aws.amazon.com/emr/latest/ManagementGuide/add-step-cli.html
- Amazon EMR Release Guide: Add a Spark step - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-submit-step.html
- Amazon EMR Release Guide: Access the Spark web UIs - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-webui.html
- Amazon EMR Management Guide: View web interfaces hosted on Amazon EMR clusters - https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-web-interfaces.html
- Amazon EMR Release Guide: Use the EMRFS S3-optimized committer - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-s3-optimized-committer.html
- Amazon EMR Release Guide: Requirements for the EMRFS S3-optimized committer - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-committer-reqs.html
- Amazon EMR Release Guide: Enable the EMRFS S3-optimized committer for Amazon EMR 5.19.0 - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-spark-committer-enable.html
- Apache Spark Documentation: Submitting Applications - https://spark.apache.org/docs/3.5.4/submitting-applications.html
- Apache Spark Documentation: Running Spark on YARN - https://spark.apache.org/docs/3.5.4/running-on-yarn.html
- Apache Spark Documentation: Configuration - https://spark.apache.org/docs/latest/configuration.html
- Apache Spark Documentation: Monitoring and Instrumentation - https://spark.apache.org/docs/latest/monitoring.html
- AWS Step Functions Developer Guide: Create and manage Amazon EMR clusters with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-emr.html

## Issues Found
- The cluster deploy mode description said the driver runs on one of the worker nodes. Updated it to say the driver runs inside the YARN ApplicationMaster on the cluster, matching Spark-on-YARN documentation.
- The EMRFS S3-optimized committer example did not set the documented `spark.sql.parquet.fs.optimized.committer.optimization-enabled` property and included an unrelated Hive conversion setting. Updated the snippet to enable the documented property and keep the EMR optimized Parquet committer class.
- The monitoring section described port 18080 as the Spark UI. Updated it to identify port 18080 as the Spark History Server, which is the EMR/Spark interface exposed there for completed applications.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI behavior was checked against the official AWS CLI and Amazon EMR documentation rather than local `aws --help` output.
- The embedded Python and JSON snippets were syntax-checked with Python 3 after edits.
- The Step Functions example terminates the cluster after a successful Spark step. A production workflow should usually add failure handling so the cluster is also terminated if the step fails.
