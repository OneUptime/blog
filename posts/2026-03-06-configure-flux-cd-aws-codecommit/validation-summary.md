# Validation Summary: How to Configure Flux CD with AWS CodeCommit

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Flux source-controller `GitRepository`
- Flux notification-controller `Receiver`
- AWS CodeCommit
- AWS IAM Git credentials and SSH public keys
- Amazon EKS / IRSA
- Kubernetes Secrets and manifests
- AWS CLI, kubectl, Git, SSH

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference for `GitRepository.spec.provider` and `secretRef`: https://fluxcd.io/flux/components/source/api/v1/
- Flux bootstrap for AWS CodeCommit: https://fluxcd.io/flux/installation/bootstrap/aws-codecommit/
- Flux generic Git bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/generic-git-server/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- AWS IAM `create-service-specific-credential` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-service-specific-credential.html
- AWS IAM `upload-ssh-public-key` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/iam/upload-ssh-public-key.html
- AWS CodeCommit SSH setup and troubleshooting documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-ssh-unixes.html
- AWS IAM credentials for CodeCommit: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_ssh-keys.html
- AWS CodeCommit VPC endpoint documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/codecommit-and-interface-VPC.html
- AWS CodeCommit Git endpoints documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/regions.html
- AWS DevOps Blog, CodeCommit return to General Availability: https://aws.amazon.com/blogs/devops/aws-codecommit-returns-to-general-availability/

## Issues Found
- The post incorrectly described IRSA as a supported direct authentication method for Flux `GitRepository` access to CodeCommit using `provider: aws`. Current Flux `GitRepository.spec.provider` supports `generic`, `azure`, and `github`, not `aws`. Replaced the IRSA procedure with a caveat explaining that EKS users should use HTTPS Git credentials or SSH for CodeCommit.
- The opening description claimed the post covered `git-remote-codecommit`, but the post did not and Flux source-controller does not use Git remote helpers for reconciliation. Updated the wording to refer to EKS authentication considerations instead.
- The SSH key generation command did not request PEM output, while Flux's CodeCommit bootstrap documentation uses a PEM-encoded RSA key. Added `-m PEM` to the `ssh-keygen` command.
- The bootstrap section did not state that `flux bootstrap git` needs push permission to commit Flux manifests. Added a note that bootstrap credentials need pull and push access.
- The private cluster VPC endpoint troubleshooting command checked the CodeCommit API endpoint service (`codecommit`) instead of the Git operations endpoint service (`git-codecommit`) used by Git clone/pull traffic. Updated the service-name filter to `com.amazonaws.us-east-1.git-codecommit`.
- The Receiver example described receiving CodeCommit events via SNS too directly. Adjusted the comment to describe it as a generic receiver that can be called after CodeCommit events, and added the optional `apiVersion` field to the referenced `GitRepository` resource for clarity.

## Review Notes
CodeCommit was de-emphasized for new customers in 2024 but AWS announced its return to full General Availability on November 24, 2025. The post is technically relevant as of the validation date. The HTTPS and SSH examples are valid for Flux's generic Git support, but production deployments should plan credential rotation for IAM Git credentials or SSH keys.
