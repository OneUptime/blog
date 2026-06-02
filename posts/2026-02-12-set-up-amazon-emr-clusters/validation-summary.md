# Validation Summary: How to Set Up Amazon EMR Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EMR
- AWS CLI
- Amazon EC2
- Amazon S3
- IAM roles and instance profiles
- VPC networking and security groups
- Apache Spark
- Apache Hadoop
- Apache Hive
- AWS CloudFormation
- CloudWatch monitoring

## Sources Consulted
- AWS CLI Command Reference: `aws emr create-cluster` - https://docs.aws.amazon.com/cli/latest/reference/emr/create-cluster.html
- AWS CLI Command Reference: `aws emr create-security-configuration` - https://docs.aws.amazon.com/cli/latest/reference/emr/create-security-configuration.html
- Amazon EMR Management Guide: Create a security configuration with the Amazon EMR console or AWS CLI - https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-create-security-configuration.html
- Amazon EMR Management Guide: Planning and configuring instance fleets - https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-instance-fleet.html
- Amazon EMR API Reference: SpotProvisioningSpecification - https://docs.aws.amazon.com/emr/latest/APIReference/API_SpotProvisioningSpecification.html
- Amazon EMR Release Guide: Amazon EMR release 7.0.0 - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-700-release.html
- Amazon EMR Release Guide: Configure applications when you create a cluster - https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-configure-apps-create-cluster.html
- Amazon EMR Management Guide: Adding steps to an Amazon EMR cluster with the AWS CLI - https://docs.aws.amazon.com/emr/latest/ManagementGuide/add-step-cli.html
- Amazon EMR Management Guide: Amazon VPC options when you launch a cluster - https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-clusters-in-a-vpc.html
- AWS CloudFormation Template Reference: AWS::EMR::Cluster - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-emr-cluster.html

## Issues Found
- The transient Spark job command used `--steps Type=Spark`, which is not the documented AWS CLI pattern for submitting a Spark application step. Changed it to `Type=CUSTOM_JAR` with `Jar=command-runner.jar` and `Args=[spark-submit,...]`, matching the Amazon EMR Management Guide example for Spark steps.
- The CloudFormation template referenced `SubnetId`, `KeyPair`, and `LogBucket` without defining them. Added minimal `Parameters` entries so the shown template is complete and valid as a CloudFormation snippet.
- The subnet checklist said S3 access should be through a NAT gateway or S3 VPC endpoint. AWS documents that public-subnet EMR clusters can access S3 through an internet gateway, while private subnet configurations commonly use NAT or VPC endpoints. Updated the wording to cover internet gateway, NAT gateway, or S3 VPC endpoint depending on subnet type.

## Review Notes
The examples use `emr-7.0.0`, which is a valid Amazon EMR 7.x release and includes Spark, Hadoop, Hive, and Presto. For new production clusters, consider using the latest supported EMR 7.x release after testing application compatibility.
