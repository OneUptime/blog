# Validation Summary: How to Deploy Amazon SQS Controller with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS Controllers for Kubernetes (ACK)
- ACK SQS Controller
- Amazon SQS
- Flux CD HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes ServiceAccount, Namespace, NetworkPolicy, and CRDs
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- AWS CLI for SQS verification

## Sources Consulted
- ACK SQS tutorial: https://aws-controllers-k8s.github.io/community/docs/tutorials/sqs-example/
- ACK controller installation documentation: https://aws-controllers-k8s.github.io/community/docs/user-docs/install/
- ACK Helm values reference: https://aws-controllers-k8s.github.io/docs/guides/helm-values/
- ACK SQS Queue API reference: https://aws-controllers-k8s.github.io/community/reference/sqs/v1alpha1/queue/
- ACK SQS controller Helm chart values and templates, v1.4.3: https://github.com/aws-controllers-k8s/sqs-controller/tree/v1.4.3/helm
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux AWS integration documentation: https://fluxcd.io/flux/integrations/aws/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS CLI SQS get-queue-attributes reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/sqs/get-queue-attributes.html

## Issues Found
- The HelmRelease used `apiVersion: helm.toolkit.fluxcd.io/v1`, while current Flux HelmRelease documentation uses `helm.toolkit.fluxcd.io/v2`. Updated the manifest to `v2`.
- The ACK SQS chart version was pinned to `1.0.x`, while the current ACK SQS controller release line is `1.4.x`. Updated the example to `1.4.x`.
- The HelmRelease used `installCRDs: true` under chart values, which is not an ACK SQS chart value. Replaced it with Flux HelmRelease CRD lifecycle settings: `install.crds: CreateReplace` and `upgrade.crds: CreateReplace`.
- The Helm values used `log.enableDevelopmentLogging`, but the ACK chart schema uses `log.enable_development_logging`. Updated the field name and corrected the misleading comment.
- The metrics values used `metrics.service.enabled` and `metrics.service.port`, but the ACK chart uses `metrics.service.create` and exposes port 8080 in the template. Updated the values to `metrics.service.create: true`.
- The NetworkPolicy and log commands selected `app.kubernetes.io/name=ack-sqs-controller`, but the chart's default app name is `sqs-chart`. Added `nameOverride: ack-sqs-controller` so selectors, health checks, and release naming align with the examples.
- The queue example used `kustomize.toolkit.fluxcd.io/prune: "true"`, but Flux documents the prune annotation as `enabled` or `disabled`, and pruning is already enabled by the Kustomization. Removed the incorrect annotation.
- The troubleshooting command attempted to run `aws sts get-caller-identity` inside the ACK controller Deployment. The ACK controller image is not documented as an AWS CLI diagnostic container, so this is not a reliable verification method. Replaced it with a log check for AWS authorization errors.

## Review Notes
- The SQS Queue custom resources use valid ACK `sqs.services.k8s.aws/v1alpha1` fields for queue attributes, FIFO queues, server-side encryption, tags, and redrive policy.
- The IAM policy is intentionally broad with `Resource: "*"`, which is common for examples but should be narrowed where practical in production.
- The guide assumes EKS with IRSA. Non-EKS Kubernetes clusters need a different AWS credential mechanism for the ACK controller.
