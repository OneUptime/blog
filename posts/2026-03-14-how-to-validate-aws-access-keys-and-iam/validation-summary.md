# Validation Summary: Validating AWS Access Keys and IAM Roles in Cilium

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- Amazon EKS
- AWS IAM
- AWS CLI
- Bash

## Sources Consulted
- Cilium AWS ENI documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/eni/
- Cilium Helm values reference for `eni.iamRole`: https://docs.cilium.io/en/stable/helm-values/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- Amazon EKS IAM roles for service accounts documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- AWS CLI official Docker image documentation: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-docker.html
- AWS CLI `iam simulate-principal-policy` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/simulate-principal-policy.html

## Issues Found
- The authentication snippet used `kubectl exec -l k8s-app=cilium`, but `kubectl exec` requires a pod or resource target and Cilium agent containers should not be assumed to include the AWS CLI or `jq`. Changed the example to run the official AWS CLI container as the `cilium-operator` service account, which matches Cilium's ENI IAM model.
- The post tested AWS EC2 permissions from Cilium agent pods, but Cilium's AWS ENI allocation and EC2 API calls are performed by the Cilium operator. Updated authentication, ENI access, and service account verification commands to use `cilium-operator`.
- The prerequisites omitted `jq` and the AWS region needed by the EC2 AWS CLI call. Added `jq` and `AWS_REGION`.
- The least-privilege example used a hard-coded placeholder role ARN. Updated it to derive the IRSA role ARN from the `cilium-operator` service account and allow `CILIUM_ROLE_ARN` to be supplied explicitly when needed.

## Review Notes
The validation flow assumes an IRSA-style Cilium operator service account annotation. Clusters using EKS Pod Identity or another credential path may need to set `CILIUM_ROLE_ARN` manually for the IAM policy simulator step.
