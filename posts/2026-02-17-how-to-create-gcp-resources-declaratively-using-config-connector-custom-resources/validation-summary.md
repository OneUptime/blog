# Validation Summary: How to Create GCP Resources Declaratively

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Config Connector
- Kubernetes custom resources and kubectl
- Google Cloud Storage
- Compute Engine VPC networks and subnetworks
- Pub/Sub topics and subscriptions
- Google Cloud IAM
- Kustomize

## Sources Consulted
- Config Connector overview: https://docs.cloud.google.com/config-connector/docs/overview
- Config Connector annotations reference: https://docs.cloud.google.com/config-connector/docs/reference/annotations
- Config Connector ignore unspecified fields: https://docs.cloud.google.com/config-connector/docs/concepts/ignore-unspecified-fields
- Config Connector resource references: https://docs.cloud.google.com/config-connector/docs/how-to/creating-resource-references
- StorageBucket resource reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/storage/storagebucket
- ComputeNetwork resource reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/compute/computenetwork
- ComputeSubnetwork resource reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/compute/computesubnetwork
- PubSubTopic resource reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubtopic
- PubSubSubscription resource reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubsubscription
- IAMServiceAccount resource reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/iam/iamserviceaccount
- IAMPolicyMember resource reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/iam/iampolicymember
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization

## Issues Found
- The `cnrm.cloud.google.com/state-into-spec: "absent"` comment said it prevents Config Connector from managing an existing resource. Updated it to say that it prevents Config Connector from populating unspecified fields into `spec`, which matches the Config Connector documentation.
- The Cloud Storage bucket example described `uniformBucketLevelAccess: true` as preventing public access. Uniform bucket-level access enables IAM-only access control, but public access prevention is controlled by `publicAccessPrevention`. Added `publicAccessPrevention: enforced` and adjusted the comment.
- The Pub/Sub subscription configured a dead-letter topic that was not created and did not include the required Pub/Sub service agent IAM permissions. Removed the incomplete dead-letter policy from the focused subscription example.
- The external `networkRef` example used a partial Compute Network path. Updated it to the full Compute Network selfLink format accepted by the `ComputeSubnetwork.networkRef.external` field.

## Review Notes
The reviewed Config Connector API groups, kinds, field names, and kubectl/Kustomize commands are current in the official documentation consulted on 2026-05-28. External references are documented as a beta feature. A production Pub/Sub dead-letter walkthrough could add the supporting dead-letter topic and service agent IAM details.
