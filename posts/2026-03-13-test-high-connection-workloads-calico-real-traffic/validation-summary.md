# Validation Summary: How to Test Calico Policies for High-Connection Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- Calico NetworkPolicy (`projectcalico.org/v3`)
- FelixConfiguration
- `calicoctl` / `kubectl`
- `conntrack` (Linux connection tracking)
- Prometheus metrics
- Mermaid (for the architecture diagram)

## Sources Consulted
- Calico FelixConfiguration reference (latest): https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico v3.26 FelixConfiguration reference: https://archive-os-3-26.netlify.app/calico/3.26/reference/resources/felixconfig
- Calico NetworkPolicy reference (v3 API): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy

## Issues Found
- **Invalid FelixConfiguration field `ipSetSize`**: The `kubectl patch felixconfiguration` example included an `ipSetSize` field alongside `maxIpsetSize`. According to the Calico v3.26 FelixConfiguration reference, `ipSetSize` is not a valid spec field — only `maxIpsetSize` (default 1048576) controls the maximum size of Felix-managed ipsets. The `ipSetSize` line was removed so the patch applies cleanly.

## Review Notes
- The Calico NetworkPolicy manifest is syntactically valid for `projectcalico.org/v3`: `selector`, `order`, `ingress`/`egress` with `source.selector` / `destination.selector`, `protocol: UDP`, `destination.ports: [53]`, and `types: [Ingress, Egress]` are all correct.
- `maxIpsetSize: 1048576` matches the documented default, so patching to this exact value is effectively a no-op. Readers tuning for genuinely large workloads would need a value above the current default — this is a content quality note rather than a correctness issue.
- The `conntrack -S` command is correct for showing connection-tracking statistics, but `calico-node-xxx` is a placeholder pod name; readers must substitute the actual pod name on their node.
- `prometheusMetricsEnabled` is documented as experimental in v3.26; enabling it in production is reasonable but worth flagging.
- The Mermaid diagram uses `\n` as a line break inside a node label. Most Mermaid renderers accept this, but `<br/>` is the more portable form. Left as-is since it is not a technical error.
