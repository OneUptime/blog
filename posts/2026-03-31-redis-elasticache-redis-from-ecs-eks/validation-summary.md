# Validation Summary: How to Connect to ElastiCache Redis from ECS/EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ElastiCache for Redis
- Amazon ECS (Fargate)
- Amazon EKS (Kubernetes)
- AWS Secrets Manager
- AWS IAM
- AWS VPC Security Groups
- Kubernetes NetworkPolicy
- Python redis-py client

## Sources Consulted
- AWS CLI `ec2 authorize-security-group-ingress` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS ECS Task Definition parameters (secrets, networkMode): https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS IAM actions for Secrets Manager: https://docs.aws.amazon.com/secretsmanager/latest/userguide/reference_iam-permissions.html
- Kubernetes NetworkPolicy specification: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Deployment spec (apps/v1): https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- redis-py documentation (Redis client parameters): https://redis-py.readthedocs.io/en/stable/connections.html

## Issues Found

1. **Misleading ASCP reference in EKS section**: The text stated "Create a Kubernetes secret from AWS Secrets Manager using the AWS Secrets and Config Provider" but the command shown was a plain `kubectl create secret generic --from-literal`, which has nothing to do with the AWS Secrets and Config Provider (ASCP). The ASCP uses SecretProviderClass CRDs and a CSI driver, not `kubectl create secret`. Fixed the text to simply say "Create a Kubernetes secret with the Redis connection details" to accurately describe what the command does.

2. **Missing `policyTypes` in NetworkPolicy**: The NetworkPolicy was missing `policyTypes: ["Egress"]`. Per the Kubernetes spec, when `policyTypes` is omitted, Ingress is always included and Egress is included only if egress rules are present. This means the policy would implicitly apply to both Ingress and Egress, unintentionally denying all ingress traffic to the matched pods (since no ingress rules were defined). Added `policyTypes: ["Egress"]` so the policy only governs egress as intended.

## Review Notes
- The ECS task definition Deployment YAML snippets are intentionally partial (e.g., missing `spec.selector` and `spec.template.metadata.labels` in the Deployment). This is acceptable for a focused tutorial showing environment variable injection from secrets.
- The ECS IAM policy should be attached to the **task execution role** (not the task role) for Fargate secrets injection. The post doesn't specify which role, which could cause confusion. Not fixed since it's an omission of detail rather than an error.
- The AWS account ID in the Secrets Manager ARN (`123456789`) is 9 digits rather than the real 12-digit format, but this is clearly a placeholder and acceptable.
- The Python redis-py code is correct and uses current API (`ssl=True`, `retry_on_timeout`, etc.) compatible with redis-py 4.x and 5.x.
