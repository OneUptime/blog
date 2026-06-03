# Validation Summary: How to Implement Container Security Best Practices on AWS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Elastic Container Registry (ECR)
- Amazon Elastic Container Service (ECS) and Fargate
- Amazon Elastic Kubernetes Service (EKS)
- Kubernetes Pod security contexts and NetworkPolicy
- IAM Roles for Service Accounts (IRSA)
- AWS Secrets Manager
- Amazon GuardDuty EKS runtime monitoring
- Docker and Node.js container images
- Terraform AWS and TLS providers
- Python boto3

## Sources Consulted
- Docker Docs: Dockerfile best practices and multi-stage builds: https://docs.docker.com/build/building/best-practices/
- Docker Docs: Multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- npm Docs: npm ci command and omit behavior: https://docs.npmjs.com/cli/commands/npm-ci/
- Terraform Registry: aws_ecr_repository resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository.html
- Amazon ECR User Guide: image tag mutability: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html
- Amazon ECS Developer Guide: task definition parameters for Fargate: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS Developer Guide: passing Secrets Manager secrets through environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html
- Kubernetes Docs: seccomp and security context behavior: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes API Reference: NetworkPolicy v1: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Amazon EKS User Guide: network policies: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html
- Amazon EKS User Guide: creating IAM OIDC providers for IRSA: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
- Terraform Registry: tls_certificate data source: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/data-sources/certificate
- boto3 Docs: GuardDuty update_detector: https://docs.aws.amazon.com/boto3/latest/reference/services/guardduty/client/update_detector.html

## Issues Found
- The Dockerfile used `npm ci --only=production`. Updated it to `npm ci --omit=dev`, which is the current npm form for omitting development dependencies.
- The post said running as a non-root user prevents container escape attacks from gaining root on the host. Changed this to say it reduces risk, because non-root execution is a hardening measure but does not categorically prevent all container escapes.
- The ECR Terraform snippet referenced `aws_kms_key.ecr.arn` without declaring the KMS key. Added a minimal `aws_kms_key` resource with key rotation enabled so the snippet is internally consistent.
- The ECS secrets explanation said Secrets Manager was used "instead of environment variables." ECS `secrets` injects values into the container as environment variables, so the wording now says it keeps plaintext values out of the task definition while noting that application logs can still expose them.
- The EKS pod security section attributed the shown pod-level controls to Kubernetes Pod Security Standards. The snippet actually uses Kubernetes `securityContext` fields, so the wording now refers to security context settings.
- The IRSA Terraform snippet referenced `data.tls_certificate.eks` without declaring it. Added the missing `tls_certificate` data source for the EKS OIDC issuer URL.

## Review Notes
- The ECR `scan_on_push` example remains valid for basic scanning, but AWS documentation recommends configuring registry-level scanning when using broader private registry scanning settings.
- GuardDuty `EKS_RUNTIME_MONITORING` remains a valid boto3 feature name, but AWS also documents `RUNTIME_MONITORING`; both should not be enabled together.
