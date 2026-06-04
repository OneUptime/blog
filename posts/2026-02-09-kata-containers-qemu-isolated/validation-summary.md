# Validation Summary: How to Set Up Kata Containers with QEMU Hypervisor for Hardware-Isolated K8s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- RuntimeClass
- containerd CRI configuration
- Kata Containers
- QEMU
- KVM and nested virtualization
- virtio-fs
- Prometheus metrics through kata-monitor

## Sources Consulted
- Kata Containers main README and hardware requirements: https://github.com/kata-containers/kata-containers
- Kata Containers installation documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/installation.md
- Kata Containers containerd integration documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/how-to/containerd-kata.md
- Kata Containers Kubernetes with containerd documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/how-to/how-to-use-k8s-with-containerd-and-kata.md
- Kata Containers QEMU configuration template: https://github.com/kata-containers/kata-containers/blob/main/src/runtime/config/configuration-qemu.toml.in
- Kata Containers hypervisors documentation: https://github.com/kata-containers/kata-containers/blob/main/docs/hypervisors.md
- Kata monitor documentation: https://github.com/kata-containers/kata-containers/blob/main/src/runtime/cmd/kata-monitor/README.md
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/
- Kubernetes RuntimeClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/node/runtime-class-v1/

## Issues Found
- The install instructions used older OBS repository and Kata 1.x package names (`kata-proxy`, `kata-shim`) while the rest of the post used shimv2/containerd concepts. Replaced this with the current official Kata Deploy Helm chart workflow for Kubernetes.
- The introduction implied QEMU provides hardware isolation without specialized hardware. Updated this to state that QEMU with KVM acceleration needs CPU virtualization support.
- The KVM check claimed the setup would fall back to QEMU without acceleration. Updated it to direct users to bare metal or nested virtualization and added `kata-runtime check --verbose`.
- Several Kata QEMU configuration keys were invalid or stale for current Kata configuration, including `enable_kvm`, `initrd` in the shown image-based config, `enable_vhost_net`, `use_vsock`, `container_pipe_size`, `enable_cpu_pinning`, `hugepage_size`, and `machine_accelerators = "kvm,nvdimm"`. Removed or replaced them with current keys such as `image`, `disable_vhost_net`, and `enable_vcpus_pinning`.
- The containerd configuration omitted Kata's recommended annotation pass-through and `privileged_without_host_devices` setting. Added those to the Kata runtime entries.
- The tenant pod included an invalid and unsafe-looking per-pod annotation intended to enable all Kata hypervisor annotations. Removed it.
- Monitoring commands referenced libvirt (`virsh`) and older runtime command patterns that are not appropriate for Kata's containerd shimv2 path. Replaced them with containerd, journald, QEMU process, and `kata-monitor` examples.
- Troubleshooting used the old `kata-runtime kata-check` command. Updated it to `kata-runtime check`.
- The nested virtualization reload example only showed the Intel module after also configuring AMD. Added the AMD reload and verification commands.

## Review Notes
The post is now aligned with current Kata 3.x Kubernetes installation guidance. Some paths, such as QEMU, guest image, kernel, and `virtiofsd`, can still vary by Linux distribution or by Kata Deploy versus distro packages, so operators should confirm paths against the installed default configuration on their nodes.
