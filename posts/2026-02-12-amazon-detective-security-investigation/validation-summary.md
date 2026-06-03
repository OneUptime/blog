# Validation Summary: How to Set Up Amazon Detective for Security Investigation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Detective
- Amazon GuardDuty
- AWS Security Hub CSPM
- AWS CloudTrail
- Amazon VPC Flow Logs
- Amazon EKS audit logs
- AWS CLI
- Terraform AWS provider
- AWS Lambda with boto3
- Amazon EventBridge
- Amazon SNS

## Sources Consulted
- Amazon Detective AWS CLI command reference: https://docs.aws.amazon.com/cli/latest/reference/detective/
- `create-graph`, `list-graphs`, `create-members`, and `accept-invitation` AWS CLI examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_detective_code_examples.html
- `start-investigation`, `get-investigation`, `list-investigations`, `list-indicators`, `list-datasource-packages`, and `update-datasource-packages` AWS CLI references: https://docs.aws.amazon.com/cli/latest/reference/detective/
- Amazon Detective source data documentation: https://docs.aws.amazon.com/detective/latest/userguide/detective-source-data-about.html
- Amazon Detective training period documentation: https://docs.aws.amazon.com/detective/latest/userguide/detective-data-training-period.html
- Amazon Detective investigation documentation: https://docs.aws.amazon.com/detective/latest/userguide/investigations-about.html
- Amazon GuardDuty `list-findings` AWS CLI reference: https://docs.aws.amazon.com/cli/latest/reference/guardduty/list-findings.html
- Amazon GuardDuty integration with Amazon Detective: https://docs.aws.amazon.com/guardduty/latest/ug/detective-integration.html
- Terraform AWS provider `aws_detective_graph`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/detective_graph
- Terraform AWS provider `aws_detective_organization_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/detective_organization_configuration
- Terraform AWS provider `aws_guardduty_detector` and `aws_guardduty_detector_feature`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector

## Issues Found
- The prerequisite section said CloudTrail and VPC Flow Logs had to be active before enabling Detective. AWS documents these as Detective core data sources and states Detective uses independent streams, so I changed the wording to avoid implying readers must manually configure those logs for Detective ingestion.
- The Terraform GuardDuty example used the deprecated `datasources` block. I replaced it with `aws_guardduty_detector_feature` resources for `S3_DATA_EVENTS` and `EKS_AUDIT_LOGS`.
- Several Detective graph ARN examples used `graph/abc123`. AWS CLI docs require the `graph:<32-hex-character-id>` form, so I corrected the sample ARNs.
- The `list-graphs` query included a `Status` field that is not returned by the documented API response. I removed that field from the query.
- The Terraform organization configuration used `aws_detective_graph.main.id` for `graph_arn`. The current provider exposes `graph_arn`, so I updated the reference to `aws_detective_graph.main.graph_arn`.
- The investigation section implied a GuardDuty finding ARN was passed to `start-investigation`. The API starts investigations for IAM user or role entity ARNs, so I changed the wording and command comment.
- The automated Lambda example built EC2 instance ARNs for `start_investigation`, but Detective investigations support IAM users and IAM roles. I removed the EC2 branch and limited the example to IAM users from GuardDuty `accessKeyDetails`.
- The automated workflow text mentioned Step Functions, but the shown implementation used EventBridge and Lambda. I corrected the description.
- The data source list said GuardDuty findings were required and omitted AWS security findings. I updated it to reflect Detective core and optional source packages.

## Review Notes
The post is technically valid after correction. Future improvements could add an `aws_lambda_permission` resource to the EventBridge example and expand the automation to handle IAM roles, but those are completeness improvements rather than correctness blockers for the current snippets.
