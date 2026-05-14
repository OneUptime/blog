# Validation Summary: How to Configure GitRepository with AWS CodeCommit in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD GitRepository and source-controller
- Kubernetes Secrets
- AWS CodeCommit
- AWS IAM Git credentials and SSH public keys
- AWS CLI
- EKS / IRSA limitations

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux AWS CodeCommit use case documentation: https://v2-0.docs.fluxcd.io/flux/use-cases/aws-codecommit/
- AWS CodeCommit HTTPS Git credentials documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-gc.html
- AWS CodeCommit SSH troubleshooting documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/troubleshooting-ssh.html
- AWS CLI `create-service-specific-credential` reference: https://docs.aws.amazon.com/goto/cli2/iam-2010-05-08/CreateServiceSpecificCredential
- AWS CLI `upload-ssh-public-key` reference: https://docs.aws.amazon.com/cli/latest/reference/iam/upload-ssh-public-key.html
- AWS git-remote-codecommit project documentation: https://github.com/aws/git-remote-codecommit

## Issues Found
- The post claimed Flux `GitRepository` supports IAM-based CodeCommit authentication on EKS with `provider: aws`. Current Flux `GitRepository` documentation lists `generic`, `azure`, and `github` providers only, so `provider: aws` is not valid for CodeCommit Git sources. I replaced the IRSA setup with a limitation note and updated the intro, description, troubleshooting, and summary accordingly.
- The SSH `GitRepository` example omitted the CodeCommit SSH username. AWS CodeCommit requires the IAM SSH public key ID (`SSHPublicKeyId`) as the SSH username unless an SSH client config supplies it. I updated the SSH URL examples to include `<SSH-Key-ID>@`.
- The GRC URL comment described the format as IAM-based auth. I clarified that the `codecommit::` format is used by the `git-remote-codecommit` helper, which Flux source-controller does not handle directly.

## Review Notes
The HTTPS Git credential flow, Kubernetes Secret keys, Flux `GitRepository` API version and fields, AWS CLI commands for service-specific credentials and SSH public key upload, and Flux verification commands are consistent with the consulted official documentation. CodeCommit is currently back in AWS general availability, but some AWS marketing/pricing pages may still show stale availability language.
