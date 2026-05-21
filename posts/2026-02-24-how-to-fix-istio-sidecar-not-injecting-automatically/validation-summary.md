# Validation Summary: How to Fix Istio Sidecar Not Injecting Automatically

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio sidecar injection
- Istio control plane revisions
- Kubernetes mutating admission webhooks
- Kubernetes namespaces, labels, annotations, Deployments, Jobs, and CronJobs
- kubectl and istioctl

## Sources Consulted
- Istio official documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio official documentation: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio official documentation: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio official documentation: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio official documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio official documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes official documentation: kubectl rollout restart - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes official documentation: Admission Webhook Good Practices - https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/

## Issues Found
- The post said having both `istio-injection` and `istio.io/rev` labels can make webhook behavior unpredictable. Istio documents deterministic precedence: `istio-injection` takes precedence over `istio.io/rev`. Updated the explanation accordingly.
- The pod opt-out section treated `sidecar.istio.io/inject` primarily as an annotation. Istio now documents the label as the current supported per-pod override and the annotation as deprecated. Updated the section to check and remove the label first, while noting the legacy annotation.
- The injector policy snippet listed `always_inject` as a valid policy value. Istio documents `enabled` and `disabled` as the allowed values. Removed `always_inject` and updated the follow-up sentence to refer to the current label form.

## Review Notes
The remaining commands and explanations are technically consistent with current Istio and Kubernetes documentation. Some troubleshooting commands, especially kube-apiserver audit log access, may vary by Kubernetes distribution or managed cluster provider.
