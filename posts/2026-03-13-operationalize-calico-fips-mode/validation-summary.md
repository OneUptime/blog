# Validation Summary: How to Operationalize Calico FIPS Mode

## Status
validated

## Post Type
Operational guide / runbook collection (covers cadence, upgrade runbook, incident response, and evidence collection scripts)

## Technologies Covered
- Calico (Tigera operator) FIPS mode
- Kubernetes (kubectl, Installation/ImageSet/TigeraStatus CRDs in operator.tigera.io/v1)
- Flux CD (flux reconcile kustomization)
- Mermaid (gantt chart)
- Bash / openssl for certificate inspection
- kube-apiserver audit logging

## Sources Consulted
- Calico FIPS mode docs — https://docs.tigera.io/calico/latest/operations/fips
- Installation API reference (operator.tigera.io/v1) — https://docs.tigera.io/calico/latest/reference/installation/api
- tigera/operator installation_types.go — https://github.com/tigera/operator/blob/master/api/v1/installation_types.go
- TLS certificates for Typha and Node — https://docs.tigera.io/calico-enterprise/latest/operations/comms/typha-node-tls
- Manage TLS certificates used by Calico — https://docs.tigera.io/calico/latest/operations/certificate-management
- ImageSet (image options) — https://docs.tigera.io/calico/latest/operations/image-options/imageset
- TigeraStatus reference — https://docs.tigera.io/calico-enterprise/latest/reference/installation/tigerastatus
- flux reconcile kustomization — https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Calico v3.28.0 release — https://github.com/projectcalico/calico/releases/tag/v3.28.0
- Kubernetes Auditing — https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- kubectl command reference — https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **Invalid `kubectl audit logs` command** — The runbook step "Check who changed it: kubectl audit logs" referenced a kubectl subcommand that does not exist. Kubernetes auditing is configured on the kube-apiserver and audit events are read out-of-band from the audit log file/backend. Fixed by replacing with: "review kube-apiserver audit logs (filter by objectRef.name=default and resource=installations)".

2. **Incorrect Tigera TLS secret names** — The evidence-collection script iterated over `calico-typha-tls` and `calico-node-tls`. The Tigera operator's documented secret names are `typha-certs` and `node-certs`. Replaced with the correct names so the openssl-based cert inspection actually finds the secrets.

## Review Notes
- `spec.fipsMode: Enabled` on the Installation CR, the `kubectl patch` syntax, `kubectl get tigerastatus`, `kubectl get imageset`, and `flux reconcile kustomization` are all verified correct.
- Calico v3.28.0 used in the example commands is a real upstream release (June 2024); readers operating on newer versions (v3.29+, v3.30+, v3.31+) should substitute the appropriate version tag and confirm FIPS-enabled image availability for that release.
- The TLS secret namespace `calico-system` is correct for operator-managed Calico in current versions; if a cluster uses BYO certificates or a different cert-management approach, the secret names and namespaces may differ — the script may need to be adapted.
- The Mermaid gantt syntax is valid and renders correctly.
- The bash evidence-collection script uses safe quoting and standard kubectl/openssl idioms; no shell-injection concerns given hardcoded inputs.
