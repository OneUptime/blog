# Validation Summary: How to Operationalize Calico on Kubernetes Upgrades

## Status
validated

## Post Type
Operational guide / runbook with embedded shell scripts and a Mermaid Gantt chart.

## Technologies Covered
- Calico (Tigera Operator install)
- Kubernetes (`kubectl`)
- `calicoctl`
- Bash scripting
- Mermaid (Gantt diagram)

## Sources Consulted
- Calico documentation: Upgrading Calico (https://docs.tigera.io/calico/latest/operations/upgrading/)
- Tigera Operator status / TigeraStatus CRD (https://docs.tigera.io/calico/latest/reference/installation/api)
- `calicoctl get ippools` reference (https://docs.tigera.io/calico/latest/reference/calicoctl/get)
- kubectl jsonpath reference (https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- Mermaid Gantt syntax (https://mermaid.js.org/syntax/gantt.html)

## Issues Found
No technical issues found.

- `kubectl get tigerastatus` is the correct command to inspect Calico/Tigera Operator install health.
- `calico-system` is the correct namespace for operator-managed Calico components.
- The jsonpath expression for summing `restartCount` across container statuses is syntactically valid and produces the expected output.
- `kubectl get nodes --no-headers | grep -v " Ready"` correctly identifies NotReady nodes because the leading space anchors the match to the STATUS column and "NotReady" does not contain " Ready" with a leading space.
- `calicoctl get ippools` is correct syntax.
- The Mermaid `gantt` block uses valid `dateFormat`, `section`, and task-duration syntax.
- The heredoc in the upgrade-log snippet is syntactically correct.

## Review Notes
- The post is more operational/process-oriented than deeply technical; the embedded commands are minimal but accurate.
- `tigerastatus` requires the Tigera Operator install path; manifest-based installs would use different health checks. The post implicitly assumes operator-based installs (consistent with the `calico-system` namespace reference), which is reasonable but worth noting.
- The `RESTARTS > 10` threshold is a heuristic; real environments may want to scope by node count or time window. Not incorrect, just a judgment call.
