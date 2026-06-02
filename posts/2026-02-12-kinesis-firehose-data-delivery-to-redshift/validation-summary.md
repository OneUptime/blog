# Validation Summary: How to Use Kinesis Firehose for Data Delivery to Redshift

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Data Firehose / Kinesis Data Firehose
- Amazon Redshift
- Amazon Redshift COPY
- Amazon S3
- AWS IAM
- Amazon CloudWatch Logs and Metrics
- AWS CLI
- Python boto3

## Sources Consulted
- Amazon Data Firehose API Reference: RedshiftDestinationConfiguration: https://docs.aws.amazon.com/firehose/latest/APIReference/API_RedshiftDestinationConfiguration.html
- Amazon Data Firehose API Reference: CopyCommand: https://docs.aws.amazon.com/firehose/latest/APIReference/API_CopyCommand.html
- AWS CLI Command Reference: firehose create-delivery-stream: https://docs.aws.amazon.com/cli/latest/reference/firehose/create-delivery-stream.html
- Amazon Data Firehose Developer Guide: Configure destination settings for Amazon Redshift: https://docs.aws.amazon.com/firehose/latest/dev/create-destination.html
- Amazon Data Firehose Developer Guide: Grant Firehose access to an Amazon Redshift destination: https://docs.aws.amazon.com/firehose/latest/dev/controlling-access.html
- Amazon Data Firehose Developer Guide: Handle data delivery failures: https://docs.aws.amazon.com/firehose/latest/dev/retry.html
- Amazon Redshift Database Developer Guide: COPY: https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html
- Amazon Redshift Database Developer Guide: Using a manifest to specify data files: https://docs.aws.amazon.com/redshift/latest/dg/loading-data-files-using-manifest.html
- Amazon Redshift Database Developer Guide: STL_LOAD_ERRORS: https://docs.aws.amazon.com/redshift/latest/dg/r_STL_LOAD_ERRORS.html

## Issues Found
- The post said a Redshift cluster could be private if it was in the same VPC as Firehose, and showed an `update-destination` command implying Firehose ENI-based VPC access for Redshift. AWS documentation says Firehose-to-Redshift requires the Redshift provisioned cluster or Redshift Serverless workgroup to be publicly accessible, with the Firehose regional CIDR block allowed, and Firehose cannot write to Redshift clusters that use enhanced VPC routing. Updated the prerequisites and VPC section accordingly.
- Several example IAM and SNS ARNs used a 9-digit account ID. IAM and SNS ARNs require a 12-digit AWS account ID. Updated examples to use `123456789012`.
- The IAM section incorrectly said the Firehose IAM role needs Redshift permissions such as `redshift:GetClusterCredentials`. AWS documentation states Firehose uses the configured Redshift username and password for Redshift access, and the IAM role is used for S3, KMS if applicable, and CloudWatch Logs. Updated the wording and removed the unnecessary Redshift IAM actions.
- The manifest section implied users can configure Firehose to use generated manifests for normal Redshift loading. AWS documentation says Firehose writes skipped object information to a manifest under `errors/` after Redshift retry duration expires. Updated the section to describe manual backfill from that error manifest.

## Review Notes
- The post uses the older "Kinesis Data Firehose" name in places. AWS now primarily documents the service as "Amazon Data Firehose", but the AWS CLI namespace remains `firehose`, so this is a naming caveat rather than a functional error.
- The Python example was checked for syntax by parsing it with Python 3.
