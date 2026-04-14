# Validation Summary: How to Install Dapr on Amazon EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr
- Amazon EKS (Elastic Kubernetes Service)
- AWS CLI and eksctl
- Helm 3
- IAM Roles for Service Accounts (IRSA)
- AWS SQS / SNS (pub/sub)
- Kubernetes

## Sources Consulted
- Official eksctl installation docs: https://docs.aws.amazon.com/eks/latest/eksctl/installation.html
- eksctl GitHub repository: https://github.com/eksctl-io/eksctl
- Dapr AWS SNS/SQS pub/sub component docs: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-aws-snssqs/
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr placement subchart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/values.yaml
- Dapr production deployment guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr CLI installation: https://docs.dapr.io/getting-started/install-dapr-cli/

## Issues Found

1. **eksctl installation commands outdated**: The post used `brew tap weaveworks/tap` and `brew install weaveworks/tap/eksctl`. Weaveworks shut down in early 2024 and the tap no longer resolves. Changed to `brew install eksctl` which installs from homebrew-core.

2. **Dapr component type incorrect**: The post used `pubsub.aws.sqs` which does not exist in Dapr. The correct component type is `pubsub.aws.snssqs`. Dapr's AWS pub/sub component uses SNS for publishing and SQS for subscribing. Updated the type and the section heading accordingly.

3. **Invalid metadata fields on pub/sub component**: The post specified `sqsQueueName` and `snsTopicName` metadata fields, which do not exist on the `pubsub.aws.snssqs` component. Dapr auto-creates and manages SNS topics and SQS queues based on the topic names used in publish/subscribe API calls. Removed these invalid fields, leaving only the `region` metadata (IRSA provides credentials, so no access keys are needed).

4. **Non-existent Helm value `dapr_placement.replicaCount=3`**: The Dapr Helm chart does not expose a `replicaCount` field on the placement subchart. When `global.ha.enabled=true` is set, placement is automatically configured with 3 replicas via a hardcoded conditional in the StatefulSet template. The `--set dapr_placement.replicaCount=3` flag was silently ignored. Removed this line.

5. **AWS account ID placeholders too short**: The post used `123456789` (9 digits) in IAM and SQS ARNs. AWS account IDs are always 12 digits. Updated all occurrences to `123456789012` for a realistic placeholder.

## Review Notes
- The overall structure and flow of the tutorial is sound and covers the key steps for deploying Dapr on EKS with HA and IRSA.
- The `sqs:*` IAM policy is intentionally broad for tutorial simplicity; a production deployment should use more granular permissions.
- When `global.ha.enabled=true` is set, all Dapr control plane components (sentry, operator, sidecar-injector, placement) run in HA mode. The post could mention this in a future update if desired.
