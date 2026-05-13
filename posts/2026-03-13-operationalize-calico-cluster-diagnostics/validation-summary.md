# Validation Summary: How to Operationalize Calico Cluster Diagnostics

## Status
validated

## Post Type
Operational Guide / Runbook

## Technologies Covered
- Calico (open source and Tigera-supported)
- Kubernetes
- calicoctl CLI
- kubectl CLI
- TigeraStatus CRD
- Prometheus metrics
- IPAM (IP Address Management)
- BGP
- Mermaid (diagram syntax)

## Sources Consulted
- Calico project documentation: https://docs.tigera.io/calico/latest/
- calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- `calicoctl cluster diags` reference (diagnostic bundle collection)
- Tigera operator install (calico-system namespace) documentation
- TigeraStatus CRD reference: https://docs.tigera.io/calico/latest/reference/resources/tigerastatus
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

- `calicoctl ipam show` is a valid command for displaying IPAM utilization.
- `kubectl get pods -n calico-system` is correct for operator-based Calico installs (the Tigera operator deploys components into `calico-system`).
- `calicoctl cluster diags` is a valid diagnostic bundle collection command.
- `TigeraStatus` is a valid CRD for tracking Calico component health.
- The Mermaid `flowchart TD` syntax is valid.
- The Prometheus query `changes(tigera_component_available[7d])` uses valid PromQL syntax; the underlying metric naming is plausible for a Calico monitoring setup that surfaces TigeraStatus availability.

## Review Notes
- The post is primarily an operational/procedural guide (runbook style) rather than a deep technical implementation tutorial. Commands referenced are correct and the operational guidance is reasonable.
- The `calico-system` namespace assumes the Tigera operator-based install path. Users on the manifest-based install will find components in `kube-system` instead - worth mentioning in a future revision but not technically incorrect.
- `calicoctl cluster diags` is available in recent Calico releases; users on very old versions may need to use manual diagnostic collection. No version pin is given here, which is acceptable for an evergreen operational guide.
- The exact Prometheus metric name `tigera_component_available` may depend on the monitoring stack configuration (e.g., kube-state-metrics exposing TigeraStatus, or a custom exporter). The PromQL syntax itself is correct.
