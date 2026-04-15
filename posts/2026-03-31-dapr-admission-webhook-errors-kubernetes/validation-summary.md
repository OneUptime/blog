# Validation Summary: How to Fix Dapr Admission Webhook Errors on Kubernetes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar injector, admission webhook)
- Kubernetes (MutatingAdmissionWebhook, MutatingWebhookConfiguration, kubectl)
- TLS / CA certificate management
- OpenSSL

## Sources Consulted
- Dapr sidecar injector webhook config Helm template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sidecar_injector/templates/dapr_sidecar_injector_webhook_config.yaml
- Dapr annotations and arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Sidecar Injector service overview: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Dapr common troubleshooting issues: https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr injector annotations source code: https://github.com/dapr/dapr/blob/master/pkg/injector/annotations/annotations.go
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes MutatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#mutatingwebhookconfiguration-v1-admissionregistration-k8s-io

## Issues Found

### 1. Fabricated bypass label `dapr.io/sidecar-injector-skip: "true"`
- **What was wrong:** The "Bypassing the Webhook for Debugging" section suggested using a label `dapr.io/sidecar-injector-skip: "true"` to skip sidecar injection. This label does not exist in any version of Dapr. It is not defined in the Dapr annotations source code, not documented in the official annotations reference, and not referenced anywhere in the Dapr project.
- **What was changed:** Replaced the fabricated label with the correct approach: setting the annotation `dapr.io/enabled: "false"` on the pod. This is the standard, documented way to explicitly disable sidecar injection for a specific pod.
- **Why:** Using a nonexistent label would have no effect, leaving readers confused when injection still occurs or webhook errors persist.

### 2. Fragile `--type merge` in kubectl patch command
- **What was wrong:** The kubectl patch command used `--type merge` (JSON Merge Patch, RFC 7386), which replaces arrays entirely rather than merging them. This would replace the entire `webhooks` array with a single-element array containing only `name` and `failurePolicy` fields, stripping all other webhook configuration (clientConfig, rules, admissionReviewVersions, etc.) and breaking the webhook.
- **What was changed:** Changed to `--type json` with a proper JSON Patch operation (`[{"op":"replace","path":"/webhooks/0/failurePolicy","value":"Ignore"}]`) that surgically updates only the failurePolicy field.
- **Why:** The original command would silently destroy the webhook configuration, making the debugging situation worse rather than better.

## Review Notes
- The caBundle auto-update behavior described in the post is accurate for Dapr >= 1.12. In earlier versions (pre-1.12), there were known issues with caBundle synchronization (GitHub issue #1621). The post does not specify a version, which is acceptable for a troubleshooting guide targeting current Dapr installations.
- All kubectl commands are syntactically correct and use proper flags and resource names.
- The error messages shown are realistic and representative of actual Dapr webhook failures.
- The namespace label example `dapr-injection=enabled` is not a Dapr default but is presented correctly as a conditional requirement ("depending on webhook namespaceSelector"), which is accurate for custom configurations.
