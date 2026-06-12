# Validation Summary: How to Create AWS EKS Pod Identity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS Pod Identity
- Kubernetes service accounts and Deployments
- AWS IAM roles and policies
- AWS CLI
- AWS STS and EKS Auth API
- Boto3 / AWS SDK credential provider chain
- Terraform AWS provider

## Sources Consulted
- Amazon EKS User Guide: Learn how EKS Pod Identity grants pods access to AWS services - https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
- Amazon EKS User Guide: Understand how EKS Pod Identity works - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-how-it-works.html
- Amazon EKS User Guide: Set up the Amazon EKS Pod Identity Agent - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-agent-setup.html
- Amazon EKS User Guide: Create IAM role with trust policy required by EKS Pod Identity - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-role.html
- Amazon EKS User Guide: Assign an IAM role to a Kubernetes service account - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-association.html
- Amazon EKS User Guide: Use pod identity with the AWS SDK - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-minimum-sdk.html
- Amazon EKS User Guide: Access AWS Resources using EKS Pod Identity Target IAM Roles - https://docs.aws.amazon.com/eks/latest/userguide/pod-id-assign-target-role.html
- AWS CLI Command Reference: create-pod-identity-association - https://docs.aws.amazon.com/cli/latest/reference/eks/create-pod-identity-association.html
- AWS CLI Command Reference: describe-pod-identity-association - https://docs.aws.amazon.com/cli/latest/reference/eks/describe-pod-identity-association.html
- AWS CLI Command Reference: update-pod-identity-association - https://docs.aws.amazon.com/cli/latest/reference/eks/update-pod-identity-association.html
- Amazon EKS Best Practices Guide: Identity and Access Management - https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- IAM User Guide: Pass session tags in AWS STS - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html

## Issues Found
- The post described Pod Identity credential retrieval as using a mounted Unix socket and showed the agent calling STS directly. Updated the explanation and sequence diagram to reflect the documented flow: EKS injects container credential provider environment variables and a projected token, the SDK contacts the node-local Pod Identity Agent, and the agent calls the EKS Auth API `AssumeRoleForPodIdentity`.
- The version guidance said to start fresh on EKS 1.24+ and the prerequisite comment said the cluster must be 1.24+. Reworded this to require a supported EKS cluster and platform version, matching current AWS documentation.
- The comparison table said Pod Identity setup takes exactly 3 steps and always requires the add-on. Reworded this to "Fewer steps" and noted the EKS Auto Mode exception.
- The comparison table overstated SDK support as "All modern SDKs" for Pod Identity. Updated it to "Supported AWS SDK versions" because AWS documents minimum SDK versions for Pod Identity support.
- The cross-account section used `aws:PrincipalTag` conditions and application-level `sts:AssumeRole` code. Updated it to the current Pod Identity target role flow using `--target-role-arn`, `aws:RequestTag` conditions, `aws:PrincipalARN`, and `sts:TagSession`, so Pod Identity performs the role chaining automatically.
- The architecture diagram showed `AssumeRoleForPodIdentity` going directly to AWS STS. Updated it to show the EKS Auth API as the service handling that action.

## Review Notes
The IAM trust policy, AWS CLI commands, Kubernetes ServiceAccount and Deployment manifests, and Terraform resource names were otherwise consistent with current AWS documentation. The pinned add-on version in the post may become stale over time; future updates should prefer checking EKS add-on compatibility for the target cluster version before copying the exact version.
