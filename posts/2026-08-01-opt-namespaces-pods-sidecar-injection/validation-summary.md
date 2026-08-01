# Validation Summary: How to Opt Specific Namespaces and Pods In or Out of Sidecar Injection

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- Kubernetes admission webhooks
- `kubectl`
- Istio sidecar injection
- Kubernetes labels and selectors
- Istio control-plane revisions and revision labels

## Sources Consulted

- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes: Labels and Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: kubectl label](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/)
- [Kubernetes: kubectl rollout restart](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/)
- [Kubernetes: kubectl rollout status](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [Istio: Installing the Sidecar](https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/)
- [Istio: Canary Upgrades](https://istio.io/latest/docs/setup/upgrade/canary/)
- [Istio: Sidecar Injection Problems](https://istio.io/latest/docs/ops/common-problems/injection/)
- [Istio: Verifying Sidecar Injection with istioctl check-inject](https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/)
- Local `kubectl v1.34.1` client help for `kubectl label` and `kubectl get`

## Issues Found

- The explanation of Kubernetes `objectSelector` guidance incorrectly said object selectors are appropriate only when users cannot bypass policy by choosing labels. Kubernetes instead warns that users can bypass a label-selected webhook and therefore recommends `objectSelector` only for opt-in webhooks. The sentence was corrected to match the official guidance while retaining the post's distinction between user-controlled sidecar membership and separately enforced security invariants.

## Review Notes

- Kubernetes `matchConditions` for admission webhooks are stable starting with Kubernetes v1.30; operators on older clusters must check the feature's availability for their installed version.
- The Istio documentation checked was the current Istio 1.30 documentation. The post appropriately tells readers to consult the documentation for their installed Istio release because injection labels, revision tags, and diagnostic commands are version-sensitive.
- The example image digest is intentionally marked `REPLACE_ME` and must be replaced with a real image digest before deployment.
