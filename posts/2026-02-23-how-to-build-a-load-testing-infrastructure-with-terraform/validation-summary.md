# Validation Summary: How to Build a Load Testing Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS ECS Fargate
- Amazon ECR
- Amazon S3
- Amazon EFS
- AWS Step Functions
- AWS Lambda service integrations
- AWS Cloud Map service discovery
- Amazon Managed Grafana
- k6
- Locust
- InfluxDB

## Sources Consulted
- Grafana k6 InfluxDB output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/influxdb/
- Grafana k6 results output documentation: https://grafana.com/docs/k6/latest/get-started/results-output/
- Locust Docker documentation: https://docs.locust.io/en/latest/running-in-docker.html
- Locust configuration documentation: https://docs.locust.io/en/latest/configuration.html
- AWS Step Functions ECS/Fargate integration documentation: https://docs.aws.amazon.com/step-functions/latest/dg/connect-ecs.html
- AWS Step Functions Lambda integration documentation: https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- Amazon ECS EFSVolumeConfiguration API reference: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_EFSVolumeConfiguration.html
- Amazon ECS service discovery documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html
- InfluxDB Docker installation and initialization documentation: https://docs.influxdata.com/influxdb/v1/introduction/install/docker/
- Terraform AWS provider documentation for aws_grafana_workspace: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/grafana_workspace
- AWS CloudFormation Amazon Managed Grafana workspace reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-grafana-workspace.html

## Issues Found
- The k6 task used the built-in `influxdb=http://.../k6` output syntax, which is for InfluxDB v1, while the InfluxDB task used the InfluxDB 2.x image and 2.x initialization variables. Changed the InfluxDB task to use `influxdb:1.12.4`, initialize the `k6` database with `INFLUXDB_DB`, and mount `/var/lib/influxdb`, matching k6's built-in InfluxDB output.
- The Locust worker snippet used the `LOCUST_LOCUSTFILE` environment variable. Current Locust Docker examples pass the locustfile with `-f`. Updated the worker command to include `-f /tests/locustfile.py`.
- The ECS EFS volume omitted transit encryption. AWS documents transit encryption as optional unless IAM authorization is used, but enabling it is the correct secure configuration for ECS task EFS volumes. Added `transit_encryption = "ENABLED"`.
- The ECS EFS volume mounted `/influxdb` as the EFS root directory, which can fail if that directory has not already been created. Changed the root directory to `/` for a working default mount.
- The Step Functions definition used the Lambda `PrepareTest` output as if it were merged directly into the state input. AWS Lambda optimized integrations return the function result under `Payload`. Added `ResultPath` fields and updated the `Count.$` and threshold JSONPath expressions so later states read the expected data.

## Review Notes
The Terraform snippets are still illustrative and depend on surrounding resources that are referenced but not shown, such as IAM roles, security groups, CloudWatch log groups, Lambda functions, and Cloud Map service definitions. The Amazon Managed Grafana workspace example configures CloudWatch as an AWS data source; querying InfluxDB from Amazon Managed Grafana would require additional Grafana data source provisioning not shown in the post.
