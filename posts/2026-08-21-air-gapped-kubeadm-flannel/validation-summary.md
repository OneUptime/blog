# Validation Summary: Install Flannel in an Air-Gapped kubeadm Cluster

## Status
validated

## Post Type
Technical tutorial / Air-gapped deployment guide

## Technologies Covered
- Kubernetes v1.36 and kubeadm
- Flannel v0.28.9 and the Flannel CNI plugin
- CNI reference plugins v1.9.1
- containerd, CRI-O, CRI, and crictl
- OCI image mirroring with Skopeo
- Linux kernel modules, sysctls, VXLAN, and host firewalling
- Private registries, checksums, image digests, and offline supply-chain controls

## Sources Consulted
- [Flannel v0.28.9 release](https://github.com/flannel-io/flannel/releases/tag/v0.28.9) and [versioned kube-flannel manifest](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml) - verified the release artifact, namespace, DaemonSet, labels, ConfigMap, three image fields, two exact image references, CNI install paths, and default network.
- [Flannel v0.28.9 README](https://github.com/flannel-io/flannel/blob/v0.28.9/README.md), [Kubernetes deployment documentation](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kubernetes.md), [configuration reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md), and [backend reference](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/backends.md) - verified Pod CIDR matching, `br_netfilter`, the default VXLAN backend, and Linux UDP port 8472.
- [Flannel CNI plugin v1.9.1-flannel3 documentation](https://github.com/flannel-io/cni-plugin/blob/v1.9.1-flannel3/README.md) - verified default delegation to `bridge` with `host-local` IPAM and use of `/run/flannel/subnet.env`.
- [CNI plugins v1.9.1 release](https://github.com/containernetworking/plugins/releases/tag/v1.9.1), [release workflow](https://github.com/containernetworking/plugins/blob/v1.9.1/.github/workflows/release.yaml), and [plugin documentation](https://github.com/containernetworking/plugins/blob/v1.9.1/README.md) - verified the amd64 and arm64 archive names, checksum files, archive layout, and the `bridge`, `host-local`, `loopback`, and `portmap` binaries.
- [Kubernetes v1.36.0 release](https://github.com/kubernetes/kubernetes/releases/tag/v1.36.0) and [kubeadm v1beta4 configuration reference](https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/) - verified the Kubernetes version, API version, `ClusterConfiguration`, `kubernetesVersion`, `imageRepository`, `podSubnet`, and `serviceSubnet` fields.
- [kubeadm offline and custom-image guidance](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/#without-internet-connection), [`kubeadm config images list` reference](https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_config/kubeadm_config_images_list/), and [`kubeadm config images pull` reference](https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_config/kubeadm_config_images_pull/) - verified the image-list commands, configuration flags, custom repository path behavior, and the separate CRI sandbox-image requirement.
- [Kubernetes container runtime configuration](https://kubernetes.io/docs/setup/production-environment/container-runtimes/) and [kubeadm cluster creation guide](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/) - verified IPv4 forwarding, pause-image override requirements, non-overlapping Pod networks, and post-init kubeconfig setup.
- [containerd registry host configuration](https://github.com/containerd/containerd/blob/main/docs/hosts.md#cri) and [containerd CRI configuration](https://github.com/containerd/containerd/blob/main/docs/cri/config.md) - verified `config_path`, per-registry `hosts.toml`, the different 1.x and 2.x plugin tables, and the default CNI binary/config directories.
- [containerd direct image-load guidance](https://github.com/containerd/containerd/blob/main/docs/cri/crictl.md#directly-load-a-container-image) and [cri-tools crictl documentation](https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md) - verified `crictl pull`, `crictl images`, and containerd's `k8s.io` CRI namespace.
- [Skopeo copy reference](https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md) and [Skopeo inspect reference](https://github.com/containers/skopeo/blob/main/docs/skopeo-inspect.1.md) - verified the `docker://` transport, `copy --all`, and destination manifest digest inspection.

## Issues Found
1. Setting kubeadm's private `imageRepository` and mirroring the listed `pause` image did not configure the CRI to use that image for Pod sandboxes. In an air gap, the runtime could still request its default public `registry.k8s.io/pause` reference and prevent Pods from starting. Added an explicit requirement to configure every node's CRI with the mirrored pause reference, reload or restart it as required, and preserve the runtime's exact sandbox reference when preloading images without a registry.
2. The apply procedure checked the checksum of the untouched upstream manifest but applied the edited `kube-flannel-airgap.yml`. Added checksum generation after all image and CIDR edits and changed the verification command to check the exact manifest passed to `kubectl apply`.
3. The runtime path warning checked only `/opt/cni/bin`, although the Flannel init container also writes its CNI conflist through the `/etc/cni/net.d` host path. Expanded the check to cover both the runtime's binary and configuration directories and to align both manifest `hostPath` values when a distribution uses different locations.
4. `sudo crictl pull <private-registry-image-reference>` was documentation shorthand but is not runnable shell because angle brackets are redirection operators. Replaced it with a loop over `kubeadm config images list --config kubeadm-airgap.yaml`, which pulls every exact private reference through the CRI.
5. The post ran `kubectl` immediately after `sudo kubeadm init` without establishing cluster credentials for the invoking user. Added the required instruction to configure access with `/etc/kubernetes/admin.conf` using kubeadm's emitted setup steps before applying Flannel.

## Review Notes
- Flannel v0.28.9, CNI plugins v1.9.1, and flannel-cni-plugin v1.9.1-flannel3 were the current upstream releases on 2026-08-21. The two referenced container tags resolve to multi-architecture OCI indexes for the architectures discussed in the post.
- Kubernetes v1.36.0 is a valid release and uses the current kubeadm v1beta4 API, but v1.36.4 was the latest patch in the 1.36 line on the validation date. The fixed v1.36.0 example remains reproducible; production users should select and mirror an approved current patch after reviewing release notes and advisories.
- The locally generated manifest checksums and the CNI release `.sha256` files verify content integrity against the recorded source but are not signatures. The post correctly distinguishes its local checksum from upstream authentication and recommends retaining provenance where available.
- The host commands and firewall guidance target Linux, IPv4, the default VXLAN backend, and iptables-compatible forwarding. Other backends, Windows nodes, dual-stack networks, nftables-only designs, or distribution-specific CRI paths require corresponding changes.
- The post's `master` documentation links resolve correctly as reviewed but can drift after publication; the version-pinned sources above preserve the behavior validated here.
