# Validation Summary: How to Migrate from External Load Balancer to VIP in Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Talos Linux (machine configuration, VIP feature)
- Kubernetes (control plane, kubeconfig, kubectl)
- talosctl CLI (`apply-config`, `get addresses`, `get etcdmembers`, `service`, `reboot`)
- etcd (used by Talos for VIP leader election)
- HAProxy / generic external load balancers
- Bash scripting

## Sources Consulted
- Talos Linux VIP documentation: https://www.talos.dev/v1.9/talos-guides/network/vip/ (redirects to https://docs.siderolabs.com/talos/v1.9/networking/vip/)
- Talos Linux CLI reference: https://www.talos.dev/v1.9/reference/cli/ and https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos machine configuration schema for `machine.network.interfaces[].vip.ip` and `cluster.controlPlane.endpoint`

## Issues Found
- **Inaccurate VIP failover timing claim.** The post previously stated "VIP failover is typically 3-12 seconds, comparable to most load balancers." The official Talos documentation actually states that the VIP "address reassigns almost instantly" on a graceful shutdown but can take "up to a minute" on an unexpected failure, because Talos coordinates VIP ownership through an etcd election to avoid split-brain. Updated the bullet in the "Why Migrate to VIP?" section to reflect this and dropped the inaccurate comparison to load balancers.

## Review Notes
- The VIP YAML schema (`machine.network.interfaces[].vip.ip`) matches the official Talos schema. The post uses static addressing while the Talos docs example uses DHCP — both forms are valid.
- The Layer 2 / shared subnet prerequisite and the requirement that the VIP IP not collide with DHCP are correctly stated.
- `talosctl` commands used (`apply-config --file`, `get addresses`, `get etcdmembers`, `service kubelet`, `reboot`) are all valid Talos CLI commands and follow correct syntax.
- `cluster.controlPlane.endpoint` is the correct field path for the cluster endpoint used by workers and kubelets.
- `kubectl --server=...` and `kubectl config set-cluster <name> --server=...` usage is correct.
- The rollback section's note that "VIP can stay configured without harm, even if not used as primary endpoint" is accurate — the VIP can coexist with an external endpoint.
- Note that the Talos docs caveat that the VIP "will not come alive until after you have bootstrapped Kubernetes" is not directly mentioned, but this is implicit in a migration scenario (the cluster is already bootstrapped). No change needed.
