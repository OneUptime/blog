# Validation Summary: How to Configure Flux with IRSA for CodeCommit Access on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Amazon EKS
- AWS CodeCommit
- AWS IAM
- SSH authentication

## Sources Consulted
- Flux Source API reference for `GitRepository`: https://fluxcd.io/flux/components/source/api/v1/
- Flux bootstrap documentation for AWS CodeCommit: https://fluxcd.io/flux/installation/bootstrap/aws-codecommit/
- Flux CLI documentation for `flux bootstrap git`: https://fluxcd.io/flux/cmd/flux_bootstrap_git/
- Flux CLI documentation for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- AWS CodeCommit SSH setup documentation: https://docs.aws.amazon.com/codecommit/latest/userguide/setting-up-ssh-unixes.html
- AWS CodeCommit permissions reference: https://docs.aws.amazon.com/codecommit/latest/userguide/auth-and-access-control-permissions-reference.html
- Amazon EKS IRSA service account role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html

## Issues Found
- The original post claimed that `GitRepository.spec.provider: aws` enables IRSA-based authentication for CodeCommit. Current Flux `GitRepository` API documentation only lists `azure`, `github`, and `generic` providers for Git authentication, and `serviceAccountName` is only supported for the Azure provider. I removed `provider: aws` and replaced it with SSH authentication through `secretRef`.
- The original `flux bootstrap git` command used `--provider=aws`, but current Flux CLI documentation for `flux bootstrap git` does not include that flag. I replaced the bootstrap command with the documented CodeCommit SSH form using `--private-key-file` and optional `--password`.
- The original post annotated the `source-controller` service account for IRSA. That annotation is valid for EKS IRSA generally, but it does not make Flux GitRepository CodeCommit authentication work because Flux does not support an AWS provider for GitRepository authentication. I replaced the service account annotation step with creating a Flux Git authentication Secret.
- The original CodeCommit repository URL used HTTPS for the Flux source. Current Flux CodeCommit bootstrap documentation uses SSH with the IAM SSH public key ID as the username. I changed the examples to use `ssh://<SSH-Key-ID>@git-codecommit.<region>.amazonaws.com/v1/repos/<repository>`.
- The original write policy snippet was shown but not created with `aws iam create-policy`. I added the missing command.
- The original text said the `source-controller` needs write access for image automation. Flux image automation uses the GitRepository's access details for push operations, so I changed the wording to say the IAM user used by the GitRepository needs write access.

## Review Notes
AWS CodeCommit remains technically supported in the consulted AWS documentation, but the current Flux documentation recommends SSH-based CodeCommit access rather than IRSA-based GitRepository authentication.
