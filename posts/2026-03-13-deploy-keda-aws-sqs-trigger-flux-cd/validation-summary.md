# Validation Summary: How to Deploy KEDA with AWS SQS Trigger with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- KEDA
- AWS SQS
- AWS IAM Roles for Service Accounts (IRSA)
- Amazon EKS
- eksctl
- Kubernetes Deployments and ServiceAccounts
- Flux CD v2 Kustomizations
- Kustomize
- AWS CLI

## Sources Consulted
- KEDA AWS SQS Queue scaler documentation: https://keda.sh/docs/2.19/scalers/aws-sqs/
- KEDA AWS IRSA authentication provider documentation: https://keda.sh/docs/2.19/authentication-providers/aws/
- KEDA authentication concepts documentation: https://keda.sh/docs/2.19/concepts/authentication/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- AWS EKS eksctl IAM service account documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- AWS EKS IRSA service account role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS CLI SQS send-message-batch documentation: https://docs.aws.amazon.com/cli/latest/reference/sqs/send-message-batch.html
- AWS CLI SQS get-queue-attributes documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sqs/get-queue-attributes.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The IRSA TriggerAuthentication used `podIdentity.provider: aws-eks`, which KEDA documents as deprecated for removal in KEDA v3. Changed it to `podIdentity.provider: aws`.
- The IRSA explanation said KEDA would use the pod IAM role automatically, but the shown setup attaches the SQS read policy to the KEDA operator service account. Updated the wording to say KEDA uses the KEDA operator service account IAM role by default.
- The KEDA IAM policy granted `sqs:ReceiveMessage` and `sqs:DeleteMessage` to the scaler role. KEDA's SQS scaler needs read access to queue attributes/URL; worker consumer permissions should be granted separately. Removed those permissions from the KEDA policy and clarified the prerequisite.
- The `eksctl create iamserviceaccount` command targeted an already-deployed KEDA service account but did not include `--override-existing-serviceaccounts`. Added the flag so the command can update an existing service account as documented by eksctl.
- The ScaledObject comments for `queueLength` and `awsRegion` were swapped. Reordered the comments to match the fields.
- The worker Deployment referenced `serviceAccountName: sqs-worker-sa` without defining that ServiceAccount. Added a ServiceAccount manifest with an IRSA role annotation placeholder.
- `terminationGracePeriodSeconds` was placed under the container spec, where it is not a valid Kubernetes Deployment field. Moved it to the pod template spec.

## Review Notes
The YAML snippets were parsed successfully after the edits. KEDA's `scaleOnInFlight` default is already `true` in current documentation, so the explicit setting is valid but redundant.
