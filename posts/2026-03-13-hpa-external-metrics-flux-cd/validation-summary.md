# Validation Summary: How to Configure HPA Based on External Metrics with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes External Metrics API
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- KEDA ScaledObject and TriggerAuthentication resources
- AWS SQS
- Google Cloud Pub/Sub
- Azure Service Bus
- AWS CLI

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- KEDA AWS SQS scaler documentation: https://keda.sh/docs/2.19/scalers/aws-sqs/
- KEDA Google Cloud Pub/Sub scaler documentation: https://keda.sh/docs/2.19/scalers/gcp-pub-sub/
- KEDA Azure Service Bus scaler documentation: https://keda.sh/docs/2.19/scalers/azure-service-bus/
- AWS CLI send-message-batch documentation: https://docs.aws.amazon.com/cli/latest/reference/sqs/send-message-batch.html

## Issues Found
- The Flux HelmRelease for KEDA was placed in the `keda` namespace without creating that namespace first, and it referenced a HelmRepository in `flux-system` without setting `sourceRef.namespace`. Updated the HelmRelease to live in `flux-system`, install into `targetNamespace: keda`, create that namespace during install, and explicitly reference the `flux-system` HelmRepository.
- The KEDA chart version was pinned to `2.14.x`, which is no longer current. Updated the example to `2.19.x`, matching the latest KEDA documentation consulted during review.
- The AWS SQS ScaledObject used the deprecated `identityOwner` field for pod identity. Replaced it with a `TriggerAuthentication` using `podIdentity.provider: aws` and referenced it from the SQS trigger.
- The AWS SQS example comment said it scaled on visible messages only, but KEDA includes in-flight messages by default. Added `scaleOnInFlight: "false"` so the configuration matches the comment.
- The Google Pub/Sub example used deprecated `subscriptionSize`. Replaced it with `mode: "SubscriptionSize"` and `value: "100"` per the current KEDA scaler metadata.

## Review Notes
- The KEDA Google Cloud Pub/Sub scaler is marked deprecated in the latest KEDA documentation, although the corrected metadata fields are valid for that scaler. A future update could replace this section with a non-deprecated Google Cloud Monitoring based approach if KEDA documents a preferred successor.
- The Flux Kustomization example assumes the `myapp` namespace already exists or is created by manifests in `./apps/worker`; Flux does not create `targetNamespace` automatically.
- The KEDA authentication references for Google Cloud and Azure assume corresponding TriggerAuthentication resources exist elsewhere.
