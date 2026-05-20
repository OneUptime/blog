# Validation Summary: How to Configure Git Credentials for AWS CodeCommit in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD
- AWS CodeCommit
- AWS IAM
- AWS CLI
- Amazon EKS IRSA
- Kubernetes Secrets, ConfigMaps, and Deployments
- Git HTTPS credentials, SSH keys, and credential helpers

## Sources Consulted
- AWS IAM User Guide: IAM credentials for CodeCommit: Git credentials, SSH keys, and AWS access keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_ssh-keys.html
- AWS CLI Command Reference: create-service-specific-credential - https://docs.aws.amazon.com/cli/latest/reference/iam/create-service-specific-credential.html
- AWS CLI Command Reference: codecommit credential-helper - https://docs.aws.amazon.com/cli/latest/reference/codecommit/credential-helper/
- Argo CD documentation: Private Repositories - https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD documentation: Declarative Setup - https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD documentation: Custom Tooling - https://argo-cd.readthedocs.io/en/stable/operator-manual/custom_tools/
- Argo CD documentation: Webhook Configuration - https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Amazon EKS User Guide: Argo CD considerations - https://docs.aws.amazon.com/eks/latest/userguide/argocd-considerations.html

## Issues Found
- The SSH repository credential template URL omitted the CodeCommit `SSHPublicKeyId` username. ArgoCD matches credential templates by URL prefix, so `ssh://git-codecommit...` would not match repositories using CodeCommit's required `ssh://SSHPublicKeyId@git-codecommit...` URL format. Updated the SSH secret URL and added a short note to use the `SSHPublicKeyId` in both places.
- The SSH private key example used `-----BEGIN RSA PRIVATE KEY-----`, but the shown `ssh-keygen -t rsa` command creates OpenSSH-format private keys by default on current OpenSSH versions. Updated the example to use `-----BEGIN OPENSSH PRIVATE KEY-----`.
- The `argocd-ssh-known-hosts-cm` ConfigMap example was missing the ArgoCD part-of label recommended by ArgoCD declarative setup documentation. Added `app.kubernetes.io/part-of: argocd`.
- The AWS credential-helper section did not state that the AWS CLI must be present in the repo-server container. Since the Git helper command executes `aws codecommit credential-helper`, added a note that the repo-server image must include the AWS CLI or mount it as custom tooling.

## Review Notes
CodeCommit access methods and CLI examples are accurate for current AWS CLI and IAM documentation. The credential-helper approach is viable with IRSA, but operational success depends on the repo-server container image containing compatible AWS CLI tooling and on the service account being correctly annotated by the IRSA setup.
