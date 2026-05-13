# Validation Summary: How to Operationalize Calico Component Log Collection

## Status
validated

## Post Type
Operational runbook / guide

## Technologies Covered
- Calico (Tigera Operator-managed install)
- Kubernetes (kubectl)
- FelixConfiguration CRD
- TigeraStatus / Installation CRDs
- Bash scripting
- Elasticsearch ILM
- Loki retention
- Mermaid (flowchart)

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig (logSeverityScreen field and valid values Debug/Info/Warning/Error/Fatal)
- Tigera Operator install namespace conventions (calico-system) and the Installation / TigeraStatus CRDs: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico component pod labels (k8s-app=calico-node / calico-typha / calico-kube-controllers): https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- kubectl logs reference (flags: --tail, --prefix, -c, -l, -n): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs
- kubectl patch with --type=merge: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

- The `kubectl patch felixconfiguration default --type=merge -p '{"spec":{"logSeverityScreen":"Debug"}}'` command is correct; `logSeverityScreen` is the documented field on FelixConfiguration and `Debug`/`Info` are valid values.
- The `calico-system` namespace, the `k8s-app=calico-node|calico-typha|calico-kube-controllers` label selectors, and the `-c calico-node` container reference are consistent with a Tigera Operator install.
- `kubectl logs` flags (`--tail`, `--prefix=true`, `-l`, `-c`, `-n`) are all valid and current.
- The CRDs `tigerastatus`, `installation`, and `felixconfiguration` are real and exposed by the Tigera Operator / Calico install.
- The bash script (parameter expansion `${1:?...}`, date format, tar invocation) is syntactically correct.
- The Mermaid flowchart is syntactically valid.

## Review Notes
- The post is operator-install-centric (calico-system namespace, tigerastatus, installation CRDs). For manifest-based open-source Calico installs, components live in `kube-system` and the `tigerastatus`/`installation` resources don't exist — but the post's framing (mentioning "Tigera Support" in the escalation step) makes the operator assumption clear, so no change needed.
- The referenced `validate-calico-log-collection.sh` is from a companion post; treated as an external/operational artifact, not validated here.
