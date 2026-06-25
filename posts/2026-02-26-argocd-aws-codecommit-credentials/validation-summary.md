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
- (Reported in issue #149) Method 3 mounted the credential-helper gitconfig at `/home/argocd/.gitconfig`. ArgoCD runs Git with `HOME=/dev/null`, so the per-user config is never read and the helper was silently ignored - the reason ArgoCD never invoked it. Corrected the mount to the system path `/etc/gitconfig` (with `subPath: gitconfig` and ConfigMap key `gitconfig`), matching the sibling Git credential caching article. Verified against the ArgoCD `git_configuration` docs and `util/git/client.go`.
- (Reported in issue #149) The post claimed the credential-helper approach needs "no further config." Corrected: ArgoCD authenticates through `GIT_ASKPASS` (fed from `repo`/`repo-creds` Secrets), not through an on-disk `credential.helper`. The helper only fires for a repository with no matching Secret, requires the `aws` CLI in the repo-server image and IRSA on its service account, and is undocumented/unsupported upstream. Reframed Method 3 accordingly and added Method 4 (an IRSA credential-refresh CronJob writing a `repo-creds` Secret) as the recommended, fully supported IRSA pattern. Added a Troubleshooting entry for the "SPNEGO token required" failure mode.

## Review Notes
CodeCommit access methods and CLI examples for Methods 1 (static HTTPS credentials) and 2 (SSH keys) are accurate and go through ArgoCD's first-class credential paths. Method 3 (the raw credential-helper approach) is not a first-class ArgoCD feature: ArgoCD does not authenticate Git via the system credential helper, so it only works in the narrow, unsupported configuration documented after this revision (system `/etc/gitconfig`, AWS CLI in the image, IRSA on the repo-server service account, and no conflicting `repo-creds` Secret). For production IRSA use, prefer Method 4's credential-refresh CronJob or the AWS-managed EKS ArgoCD capability.
