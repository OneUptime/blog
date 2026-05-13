# Validation Summary: Optimize Calico CNI Plugin

## Status
validated

## Post Type
Tutorial / Guide (performance optimization techniques for Calico CNI)

## Technologies Covered
- Calico CNI plugin
- Calico IPAM (IPPool, IPAMConfiguration)
- Felix (FelixConfiguration)
- Kubernetes (kubectl, CNI configuration)
- calicoctl

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAMConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico CNI plugin configuration: https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico component logs / log levels: https://docs.tigera.io/calico/latest/operations/troubleshoot/component-logs
- Calico API source: https://github.com/projectcalico/calico/blob/master/api/pkg/apis/projectcalico/v3/felixconfig.go

## Issues Found

1. **Optimization 2 — `blockSize` immutability.** The original `calicoctl patch ippool ... blockSize:23` command would fail: `blockSize` on an existing IPPool is immutable per official docs. Rewrote the section to instead create a new IPPool with the desired `blockSize` (via `calicoctl apply`), which is the documented approach.

2. **Optimization 3 — wrong field for IPAM block pre-warming.** The original snippet patched `felixconfiguration` with `ipIpMtu:1440`, which controls IP-in-IP tunnel MTU and has nothing to do with IPAM block pre-warming. Replaced with the correct mechanism: the `IPAMConfiguration` resource (`strictAffinity`, `maxBlocksPerHost`). Removed `autoAllocateBlocks` from an intermediate draft since that field does not exist in the Calico API.

3. **Optimization 4 — invalid log level casing.** Calico CNI log levels are capitalized (`Debug`, `Info`, `Warning`, `Error`, `Fatal`); the lowercase `"warning"` is not accepted. Changed `"log_level": "warning"` to `"log_level": "Warning"` and updated the mermaid diagram labels to match. Also added an explicit list of valid levels.

4. **Optimization 5 — fabricated FelixConfiguration field.** The original patched `k8sNodeCacheTTL:"60s"`, which is not a real field in `FelixConfiguration`. Replaced with `interfaceRefreshInterval` and `routeRefreshInterval` (both valid fields, default 90s), and rewrote the surrounding explanation to accurately reflect that Felix uses watch-based caching rather than TTL.

## Review Notes
- Optimization 1 (KDD vs etcd) is accurate: KDD is the recommended datastore and uses the Kubernetes API server's cache. The CNI config fields (`datastore_type`, `nodename`) are correct.
- Optimization 6's first command (`kubectl run --dry-run=server`) does not actually exercise the CNI — it's a server-side dry run that never creates a pod. The follow-up `kubectl get events` approach is the real measurement. Left as-is since the post frames the second command as "more practically" being how to measure, but a future revision could drop the dry-run example to avoid implying it times CNI execution.
- The conclusion still says "warning rather than debug" in lowercase prose, which is fine as English but might confuse a reader copy-pasting; left unchanged since it is not a code/config token.
- The post does not pin a specific Calico version. The corrections target current Calico 3.x (KDD-based) behavior; older versions (<3.16) may differ for `IPAMConfiguration`.
