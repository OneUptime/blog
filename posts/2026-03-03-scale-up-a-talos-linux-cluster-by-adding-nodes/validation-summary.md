# Validation Summary: How to Scale Up a Talos Linux Cluster by Adding Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl` CLI, Image Factory)
- Kubernetes (`kubectl`, control plane, worker nodes)
- etcd (quorum, cluster membership)
- HAProxy (load balancing the API server)
- Terraform (Telmate `proxmox_vm_qemu` provider, `null_resource` with `local-exec`)
- Bash scripting (parallel `talosctl apply-config`)

## Sources Consulted
- Talos CLI reference v1.7: https://www.talos.dev/v1.7/reference/cli/
- Talos Image Factory boot assets: https://www.talos.dev/v1.7/talos-guides/install/boot-assets/
- Sidero Labs: Why a Kubernetes control plane should be three nodes: https://www.siderolabs.com/blog/why-should-a-kubernetes-control-plane-be-three-nodes/
- etcd FAQ on cluster size and quorum: https://etcd.io/docs/v3.5/faq/
- kubectl run / overrides reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run

## Issues Found
- **Misleading quorum claim**: The bullet "Adding a fourth control plane node to a three-node cluster improves availability but does not improve quorum" was technically inaccurate. A 4-node etcd cluster tolerates the same one failure as a 3-node cluster while raising the quorum from 2 to 3, so availability is not improved — it is arguably worse (more components, larger write quorum). Rewrote the line to: "Adding a fourth control plane node to a three-node cluster does not improve fault tolerance — both configurations still tolerate only one node failure, while quorum requirements grow from 2 to 3."

All `talosctl` commands (`get members`, `get machineconfig`, `gen config --with-secrets`, `--config-patch-worker @file`, `apply-config --insecure`, `health --wait-timeout`, `etcd members`, `etcd status`, `machineconfig patch --patch @file --output`) are correct against the v1.7 CLI reference. The Image Factory URL pattern (`https://factory.talos.dev/image/<schematic-id>/<version>/metal-amd64.iso`) is correct. Kubernetes commands (`kubectl run --overrides`, `kubectl create deployment --replicas`, `kubectl get nodes -o wide`) are valid.

## Review Notes
- The post pins Talos v1.7.0 in the Image Factory example. As of mid-2026 that is several minor versions old; readers should substitute a current Talos release for new installs.
- For `kubectl run dns-test --image=busybox --rm -it ...`, adding `--restart=Never` is a common best practice so the Pod (not a restarting one) is created and `--rm` behaves predictably. Not strictly required in modern `kubectl`, so not flagged as an error.
- The strategic-merge patch for `machine.network.interfaces` will replace the entire interfaces list. For nodes with multiple interfaces, readers may prefer a JSON 6902 patch to add a single interface without overwriting others.
- The `talosctl get machineconfig -o yaml` output wraps the spec in a resource envelope and redacts sensitive fields; readers extracting configs this way may need to unwrap `.spec` and cannot recover secrets from it.
