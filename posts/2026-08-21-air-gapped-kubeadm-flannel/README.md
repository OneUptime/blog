# Install Flannel in an Air-Gapped kubeadm Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Kubeadm, Air Gap, CNI, Supply Chain

Description: Prepare and install a reproducible Flannel deployment in an air-gapped kubeadm cluster using a pinned manifest, mirrored images, verified CNI binaries, and matching Pod CIDRs.

---

## Introduction

An air-gapped Flannel install has three independent artifact sets:

1. kubeadm control-plane images.
2. Flannel's DaemonSet images and pinned manifest.
3. Host CNI executables such as `bridge`, `host-local`, `loopback`, and `portmap`.

Mirroring only the `flannel` daemon image is not enough. The current upstream manifest also uses a Flannel CNI plugin image in an init container, while the node must already contain the standard CNI plugin bundle in the runtime's binary directory.

The examples below pin Flannel v0.28.9 and CNI plugins v1.9.1, which are current at this article's publication. Revalidate release notes, Kubernetes compatibility, architectures, digests, and security advisories when preparing a real cluster.

## Freeze Versions and Network Design

On a connected preparation host:

```bash
KUBERNETES_VERSION=v1.36.0
FLANNEL_VERSION=v0.28.9
CNI_VERSION=v1.9.1
POD_CIDR=10.244.0.0/16
```

Record these in a change-controlled bill of materials. Choose a Pod CIDR that does not overlap node, Service, LAN, VPN, or connected-cluster routes. The same value must be supplied to kubeadm and Flannel.

Use a private registry reachable from every node when possible. Configure its trusted CA and authentication in the CRI before initializing the cluster. containerd's current registry documentation uses `config_path` with per-registry `hosts.toml` files; its exact plugin table differs between containerd 1.x and 2.x.

## Download a Versioned Flannel Manifest

```bash
curl -fL \
  -o "kube-flannel-${FLANNEL_VERSION}.yml" \
  "https://github.com/flannel-io/flannel/releases/download/${FLANNEL_VERSION}/kube-flannel.yml"

sha256sum "kube-flannel-${FLANNEL_VERSION}.yml" \
  > "kube-flannel-${FLANNEL_VERSION}.yml.sha256.local"
```

The locally generated checksum protects transfer integrity after this trusted download; it is not an upstream signature. Preserve the source URL, release page, Git commit/tag verification, and any upstream provenance or checksums in the bill of materials.

Inspect every image rather than relying on a blog's list:

```bash
yq -r '.. | .image? // empty' \
  "kube-flannel-${FLANNEL_VERSION}.yml" | sort -u
```

For Flannel v0.28.9, the official manifest currently references:

```text
ghcr.io/flannel-io/flannel:v0.28.9
ghcr.io/flannel-io/flannel-cni-plugin:v1.9.1-flannel3
```

## Mirror and Pin the Flannel Images

Using an OCI-aware tool such as `skopeo`, copy all architectures required by the cluster:

```bash
AIRGAP_REGISTRY=registry.internal.example

skopeo copy --all \
  docker://ghcr.io/flannel-io/flannel:v0.28.9 \
  docker://${AIRGAP_REGISTRY}/flannel/flannel:v0.28.9

skopeo copy --all \
  docker://ghcr.io/flannel-io/flannel-cni-plugin:v1.9.1-flannel3 \
  docker://${AIRGAP_REGISTRY}/flannel/flannel-cni-plugin:v1.9.1-flannel3
```

Inspect the destination digests and record them:

```bash
skopeo inspect \
  docker://${AIRGAP_REGISTRY}/flannel/flannel:v0.28.9
skopeo inspect \
  docker://${AIRGAP_REGISTRY}/flannel/flannel-cni-plugin:v1.9.1-flannel3
```

Make a copy of the downloaded manifest named `kube-flannel-airgap.yml`. Change all three image fields in its DaemonSet-the `install-cni-plugin` init container, `install-cni` init container, and `kube-flannel` container-to the mirrored references. Prefer immutable digests after verifying multi-architecture behavior.

Verify that no public registry remains:

```bash
yq -r '.. | .image? // empty' kube-flannel-airgap.yml | sort -u
grep -nE 'ghcr\.io|docker\.io|quay\.io|registry\.k8s\.io' \
  kube-flannel-airgap.yml
```

The grep should be empty unless a reviewed public reference is intentionally retained.

If `POD_CIDR` is not `10.244.0.0/16`, edit `net-conf.json` in this local manifest now. Do not fetch or apply `releases/latest` inside the air gap.

## Download and Verify CNI Binaries Per Architecture

The upstream Flannel manifest installs only its own `flannel` executable. Download the official reference plugin archive for every node architecture:

```bash
for CNI_ARCH in amd64 arm64; do
  CNI_ARCHIVE="cni-plugins-linux-${CNI_ARCH}-${CNI_VERSION}.tgz"
  CNI_URL="https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}"

  curl -fLO "${CNI_URL}/${CNI_ARCHIVE}"
  curl -fLO "${CNI_URL}/${CNI_ARCHIVE}.sha256"
  sha256sum -c "${CNI_ARCHIVE}.sha256"
done
```

Transfer the archives, checksum files, manifest, and bill of materials through the approved boundary. Verify checksums again on the disconnected side.

On each node, select only the archive matching that node. Inspect before extraction:

```bash
sha256sum -c cni-plugins-linux-amd64-v1.9.1.tgz.sha256
tar -tzf cni-plugins-linux-amd64-v1.9.1.tgz

CNI_STAGE=$(mktemp -d)
tar -xzf cni-plugins-linux-amd64-v1.9.1.tgz -C "$CNI_STAGE"
```

Install the required binaries into the runtime's verified directory:

```bash
sudo install -d -m 0755 /opt/cni/bin

# These overwrite four exact files; back up managed older versions first.
sudo install -o root -g root -m 0755 \
  "$CNI_STAGE/bridge" \
  "$CNI_STAGE/host-local" \
  "$CNI_STAGE/loopback" \
  "$CNI_STAGE/portmap" \
  /opt/cni/bin/
```

Confirm containerd or CRI-O actually searches `/opt/cni/bin`; align the runtime and manifest if the distribution uses another path. Do not install an amd64 archive on arm64.

## Mirror kubeadm Images Separately

Kubernetes documents `kubeadm config images list` and `pull` for offline preparation. Generate the list for the exact configuration, because etcd, CoreDNS, pause, and control-plane tags depend on the Kubernetes release:

```bash
kubeadm config images list \
  --kubernetes-version "$KUBERNETES_VERSION"
```

For a private registry, put `imageRepository` and `kubernetesVersion` in the version-appropriate kubeadm `ClusterConfiguration`, then run:

```bash
kubeadm config images list --config kubeadm-airgap.yaml
```

Mirror each required upstream image to the exact name produced by the private-repository configuration. Do not assume that a simple string replacement handles CoreDNS or etcd paths correctly. Verify pulls from each disconnected node through the CRI:

```bash
sudo crictl pull <private-registry-image-reference>
sudo crictl images
```

If there is no registry, import OCI archives into the CRI's correct image namespace and retain exactly the references used by the manifests. For containerd, Kubernetes images are normally visible in the `k8s.io` namespace; verify with `crictl images`, not only `ctr images list`.

## Prepare Kernel and Runtime Prerequisites

On every node:

```bash
sudo modprobe br_netfilter
sudo modprobe vxlan

cat <<'EOF' | sudo tee /etc/modules-load.d/flannel.conf
br_netfilter
vxlan
EOF

cat <<'EOF' | sudo tee /etc/sysctl.d/90-kubernetes-networking.conf
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sudo sysctl --system
```

Allow the configured Flannel backend traffic between node addresses. For default Linux VXLAN that is UDP 8472. Use narrowly scoped host firewall, security-group, and ACL rules; an air gap does not imply a trusted flat network.

## Initialize kubeadm With the Matching CIDR

Include the same network in the kubeadm config:

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
kubernetesVersion: v1.36.0
imageRepository: registry.internal.example/kubernetes
networking:
  podSubnet: 10.244.0.0/16
  serviceSubnet: 10.96.0.0/12
```

```bash
sudo kubeadm init --config kubeadm-airgap.yaml
```

Use the kubeadm API version supported by the installed kubeadm. The `podSubnet` setting configures controller-manager node CIDR allocation; it must match Flannel's `Network` value.

## Apply Only the Reviewed Local Manifest

```bash
sha256sum -c kube-flannel-v0.28.9.yml.sha256.local

kubectl apply -f kube-flannel-airgap.yml
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds \
  --timeout=5m
kubectl -n kube-flannel get pods -l app=flannel -o wide
```

The checksum filename must correspond to the reviewed file. If you edited a copy for mirrored images, generate and approve a separate checksum for that final copy; the original manifest checksum will not match it.

On each node verify:

```bash
sudo crictl images | grep -i flannel
sudo ls -l /opt/cni/bin/{flannel,bridge,host-local,loopback,portmap}
sudo cat /run/flannel/subnet.env
```

Use an internally mirrored test image to create pods on two nodes. Test cross-node Pod IPs before ClusterIPs. `ImagePullBackOff` on a test image does not diagnose Flannel.

## Operational Checklist

- Store the exact manifests, images, digests, checksums, SBOM/provenance where available, and architecture list.
- Mirror updates deliberately; never let an air-gapped rebuild resolve `latest` differently.
- Test registry CA trust and authentication on every node.
- Ensure garbage collection does not remove the only preloaded copy if no registry exists.
- Keep rollback artifacts for the previously approved Flannel and CNI versions.
- Re-run the complete offline installation in a staging cluster before production rollout.

## Official Documentation

- [Flannel release page](https://github.com/flannel-io/flannel/releases)
- [Flannel installation and CNI binary requirements](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel Kubernetes manifest architecture](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)
- [CNI reference plugin releases and checksums](https://github.com/containernetworking/plugins/releases)
- [Kubernetes: Running kubeadm without an internet connection](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/#without-internet-connection)
- [kubeadm image pull reference](https://kubernetes.io/docs/reference/setup-tools/kubeadm/generated/kubeadm_config/kubeadm_config_images_pull/)
- [containerd registry host configuration](https://github.com/containerd/containerd/blob/main/docs/hosts.md)

## Conclusion

A reproducible air-gapped Flannel install pins and transfers every dependency: kubeadm images, both Flannel images, the reviewed manifest, and architecture-specific CNI binaries. Mirror immutable references, verify checksums on both sides of the boundary, align runtime CNI paths, initialize kubeadm and Flannel with the same non-overlapping Pod CIDR, and prove new pod creation without any public registry access.
