# Validation Summary: How to Configure kubectl for EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- AWS CLI v2
- kubectl
- Kubernetes kubeconfig
- EKS IAM authentication
- EKS access entries and aws-auth ConfigMap
- AWS named profiles and IAM role assumption
- kubectx and kubens

## Sources Consulted
- Amazon EKS User Guide: Connect kubectl to an EKS cluster by creating a kubeconfig file - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- AWS CLI Command Reference: aws eks update-kubeconfig - https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- Amazon EKS User Guide: Grant IAM users access to Kubernetes with a ConfigMap - https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Amazon EKS User Guide: Grant IAM users access to Kubernetes with EKS access entries - https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Kubernetes documentation: kubeconfig v1 schema - https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The post said `aws eks update-kubeconfig` writes to `~/.kube/config` by default without mentioning `KUBECONFIG`. Updated the text to reflect AWS CLI behavior: if `KUBECONFIG` is set, the first path in that environment variable is used; otherwise the default path is used.
- The generated kubeconfig example omitted the `--output json` arguments shown in current AWS CLI documentation and used a less representative argument order. Updated the example to match the current documented generated exec configuration more closely.
- The post said using `--profile` adds a `--profile` flag to the kubeconfig exec command. Current AWS CLI behavior persists the selected profile as an `AWS_PROFILE` environment variable in the exec configuration, so the explanation was corrected.
- The post treated `aws-auth` ConfigMap mappings as the only access path when authorization fails. Updated the troubleshooting and verification language to account for current EKS access entries while still noting `aws-auth` for clusters that use the legacy mechanism.
- The IAM role section did not distinguish `--role-arn` from `--assume-role-arn`. Added a short clarification that `--role-arn` is for kubectl authentication, while `--assume-role-arn` is for retrieving cluster details while generating kubeconfig.

## Review Notes
The `aws-auth` ConfigMap is deprecated in favor of EKS access entries, but the post still has value because many existing clusters continue to use it. The Linux kubectl installation example targets amd64 only; future improvements could add ARM64 or package-manager alternatives, but the command is technically valid for Linux amd64.
