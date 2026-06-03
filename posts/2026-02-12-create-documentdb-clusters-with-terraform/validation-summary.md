# Validation Summary: How to Create DocumentDB Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DocumentDB
- AWS
- Terraform
- MongoDB connection strings
- AWS KMS
- AWS Secrets Manager
- Amazon SNS
- Amazon CloudWatch

## Sources Consulted
- AWS Documentation: Amazon DocumentDB compatibility with MongoDB - https://docs.aws.amazon.com/documentdb/latest/devguide/compatibility.html
- AWS Documentation: Amazon DocumentDB Features and Configurations - https://docs.aws.amazon.com/documentdb/latest/devguide/docdb-engine-version-supportability.html
- AWS Documentation: Amazon DocumentDB engine version support dates - https://docs.aws.amazon.com/documentdb/latest/developerguide/docdb-version-support-dates.html
- AWS Documentation: Amazon DocumentDB cluster parameters reference - https://docs.aws.amazon.com/documentdb/latest/developerguide/cluster_parameter_groups-list_of_parameters.html
- AWS Documentation: Using change streams with Amazon DocumentDB - https://docs.aws.amazon.com/documentdb/latest/devguide/change_streams.html
- AWS Documentation: Amazon DocumentDB: how it works - https://docs.aws.amazon.com/documentdb/latest/developerguide/how-it-works.html
- AWS Documentation: Monitoring Amazon DocumentDB with CloudWatch - https://docs.aws.amazon.com/documentdb/latest/devguide/cloud_watch.html
- AWS CLI Command Reference: create-db-subnet-group - https://docs.aws.amazon.com/cli/latest/reference/docdb/create-db-subnet-group.html
- Terraform AWS Provider: aws_docdb_cluster - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS Provider: aws_docdb_cluster_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster_instance
- Terraform AWS Provider: aws_docdb_cluster_parameter_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster_parameter_group
- Terraform AWS Provider: aws_docdb_event_subscription - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_event_subscription

## Issues Found
- The opening compatibility statement omitted Amazon DocumentDB 8.0 and did not mention that 3.6 reached end of standard support in March 2026. Updated the statement to include 8.0 and warn against using 3.6 for new production clusters.
- The parameter group comment said `change_stream_log_retention_duration` enables change streams. AWS documents this parameter as controlling retention duration; enabling change streams requires the `modifyChangeStreams` API. Updated the comment to describe retention.
- The cluster used `var.master_password`, while the Secrets Manager example generated and stored `random_password.docdb.result`. Updated the cluster to use the generated password and removed the unused `master_password` variable.
- The cluster example did not specify availability zones even though the text recommends spreading production instances across AZs. Added `availability_zones = var.availability_zones` and the matching variable.
- The instance example set `auto_minor_version_upgrade = true`, but the Terraform AWS provider documents that this argument does not apply to Amazon DocumentDB. Removed it.
- The instance tags and explanation implied that the first Terraform-created instance is permanently the writer. Terraform and AWS document that DocumentDB manages writer and reader roles, and roles can change during failover. Removed the role tag and corrected the explanation.

## Review Notes
The snippets are tutorial fragments rather than a standalone Terraform module, so I did not run `terraform validate`. The CloudWatch examples use valid Amazon DocumentDB metric names and documented dimensions, but production alarms may need per-instance or role-specific dimensions depending on the desired signal.
