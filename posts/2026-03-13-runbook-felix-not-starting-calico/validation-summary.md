# Validation Summary: Runbook: Felix Not Starting in Calico

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (Felix component)
- Kubernetes (kubectl, DaemonSet)
- calicoctl CLI
- iptables (legacy vs nft)
- Linux node administration (apt-get, yum, ssh)

## Sources Consulted
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico component health/readiness docs: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-health
- calicoctl resource reference (FelixConfiguration): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico installation manifests (calico-node DaemonSet in kube-system, label `k8s-app=calico-node`): https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

- Felix's default health/readiness port is **9099** with paths `/liveness` and `/readiness`; the runbook uses `http://localhost:9099/readiness` correctly.
- The calico-node DaemonSet label `k8s-app=calico-node` and namespace `kube-system` are correct for the manifest-based install (the documented default).
- `calicoctl delete felixconfiguration default` is valid syntax; Felix will recreate a default `FelixConfiguration` resource on startup when one is absent.
- `kubectl rollout restart daemonset calico-node -n kube-system` and `kubectl rollout status daemonset calico-node -n kube-system` are correct kubectl syntax.
- The Mermaid `D & E & F --> G` join syntax is valid.

## Review Notes
- For users running Calico via the Tigera Operator, the calico-node DaemonSet lives in the `calico-system` namespace rather than `kube-system`. The runbook implicitly targets the manifest-based install — this is a fair default for an on-call runbook, but operator-based clusters would need a namespace substitution.
- The iptables remediation `apt-get install -y iptables-legacy 2>/dev/null || yum install -y iptables 2>/dev/null` is a best-effort one-liner. On many Debian/Ubuntu releases the `iptables-legacy` binary is provided by the `iptables` package and selected via `update-alternatives --set iptables /usr/sbin/iptables-legacy`. Reinstalling the package alone may not switch the active backend — operators may need to follow up with `update-alternatives` if Felix continues to fail. The current command will not error misleadingly (`2>/dev/null` swallows the "package not found" message), so it is technically safe to run.
- Deleting the `default` FelixConfiguration is a destructive recovery step — any non-default Felix settings (e.g., custom `iptablesBackend`, `bpfEnabled`, MTU tweaks) will be lost. Worth noting for production environments, though it is a reasonable last-resort step in a runbook.
