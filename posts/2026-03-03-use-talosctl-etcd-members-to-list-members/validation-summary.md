# Validation Summary: How to Use talosctl etcd members to List Members

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes control plane operations

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux API reference for etcd member fields: https://docs.siderolabs.com/talos/v1.12/reference/api
- Talos Linux troubleshooting guide for etcd checks: https://docs.siderolabs.com/talos/v1.11/troubleshooting/troubleshooting
- Talos Linux scale-down guide for reset behavior: https://docs.siderolabs.com/talos/v1.11/deploy-and-manage-workloads/scaling-down
- Talos Linux disaster recovery guide for etcd quorum and snapshots: https://docs.siderolabs.com/talos/v1.11/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- etcd runtime reconfiguration guide: https://etcd.io/docs/v3.3/op-guide/runtime-configuration/
- etcd FAQ on odd cluster sizes and member counts: https://etcd.io/docs/v3.1/faq/

## Issues Found
- The post said `talosctl etcd members` shows roles and health status. The Talos CLI/API documentation shows that member listing returns membership metadata such as ID, hostname, peer URLs, client URLs, and learner state; health/status checks are separate commands. Updated the description accordingly.
- The example output omitted the `NODE` and `LEARNER` columns commonly shown by `talosctl etcd members`. Updated the example output and column explanations.
- The post used `talosctl services`, but current Talos CLI documentation lists the command as `talosctl service`. Updated the service-check examples.
- The post implied `remove-member` is the normal removal path. Talos documentation recommends graceful reset/leave behavior for normal removal and reserves `remove-member` for broken or unavailable members. Updated the removal guidance and command comment.
- The post described quorum loss as making the API server read-only or unavailable. Talos disaster recovery documentation describes unavailable etcd as bringing down the control plane. Updated the explanation to avoid implying a reliable read-only mode.

## Review Notes
The upgrade example uses Talos installer image `v1.7.0`, which is an older illustrative version. The command syntax is still valid, but a real upgrade should use the version appropriate for the target cluster.
