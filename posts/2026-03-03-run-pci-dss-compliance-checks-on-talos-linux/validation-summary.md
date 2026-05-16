# Validation Summary: How to Run PCI DSS Compliance Checks on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PCI DSS 4.0
- Talos Linux (machine config, sysctls, logging, secretbox encryption)
- Kubernetes (Namespaces, NetworkPolicy, RBAC, audit Policy, CronJob, Job, StorageClass, Deployment)
- Pod Security Standards (pod-security.kubernetes.io labels)
- Longhorn (encrypted storage class)
- Istio (PeerAuthentication / strict mTLS)
- Trivy Operator (Helm install, k8s scan)
- OPA Gatekeeper (K8sAllowedRepos constraint)
- kube-bench
- Kubescape
- OIDC / Kubernetes API server flags
- kubectl, talosctl

## Sources Consulted
- PCI Security Standards Council — PCI DSS v4.0 timeline and structure (https://www.pcisecuritystandards.org/)
- Talos Linux configuration reference (https://www.talos.dev/latest/reference/configuration/) — `machine.network`, `machine.sysctls`, `machine.logging`, `machine.nodeLabels`, `cluster.secretboxEncryptionSecret`
- Kubernetes documentation — NetworkPolicy spec, Pod Security Standards, RBAC, audit policy schema, kube-apiserver `--oidc-*` and `--tls-*` flags
- Longhorn StorageClass reference (https://longhorn.io/docs/) — `provisioner: driver.longhorn.io`, `numberOfReplicas`, `encrypted`
- Istio security API reference — `security.istio.io/v1beta1` PeerAuthentication (still supported alongside v1)
- Trivy / Trivy Operator chart values (https://github.com/aquasecurity/trivy-operator)
- OPA Gatekeeper Library — `K8sAllowedRepos` constraint template
- Kubescape regolibrary frameworks (https://github.com/kubescape/regolibrary/tree/master/frameworks) and Kubescape docs (https://kubescape.io/docs/frameworks-and-controls/frameworks/)
- kube-bench (https://github.com/aquasecurity/kube-bench)

## Issues Found
- **Kubescape framework name `nist` does not exist.** The original example ran `kubescape scan framework nist`, but Kubescape's regolibrary does not ship a `nist` framework. Valid built-in frameworks include `allcontrols`, `armobest`, `nsa`, `mitre`, `soc2`, `cis-v1.12.0`, etc. Replaced with `nsa` (NSA/CISA Kubernetes Hardening Guide), which is the closest standards-body framework covering PCI-relevant controls, and added a short clarifying comment noting Kubescape has no built-in PCI framework.

## Review Notes
- The PCI DSS 4.0 timeline claim ("became mandatory in 2024") is accurate at a high level: v3.2.1 was retired on 31 March 2024 and v4.0 became the only valid version; the 51 future-dated requirements became mandatory on 31 March 2025. The post does not need to be more precise to be correct.
- The ingress NetworkPolicy `allow-payment-ingress` uses two separate list items under `from:` for `namespaceSelector` and `podSelector`, which is **OR** logic (pods in `zone=dmz` namespaces OR pods labeled `app=payment-gateway` anywhere). This may be wider than intended (an AND combination would require both selectors under a single list item, as is correctly done in the DNS egress rule). Left as-is — it is valid YAML and not necessarily wrong, just worth being deliberate about.
- `apiVersion: security.istio.io/v1beta1` is still supported by current Istio releases (`security.istio.io/v1` is also available from Istio 1.22+). No change needed.
- The `kube-bench` Job omits the usual host volume mounts (e.g. `/etc`, `/var`) that some checks depend on. The official `aquasec/kube-bench` job manifest is more elaborate, but the snippet is presented illustratively, so left as-is.
- `machine.sysctls.net.ipv4.ip_forward: "1"` is required for typical CNI operation, so its presence alongside the hardening sysctls is correct.
- `cluster.secretboxEncryptionSecret` is a valid Talos field; in production this should be a base64-encoded 32-byte key, not a literal string. The placeholder `<strong-encryption-key>` is clearly illustrative.
