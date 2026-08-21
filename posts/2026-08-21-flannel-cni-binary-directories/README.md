# Fix a Missing Flannel CNI Binary

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, CNI, Containerd, CRI-O, Troubleshooting

Description: Fix a missing Flannel CNI executable by identifying the container runtime's real CNI paths and aligning the Flannel DaemonSet hostPath and reference plugin installation.

---

## Introduction

`failed to find plugin "flannel" in path [...]` means the container runtime loaded a CNI configuration containing `"type": "flannel"`, searched its configured binary directories, and did not find an executable named `flannel`. This is a host installation mismatch, not a VXLAN reachability problem.

Since Kubernetes 1.24, CNI management is no longer a kubelet command-line responsibility. The CRI runtime-commonly containerd or CRI-O-loads the CNI configuration and executes plugins. Fix the path used by that runtime rather than adding obsolete kubelet flags.

## Read the Full Error and Runtime Path

```bash
NODE=worker-1

kubectl describe node "$NODE"
kubectl get events --all-namespaces --sort-by=.lastTimestamp \
  | grep -iE 'cni|sandbox|network'
```

On the node:

```bash
sudo journalctl -u kubelet -b --no-pager | tail -250
sudo crictl info
```

The error usually prints the exact search path, for example `[/opt/cni/bin]` or `[/usr/lib/cni]`. Treat that as evidence, but still inspect the running runtime's effective configuration.

Identify the CRI endpoint and service:

```bash
sudo crictl config --list
systemctl status containerd crio --no-pager
```

Do not assume the Docker Engine config controls Kubernetes networking; modern kubeadm clusters use a CRI endpoint.

## Inspect the Runtime's Effective CNI Configuration

For containerd:

```bash
containerd --version
sudo containerd config dump \
  | sed -n '/\.cni]/,/^  \[/p'
```

containerd 1.x configuration version 2 commonly uses:

```toml
[plugins."io.containerd.grpc.v1.cri".cni]
  bin_dir = "/opt/cni/bin"
  conf_dir = "/etc/cni/net.d"
```

containerd 2.x configuration version 3 uses the newer plugin ID and, from containerd 2.1, prefers `bin_dirs`:

```toml
[plugins.'io.containerd.cri.v1.runtime'.cni]
  bin_dirs = ['/opt/cni/bin']
  conf_dir = '/etc/cni/net.d'
```

Use the official configuration for the installed containerd major/minor version. Copying a 1.x table name into a 2.x version 3 config can leave the setting unused.

For CRI-O:

```bash
crio --version
sudo crio config | sed -n '/\[crio.network\]/,/^\[/p'
```

Current CRI-O documents `plugin_dirs` for binaries and `network_dir` for configurations, commonly `/opt/cni/bin/` and `/etc/cni/net.d/`.

## Compare the Flannel DaemonSet HostPaths

The current upstream manifest mounts the host's `/opt/cni/bin` into the `install-cni-plugin` init container and copies `/flannel` there. It mounts `/etc/cni/net.d` into a second init container that writes `10-flannel.conflist`.

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds -o yaml \
  | sed -n '/initContainers:/,/containers:/p'

kubectl -n kube-flannel get daemonset kube-flannel-ds -o json \
  | jq '.spec.template.spec.volumes'
```

Inspect init-container results for the affected node:

```bash
FLANNEL_POD=$(kubectl -n kube-flannel get pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-flannel describe pod "$FLANNEL_POD"
kubectl -n kube-flannel logs "$FLANNEL_POD" -c install-cni-plugin
kubectl -n kube-flannel logs "$FLANNEL_POD" -c install-cni
```

If the init container copied successfully to `/opt/cni/bin` but the runtime searches `/usr/lib/cni`, the two components are writing and reading different host directories.

## Inventory Every Executable the Conflist References

```bash
sudo sed -n '1,240p' /etc/cni/net.d/10-flannel.conflist
sudo ls -la /opt/cni/bin
sudo file /opt/cni/bin/flannel
sudo stat /opt/cni/bin/flannel
```

The upstream Flannel conflist references `flannel` and `portmap`. The Flannel plugin normally delegates to `bridge` with `host-local` IPAM, and Kubernetes also needs loopback setup. Check at least:

```bash
for PLUGIN in flannel bridge host-local loopback portmap; do
  if sudo test -x "/opt/cni/bin/${PLUGIN}"; then
    echo "present: ${PLUGIN}"
  else
    echo "missing: ${PLUGIN}"
  fi
done
```

The first missing executable determines the next error. A binary compiled for the wrong architecture produces `exec format error`, which is different from “not found.” Root ownership and write protection matter because CNI binaries execute with runtime privileges.

## Choose One Alignment Strategy

The cleanest default is to use `/opt/cni/bin` and `/etc/cni/net.d` consistently, matching the upstream manifest and common runtime defaults. There are two valid alternatives:

1. Configure the runtime to search the directory Flannel populates.
2. Change the managed Flannel manifest or Helm values so its hostPath and init-container destination match the runtime's established directories.

Do not copy binaries into every plausible path or create a web of symlinks. That makes upgrades and security audits ambiguous.

Changing the runtime configuration requires a controlled service restart. Cordon the target node, verify the configuration syntax, keep console access, and restart only the installed CRI service:

```bash
sudo containerd config dump >/var/tmp/containerd-effective-before-cni.txt

# After editing and validating /etc/containerd/config.toml for this version:
sudo systemctl restart containerd
sudo systemctl is-active containerd
sudo crictl info
```

The snapshot can include registry endpoints and runtime details; protect it and remove it under your retention policy. A CRI restart interrupts Kubernetes runtime operations on that node, even if existing containers continue running.

## Install the Reference CNI Plugins From a Pinned Release

The Flannel init container installs the `flannel` executable, but the node still needs the reference CNI plugins. On a connected staging host, download the archive and published checksum for the required architecture. This example pins a current release; use the version approved for your environment:

```bash
CNI_VERSION=v1.9.1
case "$(uname -m)" in
  x86_64) CNI_ARCH=amd64 ;;
  aarch64) CNI_ARCH=arm64 ;;
  armv7l) CNI_ARCH=arm ;;
  *) echo "Map and verify this architecture explicitly"; exit 1 ;;
esac

CNI_ARCHIVE="cni-plugins-linux-${CNI_ARCH}-${CNI_VERSION}.tgz"
CNI_URL="https://github.com/containernetworking/plugins/releases/download/${CNI_VERSION}"

curl -fLO "${CNI_URL}/${CNI_ARCHIVE}"
curl -fLO "${CNI_URL}/${CNI_ARCHIVE}.sha256"
sha256sum -c "${CNI_ARCHIVE}.sha256"
```

List the archive before installing. If the destination already contains managed binaries, back them up and coordinate the upgrade:

```bash
tar -tzf "$CNI_ARCHIVE"
CNI_STAGE=$(mktemp -d)
tar -xzf "$CNI_ARCHIVE" -C "$CNI_STAGE"

sudo install -d -m 0755 /opt/cni/bin
sudo install -o root -g root -m 0755 \
  "$CNI_STAGE/bridge" \
  "$CNI_STAGE/host-local" \
  "$CNI_STAGE/loopback" \
  "$CNI_STAGE/portmap" \
  /opt/cni/bin/
```

This overwrites those four exact destination files. Run it only after verifying versions and on the intended node. On SELinux systems, restore the distribution-appropriate context after installation.

## Reconcile Flannel and Test

After the paths and reference binaries agree, recreate the affected Flannel pod so its init containers install the Flannel executable and configuration again:

```bash
kubectl -n kube-flannel delete pod "$FLANNEL_POD"
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds \
  --timeout=5m
```

Restart kubelet only if it continues to report cached initialization failure after the runtime is healthy:

```bash
sudo systemctl restart kubelet
sudo journalctl -u kubelet -b --no-pager | tail -150
```

Create a new pod sandbox on the repaired node and verify its IP. Existing pods do not prove a new CNI ADD can execute.

## Official Documentation

- [Flannel README: required CNI plugin binaries](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel CNI plugin operation](https://github.com/flannel-io/cni-plugin)
- [Kubernetes network plugins and post-1.24 runtime ownership](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
- [containerd CRI CNI configuration](https://github.com/containerd/containerd/blob/main/docs/cri/config.md)
- [CRI-O network configuration](https://github.com/cri-o/cri-o/blob/main/docs/crio.conf.5.md#crionetwork-table)
- [CNI reference plugin releases](https://github.com/containernetworking/plugins/releases)

## Conclusion

The missing-plugin error is fixed when the CRI runtime's configured binary directories and Flannel's host installation directory are identical. Inspect the effective containerd or CRI-O configuration, verify every executable referenced directly or through delegation, install pinned reference binaries with checksums, and test a brand-new pod sandbox. Do not revive removed kubelet flags or scatter duplicate binaries across the host.
