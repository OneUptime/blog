# Validation Summary: How to Use Dapr with IRSA on Amazon EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar runtime, component model)
- Amazon EKS (Elastic Kubernetes Service)
- IRSA (IAM Roles for Service Accounts)
- AWS IAM (OIDC providers, trust policies, managed policies)
- AWS SQS / SNS (via Dapr pubsub component)
- AWS Secrets Manager (via Dapr secret store component)
- Kubernetes (ServiceAccounts, pod specs)

## Sources Consulted
- Dapr component reference for AWS SNS/SQS pubsub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr component reference for AWS Secrets Manager: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-secret-manager/
- Dapr components-contrib GitHub repository (pubsub/aws directory structure)
- AWS documentation on IAM managed policy ARN format
- AWS documentation on IRSA and EKS OIDC provider setup

## Issues Found
1. **Incorrect Dapr pubsub component type**: The post used `pubsub.aws.sqs` which does not exist in Dapr. The correct component type is `pubsub.aws.snssqs` (Dapr's AWS pubsub component combines SNS for publishing and SQS for subscribing). Fixed the type and updated the description from "SQS pubsub component" to "SNS/SQS pubsub component". Also removed the unnecessary empty `endpoint` metadata field.

## Review Notes
- The `secretstores.aws.secretmanager` type is correct (singular "manager", not "secretsmanager"), despite the AWS service being named "Secrets Manager" (plural).
- AWS managed policy ARNs (`arn:aws:iam::aws:policy/...`) are correctly formatted with the empty region field.
- The IRSA trust policy structure, OIDC provider setup, and ServiceAccount annotation are all correct.
- AWS now offers "EKS Pod Identity" as a newer alternative to IRSA, but IRSA remains fully supported. This is not an error, just a note for potential future updates.
- The `--thumbprint-list <thumbprint>` placeholder in Step 1 is acceptable for a tutorial. AWS no longer validates thumbprints for EKS OIDC providers using AWS-managed certificates, though the CLI parameter is still syntactically required.
