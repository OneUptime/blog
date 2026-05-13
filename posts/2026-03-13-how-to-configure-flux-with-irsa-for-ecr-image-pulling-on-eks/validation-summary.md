# Validation Summary: How to Configure Flux with IRSA for ECR Image Pulling on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- Amazon ECR
- AWS CLI
- eksctl
- Kustomize

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux CLI `flux get images` documentation: https://fluxcd.io/flux/cmd/flux_get_images/
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon ECR with Amazon EKS documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_EKS.html
- AWS CLI STS `get-caller-identity` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html
- AWS IAM policy creation documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create-cli.html
- AWS CLI IAM `create-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html
- AWS CLI ECR `set-repository-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/set-repository-policy.html

## Issues Found
- The post used `source-controller` as the service account and deployment for ECR image scanning. Flux ImageRepository scanning is performed by `image-reflector-controller`, so the trust policy subject, Kustomize patch, eksctl command, verification command, log command, and conclusion were updated accordingly.
- The prerequisites only said Flux must be installed. Flux image automation controllers are optional components, so the prerequisite now states that `image-reflector-controller` and `image-automation-controller` must be enabled.
- The Kustomize patch example omitted `gotk-sync.yaml` from the Flux bootstrap resources. The example now includes both `gotk-components.yaml` and `gotk-sync.yaml`, matching Flux's documented bootstrap customization pattern.
- The post did not mention restarting the controller after changing the IRSA service account annotation. A `kubectl rollout restart deployment -n flux-system image-reflector-controller` command was added so the running pod picks up the injected IRSA environment.
- The Flux CLI verification commands used `flux get image repository` and `flux get image policy`; current Flux CLI documentation uses `flux get images repository` and `flux get images policy`. The commands were corrected.
- The explanation of `provider: aws` was too narrow. It now states that Flux uses AWS authentication from the image-reflector-controller pod, including IRSA when the service account is annotated.

## Review Notes
The IAM permissions shown are broader than strict least privilege because repository-scoped ECR permissions could be narrowed, while `ecr:GetAuthorizationToken` must remain resource `"*"`. The examples remain technically valid for a tutorial.
