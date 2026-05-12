# Validation Summary: How to Test Calico Egress Gateway Policies with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (kubectl)
- calicoctl CLI
- Calico GlobalNetworkPolicy
- Felix Prometheus metrics
- Mermaid diagrams

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Calico Prometheus metrics (Felix): https://docs.tigera.io/calico/latest/operations/monitor/metrics/
- Calico installation/version compatibility: https://docs.tigera.io/calico/latest/getting-started/

## Issues Found
- The Verification section used `grep felix_denied` to inspect policy hit/denial counters on the Felix Prometheus endpoint. Felix actually exports denied traffic metrics under the `calico_denied_*` prefix (e.g., `calico_denied_packets`, `calico_denied_bytes`); a grep for `felix_denied` would return no results. Updated the grep pattern to `calico_denied` so the command surfaces the correct metrics.

## Review Notes
- The post title and intro use "Egress Gateway Policies" loosely. Calico does have a dedicated `EgressGatewayPolicy` resource (in Calico Enterprise/Cloud) for egress gateway selection, but the example here is a generic `GlobalNetworkPolicy` with `egress` rules — which is valid for controlling outbound traffic in open-source Calico. The YAML itself is syntactically and semantically correct for `projectcalico.org/v3`.
- The default Felix Prometheus port is 9091; this matches the post.
- `/var/log/calico/felix.log` is a plausible location when Felix is configured with file logging; many cluster installs log to stdout/stderr and aggregate via the container runtime instead. Readers should adapt the `tail -f` step to their logging setup.
- The Mermaid `\n` line break in node labels renders correctly in current Mermaid versions; no change needed.
- Calico v3.26+ is a valid prerequisite; the API fields used (`order`, `selector`, `ingress`, `egress`, `types`) are stable across that range.
