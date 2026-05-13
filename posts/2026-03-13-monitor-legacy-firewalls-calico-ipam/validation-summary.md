# Validation Summary: Monitor Legacy Firewalls with Calico IPAM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.27+) IPAM
- `calicoctl` CLI
- Kubernetes (`kubectl`)
- Calico IPPool CRD (`projectcalico.org/v3`)
- Bash scripting
- Prometheus / `PrometheusRule` (`monitoring.coreos.com/v1`)
- `calico-kube-controllers` metrics endpoint

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico monitoring / metrics reference: https://docs.tigera.io/calico/latest/operations/monitor/metrics
- `calico-kube-controllers` Prometheus metrics reference (port 9094)
- Tigera Operator Installation CRD reference (for cross-checking the `encapsulation` field)
- Prometheus Operator `PrometheusRule` CRD documentation

## Issues Found

1. **Invalid IPPool spec field `encapsulation: VXLAN`** (Step 2, both IPPool YAMLs).
   - The direct `projectcalico.org/v3` `IPPool` resource does not have an `encapsulation` field. That field only exists on the Tigera Operator's `Installation` CRD at `spec.calicoNetwork.ipPools[]`.
   - On a direct `IPPool`, the correct fields are `vxlanMode` (`Always` | `CrossSubnet` | `Never`) and `ipipMode` (`Always` | `CrossSubnet` | `Never`), which are mutually exclusive when set to non-`Never`.
   - **Fix:** Replaced `encapsulation: VXLAN` with `vxlanMode: Always` and `ipipMode: Never` in both the `production-pods` and `staging-pods` IPPool definitions. Applying the original YAML would have been rejected by the API server.

2. **Non-existent Prometheus metric `calico_ipam_ippool_size_total`** (Step 5).
   - Calico does not expose any metric by that name. The real metric exposed by `calico-kube-controllers` on port 9094 is `ipam_ippool_size` (no `calico_` prefix, no `_total` suffix).
   - **Fix:** Updated the PromQL expression to `changes(ipam_ippool_size[1h]) > 0` and added a comment noting the metric is exposed by `calico-kube-controllers` on port 9094 so readers know where to scrape it from.

## Review Notes

- The `nodeSelector` syntax (`"environment == 'production'"`) is valid Calico selector syntax.
- `blockSize: 26` is within Calico's valid range for IPv4 (20–32).
- The `firewall.org/...` annotations are illustrative — any annotation key is fine; readers should substitute their own.
- The connectivity tests in Step 4 use `kubectl run ... --rm -it` with `curlimages/curl`, which is correct usage.
- Note for future readers: the `ipam_ippool_size` metric tracks the configured CIDR size of a pool (i.e., available addresses), not arbitrary spec changes; CIDR changes that keep the same size (unlikely in practice) would not trigger this alert. A more robust drift detector would combine this metric with the Bash audit script from Step 3 or use Kubernetes audit logs / a CRD-aware tool like `kube-state-metrics` with custom CR support.
- Prerequisites correctly specify Calico v3.27+ and matching `calicoctl` version.
