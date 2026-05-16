# Validation Summary: How to Set Up Your First Talos Linux Kubernetes Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes
- talosctl
- kubectl
- KVM/libvirt
- Talos Image Factory

## Sources Consulted
- Talos Linux talosctl installation documentation: https://docs.siderolabs.com/talos/v1.10/getting-started/talosctl
- Talos Linux KVM installation documentation: https://docs.siderolabs.com/talos/v1.13/platform-specific-installations/virtualized-platforms/kvm
- Talos Linux getting started documentation: https://docs.siderolabs.com/talos/v1.9/getting-started/getting-started
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux control-plane scheduling documentation: https://docs.siderolabs.com/talos/v1.12/deploy-and-manage-workloads/workers-on-controlplane
- Kubernetes kubectl Linux installation documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose
- Kubernetes Service and NodePort documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Talos image download used a QEMU `nocloud-amd64.raw.xz` disk image and `curl -LO` against a redirecting `latest/download` URL. Updated the tutorial to download the official `metal-amd64.iso` with `curl -L -O`, matching the Talos KVM/libvirt installation flow.
- The QEMU command used user-mode networking with only Talos API port forwarding, while later steps expected the VM's node IP and Kubernetes API port to be directly reachable. Replaced the direct `qemu-system-x86_64` example with the official-style `virt-install` KVM/libvirt VM creation command using a libvirt network.
- The generated Talos machine configuration did not specify an install disk. Added `--install-disk /dev/vda` to both `talosctl gen config` examples so applying the configuration to an ISO-booted VM installs Talos to the virtio disk.
- The instruction for discovering the VM IP assumed it would only be visible on the VM screen. Updated it to also mention `virsh domifaddr talos-control-plane`, which fits the corrected KVM/libvirt workflow.

## Review Notes
The remaining Talos and Kubernetes commands are consistent with the official documentation. The example IP address `192.168.1.50` is still a placeholder and should be replaced with the actual VM address in real use.
