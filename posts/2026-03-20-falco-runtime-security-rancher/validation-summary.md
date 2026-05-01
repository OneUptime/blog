# Validation Summary: How to Set Up Falco Runtime Security on Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Falco
- Falcosidekick
- Kubernetes
- Pod Security Admission / Pod Security Standards
- Helm
- `kubectl`
- `jq`

## Sources Consulted
- Falco Kubernetes quickstart: https://falco.org/docs/getting-started/falco-kubernetes-quickstart/
- Falco Helm deployment docs: https://falco.org/docs/setup/kubernetes/
- Falco kernel event and privilege requirements: https://falco.org/docs/concepts/event-sources/kernel/
- Falco custom rules docs: https://falco.org/docs/concepts/rules/custom-ruleset/
- Falco rule control docs: https://falco.org/docs/concepts/rules/controlling-rules/
- Falco alert forwarding docs: https://falco.org/docs/concepts/outputs/forwarding/
- Rancher Pod Security Standards / Pod Security Admission docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/pod-security-standards
- Kubernetes namespace labels for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels
- Kubernetes Pod Security Admission overview: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Helm upgrade reference: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The original post did not actually show how to install or configure Falco. I replaced the generic placeholder ConfigMap and fake Helm repository/chart with the official `falcosecurity` Helm repository and a working Falco Helm install flow.
- The Step 1 audit used a nonexistent Kubernetes field, `securityContext.runAsRoot`. I replaced it with valid `jq` filters that inspect pod-level and container-level `runAsUser` and `privileged` settings.
- The original Pod Security Standards section did not account for Falco running as a privileged DaemonSet. I updated it so the `falco` namespace is labeled `privileged` while the example application namespace remains `restricted`.
- The `Deployment` manifest was invalid because it lacked a required selector and pod template labels. I added those fields and replaced the placeholder container image with a concrete workload that can run with the shown security settings.
- The alerting section used unrelated Prometheus rules rather than Falco rules. I replaced it with a valid `customRules` example and a matching `helm upgrade --install` command to load the rule through the Falco chart.
- The verification script checked generic Kubernetes hardening state rather than verifying Falco itself. I replaced it with a Falco-specific validation flow based on the upstream quickstart: confirm Falco pods are ready, trigger a known runtime event, and inspect Falco logs for the alert.

## Review Notes
- Falco upstream now recommends the Falco Operator for Kubernetes deployments, but the Helm chart remains fully supported. The post now uses Helm because that matches the original structure and is still technically valid.
- Falco’s default driver is the modern eBPF driver on supported kernels in current releases. The post does not hard-code a driver override so it stays compatible with the current default behavior.
