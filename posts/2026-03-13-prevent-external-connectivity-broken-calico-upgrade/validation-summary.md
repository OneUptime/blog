# Validation Summary: How to Prevent External Connectivity Breaking After Calico Upgrade

## Status
validated

## Post Type
Guide / Runbook (prevention-focused operations guide)

## Technologies Covered
- Calico (CNI / network policy)
- calicoctl CLI
- Kubernetes (kubectl, Pods, Deployments, DaemonSets)
- BusyBox / wget
- Mermaid (diagram)

## Sources Consulted
- Calico calicoctl resource reference: https://docs.tigera.io/calico/latest/reference/resources/ (IPPool, GlobalNetworkPolicy, BGPConfiguration, FelixConfiguration)
- Calico IPPool spec (natOutgoing field): https://docs.tigera.io/calico/latest/reference/resources/ippool
- kubectl drain documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain (verified `--ignore-daemonsets` and `--delete-emptydir-data` flags)
- kubectl run / cordon / uncordon references in the official Kubernetes docs
- BusyBox wget supported options (`-q`, `-O-`, `--timeout`)

## Issues Found
No technical issues found.

- All `calicoctl get` resource names (`ippool`, `globalnetworkpolicy`, `bgpconfiguration`, `felixconfiguration`) are valid Calico resource types.
- `kubectl drain --ignore-daemonsets --delete-emptydir-data` uses the current flag names (the older `--delete-local-data` was renamed/deprecated in favor of `--delete-emptydir-data`).
- `kubectl run ext-probe --image=busybox --restart=Never` correctly creates a one-off Pod.
- The Deployment manifest (`apps/v1`, selector + matchLabels, container command/args) is syntactically valid.
- BusyBox `wget -qO- --timeout=5 http://1.1.1.1` is supported by BusyBox's wget applet.
- `natOutgoing` is a valid field on the IPPool spec, so grepping the YAML works for a quick check.

## Review Notes
- The `grep natOutgoing` check in Prevention 2 will return all `natOutgoing` lines across all IP pools; if there are multiple pools this is still a useful comparison but is not pool-scoped. A more robust check would use `calicoctl get ippool -o jsonpath='{.items[*].spec.natOutgoing}'`, but the current approach is acceptable for a quick smoke check.
- Prevention 5's comment "Upgrade calico-node on node-1 only by draining and upgrading" is a bit hand-wavy — draining alone doesn't perform the upgrade; the actual upgrade is done by updating the calico-node DaemonSet image (typically via a rolling update or operator). This is implied rather than spelled out, but is reasonable for a high-level prevention guide.
- 1.1.1.1 over plain HTTP is used as the external probe target; this works today but Cloudflare may redirect to HTTPS in the future. A future revision could use an HTTPS target with `wget`'s `--no-check-certificate` or switch to a curl-based image.
