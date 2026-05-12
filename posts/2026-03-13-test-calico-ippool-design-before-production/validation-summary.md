# Validation Summary: How to Test Calico IPPool Design Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.20+)
- Kubernetes
- calicoctl CLI
- Calico IPAM (IP Address Management)
- IPPool resource

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- calicoctl ipam command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
No technical issues found.

- `calicoctl get ippools -o yaml` — valid command form, `-o yaml` is a supported output format.
- `calicoctl ipam show --show-blocks` — valid; `--show-blocks` is a documented flag that includes per-block usage in the output.
- IPPool manifest uses correct `apiVersion: projectcalico.org/v3`, valid `kind: IPPool`, and correct spec field names (`cidr`, `blockSize`, `natOutgoing`). A `blockSize` of 26 is valid for IPv4 (also the default).
- `calicoctl ipam check -o ipam-report.json` — `-o <FILE>` is the documented flag for writing the IPAM check report to a file.
- `kubectl get pods -A -o wide` — valid kubectl syntax for showing pod IPs across namespaces.

## Review Notes
- The post is intentionally short and high-level; it does not cover several useful IPPool design dimensions (IPIP vs. VXLAN encapsulation modes, `nodeSelector`-based pool targeting, `ipipMode`/`vxlanMode` fields, per-node block reservation tuning, dual-stack considerations). These are out of scope for the post as written but would strengthen a future "design testing" follow-up.
- Calico v3.20 reached end-of-life some time ago; for new deployments, readers should prefer the latest supported minor release (3.27+ at time of review). The post's commands and resource schema remain compatible with current Calico releases.
- `blockSize` cannot be changed after a pool is created without recreating the pool — worth flagging in a future revision since the post focuses on pre-production testing of pool design.
