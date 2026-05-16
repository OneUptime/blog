# Validation Summary: How to Troubleshoot etcd Not Starting on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes control plane
- TLS certificates
- Disaster recovery and snapshot restore

## Sources Consulted
- Talos Linux troubleshooting documentation: https://docs.siderolabs.com/talos/v1.12/troubleshooting/troubleshooting
- Talos Linux control plane documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/control-plane/
- Talos Linux disaster recovery documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- Talos Linux etcd maintenance documentation: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux certificate management documentation: https://docs.siderolabs.com/talos/v1.9/security/cert-management
- etcd clustering guide: https://etcd.io/docs/v3.5/op-guide/clustering/
- etcd hardware recommendations: https://etcd.io/docs/v3.7/op-guide/hardware/
- etcd configuration flags documentation: https://etcd.io/docs/v3.2/op-guide/configuration/

## Issues Found
1. **Incorrect description of etcd runtime model**: Changed the introduction from saying etcd runs as a kubelet-managed static pod to saying it runs as a Talos-managed service on control plane nodes. Talos documents etcd separately from the Kubernetes control plane static pods.

2. **Overly narrow data directory failure explanation**: Renamed the data directory section and expanded the explanation so the listed log examples are tied to stale, locked, corrupted, or old-cluster data, not only a missing directory.

3. **Undocumented directory listing command**: Changed `talosctl ls` to the documented `talosctl list` command.

4. **Reset command did not reboot the node**: Added `--reboot` to the reset command before re-applying configuration so the node comes back into maintenance mode for `talosctl apply-config --insecure`.

5. **Fragile etcdctl maintenance example**: Replaced the manual `etcdctl compact` and `defrag` commands with Talos-native `talosctl etcd alarm list`, `talosctl etcd status`, `talosctl etcd defrag`, and `talosctl etcd alarm disarm`, matching Talos etcd maintenance documentation.

6. **Incorrect certificate inspection command**: Replaced `talosctl get certificate` with the documented `talosctl get KubernetesDynamicCerts -o yaml` certificate inspection command and clarified that regenerated configuration should use the same cluster secrets.

7. **Misleading peer connectivity check**: Replaced `curl -k https://<cp>:2380` with `nc -vz <cp> 2380`, because etcd peer endpoints use TLS and a simple curl request is not a reliable reachability test. Also clarified that 2379 is the client port and 2380 is the peer port.

8. **Snapshot restore preparation was incomplete**: Updated the restore commands to wipe the `EPHEMERAL` partition and reboot the control plane nodes before running `talosctl bootstrap --recover-from`, matching the Talos disaster recovery procedure.

## Review Notes
- The post remains a valid troubleshooting guide after the corrections.
- The quorum explanation for a three-node etcd cluster is correct.
- The etcd timeout configuration keys under `cluster.etcd.extraArgs` match the Talos machine configuration reference.
- The disk latency recommendations are consistent with etcd's hardware guidance, which identifies fast disks as critical for etcd performance and stability.
