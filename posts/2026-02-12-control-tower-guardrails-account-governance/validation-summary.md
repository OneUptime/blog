# Validation Summary: How to Use Control Tower Guardrails for Account Governance

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Control Tower
- AWS Control Tower Control Catalog
- AWS Organizations Service Control Policies, Resource Control Policies, and declarative policies
- AWS Config
- AWS CloudFormation hooks
- AWS CLI
- Amazon EventBridge
- Amazon SNS

## Sources Consulted
- AWS Control Tower Controls Reference: Control behavior and guidance: https://docs.aws.amazon.com/controltower/latest/controlreference/control-behavior.html
- AWS Control Tower Controls Reference: Control Catalog: https://docs.aws.amazon.com/controltower/latest/controlreference/controls-reference.html
- AWS Control Tower Controls Reference: Resource identifiers for APIs and controls: https://docs.aws.amazon.com/controltower/latest/controlreference/control-identifiers.html
- AWS Control Tower Controls Reference: Legacy control identifiers: https://docs.aws.amazon.com/controltower/latest/controlreference/identifiers-for-legacy-controls.html
- AWS Control Tower Controls Reference: Control API examples: https://docs.aws.amazon.com/controltower/latest/controlreference/control-api-examples-short.html
- AWS Control Tower Controls Reference: Proactive controls for Amazon RDS: https://docs.aws.amazon.com/controltower/latest/controlreference/rds-rules.html
- AWS Control Tower Controls Reference: Detective controls: https://docs.aws.amazon.com/controltower/latest/controlreference/detective-controls.html
- AWS Control Tower Controls Reference: Compliance notifications by SNS in the audit account: https://docs.aws.amazon.com/controltower/latest/controlreference/receive-notifications.html
- AWS Control Tower User Guide: Governance drift and EventBridge creation: https://docs.aws.amazon.com/controltower/latest/userguide/governance-drift.html
- Amazon EventBridge Events Reference: AWS Control Tower events: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-controltower.html
- AWS CLI Command Reference: controlcatalog list-controls: https://docs.aws.amazon.com/cli/latest/reference/controlcatalog/list-controls.html
- AWS CLI Command Reference: controltower list-enabled-controls: https://docs.aws.amazon.com/cli/latest/reference/controltower/list-enabled-controls.html
- AWS CLI Command Reference: controltower enable-control: https://docs.aws.amazon.com/cli/latest/reference/controltower/enable-control.html
- AWS CLI Command Reference: controltower get-control-operation: https://docs.aws.amazon.com/cli/latest/reference/controltower/get-control-operation.html

## Issues Found
- The post used `aws controltower list-baselines` to list available controls. This lists baselines, not controls, so I changed it to `aws controlcatalog list-controls`.
- The post implied preventive controls are implemented only as SCPs. AWS documentation now says preventive controls can use SCPs, RCPs, and declarative policies, so I updated that explanation.
- The post described mandatory controls as always enabled by default. AWS documentation notes that mandatory controls are no longer applied by default starting with landing zone version 4.0, so I corrected the category description and rollout advice.
- The S3 encryption example used `AWS-GR_S3_BUCKET_DEFAULT_ENCRYPTION_ENABLED`, which is not listed in the current legacy control identifiers. I changed the example to show how to find and use the current global Control Catalog ARN.
- The operation identifier example used `op-abc123`, but `get-control-operation` requires a UUID-formatted operation identifier. I replaced it with a UUID-shaped example.
- The MFA example used `AWS-GR_IAM_USER_MFA_ENABLED` while describing console access MFA. I changed it to `AWS-GR_MFA_ENABLED_FOR_IAM_CONSOLE_ACCESS`, which matches the documented legacy control.
- The proactive RDS example used `CT.RDS.PR.1` for encryption, but AWS documents `CT.RDS.PR.1` as the Multi-AZ control. I changed it to `CT.RDS.PR.30`, the proactive RDS DB instance encryption-at-rest control.
- The EventBridge pattern used a non-documented `AWS Control Tower Guardrail Non-Compliance` detail type. I replaced it with the documented SNS path for compliance notifications and the documented `Drift Detected` EventBridge pattern for landing zone drift notifications.

## Review Notes
The remaining regional `arn:aws:controltower:REGION::control/...` examples use legacy identifiers that AWS still supports, but AWS recommends global `arn:aws:controlcatalog:::control/...` identifiers for new automation.
