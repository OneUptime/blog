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
kubectl get events --all-namespaces --sort-by=.metadata.creationTimestamp \
  | grep -iE 'cni|sandbox|network'
```

On the node:

```bash
sudo journalctl -u kubelet -b --no-pager | tail -250
sudo crictl info
```

The error usually prints the exact search path, for example `[/opt/cni/bin]` or `[/usr/lib/cni]`. Treat that as evidence, but still inspect the running runtime's effective configuration.

Identify the runtime and read the kubelet's active CRI endpoint before trusting `crictl`'s client configuration:

```bash
kubectl get node "$NODE" \
  -o jsonpath='{.status.nodeInfo.containerRuntimeVersion}{"\n"}'
tr '\0' ' ' < /proc/"$(pgrep kubelet)"/cmdline
sudo crictl config --list
systemctl status containerd crio --no-pager
```

`crictl config --list` shows only the client configuration. If no endpoint is set, `crictl` may probe known sockets, so verify that it matches the kubelet's `--container-runtime-endpoint` or `containerRuntimeEndpoint`. If the process command line only identifies a kubelet configuration file, inspect that file for `containerRuntimeEndpoint`. Do not assume the Docker Engine config controls Kubernetes networking; modern kubeadm clusters use a CRI endpoint.

## Inspect the Runtime's Effective CNI Configuration

For containerd, `crictl info` queries the running CRI plugin and reports its binary and configuration paths under `cniconfig`. Compare that with the configuration the command-line tool parses:

```bash
containerd --version
sudo crictl info | jq '{status, cniconfig}'
systemctl show -p ExecStart containerd
sudo containerd config dump \
  | sed -n '/\.cni]/,/^  \[/p'
```

`containerd config dump` locally loads and merges the files selected by that CLI invocation; it does not query the running daemon. If the service's `ExecStart` uses a non-default `--config` path, pass the same path to `containerd`. Treat `crictl info` and the runtime error as live evidence, and the dump as the CLI's local parse. In containerd 2.0, a [known issue](https://github.com/containerd/containerd/issues/11747) means version 2-to-version 3 plugin migrations may not appear in `config dump`, so it can show a default CNI path instead of the configured path.

containerd 1.x configuration version 2 commonly uses:

```toml
[plugins."io.containerd.grpc.v1.cri".cni]
  bin_dir = "/opt/cni/bin"
  conf_dir = "/etc/cni/net.d"
```

containerd 2.0 configuration version 3 uses the newer plugin ID but still uses singular `bin_dir`:

```toml
[plugins.'io.containerd.cri.v1.runtime'.cni]
  bin_dir = '/opt/cni/bin'
  conf_dir = '/etc/cni/net.d'
```

Starting with containerd 2.1, `bin_dir` is deprecated in favor of the plural `bin_dirs` list:

```toml
[plugins.'io.containerd.cri.v1.runtime'.cni]
  bin_dirs = ['/opt/cni/bin']
  conf_dir = '/etc/cni/net.d'
```

Use the official configuration for the installed containerd major/minor version. Copying a 1.x table name into a 2.x version 3 config can leave the setting unused.

For CRI-O:

```bash
crio --version
sudo crio status config | awk '
  /^[[:space:]]*\[crio\.network\][[:space:]]*$/ { show=1; print; next }
  show && /^[[:space:]]*\[/ { exit }
  show { print }
'
```

`crio status config` queries the running CRI-O daemon on CRI-O 1.28 and later; older releases use the separate `crio-status config` command. Current CRI-O documents `plugin_dirs` for binaries and `network_dir` for configurations, commonly `/opt/cni/bin/` and `/etc/cni/net.d/`.

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

The following examples use the upstream-default `/opt/cni/bin` and `/etc/cni/net.d` alignment. Set both variables to the runtime's effective, aligned directories if you selected different paths.

```bash
CNI_BIN_DIR=/opt/cni/bin
CNI_CONF_DIR=/etc/cni/net.d

sudo sed -n '1,240p' "${CNI_CONF_DIR}/10-flannel.conflist"
sudo ls -la "$CNI_BIN_DIR"
sudo file "${CNI_BIN_DIR}/flannel"
sudo stat "${CNI_BIN_DIR}/flannel"
```

The upstream Flannel conflist directly references `flannel` and `portmap`. The Flannel plugin normally delegates to `bridge` with `host-local` IPAM. Kubernetes also requires loopback setup: containerd 1.x invokes the external `loopback` plugin, and containerd 2.x does so by default unless `use_internal_loopback` is enabled, while current CRI-O handles loopback internally. Check the directly referenced and delegated executables, and inspect `loopback` when the runtime invokes it:

```bash
for PLUGIN in flannel bridge host-local portmap; do
  if sudo test -x "${CNI_BIN_DIR}/${PLUGIN}"; then
    echo "present: ${PLUGIN}"
  else
    echo "missing: ${PLUGIN}"
  fi
done

if sudo test -x "${CNI_BIN_DIR}/loopback"; then
  echo "present: loopback"
else
  echo "loopback absent: verify that the runtime supplies it internally"
fi
```

Directly referenced missing plugins may be reported together during configuration validation; delegated plugins can fail later when Flannel runs, so fixing one binary may reveal another error. A binary compiled for the wrong architecture produces `exec format error`, which is different from “not found.” Root ownership and write protection matter because CNI binaries execute with runtime privileges.

## Choose One Alignment Strategy

The cleanest default is to use `/opt/cni/bin` and `/etc/cni/net.d` consistently, matching the upstream manifest and common runtime defaults. There are two valid alternatives:

1. Configure the runtime to search the directory Flannel populates.
2. Change the managed Flannel manifest, or set the Helm `flannel.cniBinDir` and `flannel.cniConfDir` values, so the hostPath sources are the runtime's established directories. Keep each init-container copy destination inside its corresponding mounted path.

Do not copy binaries into every plausible path or create a web of symlinks. That makes upgrades and security audits ambiguous.

Changing the runtime configuration requires a controlled service restart. Cordon the target node, verify the configuration syntax, keep console access, and restart only the installed CRI service:

```bash
# Add --config /actual/path before "config dump" if ExecStart uses one.
sudo sh -c 'umask 077; containerd config dump > /var/tmp/containerd-merged-before-cni.txt'

# After editing and validating /etc/containerd/config.toml for this version:
sudo systemctl restart containerd
sudo systemctl is-active containerd
sudo crictl info
```

The merged snapshot can include registry credentials, endpoints, and runtime details; the restrictive umask protects it at creation. Remove it under your retention policy. A CRI restart interrupts Kubernetes runtime operations on that node, even if existing containers continue running.

## Install the Reference CNI Plugins From a Pinned Release

The Flannel init container installs the `flannel` executable, but the node still needs the reference CNI plugins. On a connected staging host with the same architecture as the node, download the archive and published checksum. If the staging host differs, replace `$(uname -m)` in the `case` statement with the target node's `uname -m` output so that output is mapped to a release architecture; do not copy raw `x86_64` or `aarch64` into `CNI_ARCH`. This example pins a current release; use the version approved for your environment:

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
CNI_BIN_DIR=/opt/cni/bin  # Set this to the aligned runtime binary directory.
tar -tzf "$CNI_ARCHIVE"
CNI_STAGE=$(mktemp -d)
tar -xzf "$CNI_ARCHIVE" -C "$CNI_STAGE"

sudo install -d -m 0755 "$CNI_BIN_DIR"
sudo install -o root -g root -m 0755 \
  "$CNI_STAGE/bridge" \
  "$CNI_STAGE/host-local" \
  "$CNI_STAGE/loopback" \
  "$CNI_STAGE/portmap" \
  "${CNI_BIN_DIR}/"
```

This overwrites those four exact files in `CNI_BIN_DIR`. Run it only after verifying versions and on the intended node. On SELinux systems, restore the distribution-appropriate context after installation.

## Reconcile Flannel and Test

After the paths and reference binaries agree, recreate the affected Flannel pod so its init containers install the Flannel executable and configuration again:

```bash
kubectl -n kube-flannel delete pod "$FLANNEL_POD" --wait=true
kubectl -n kube-flannel wait --for=create pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" --timeout=5m
kubectl -n kube-flannel wait --for=condition=Ready pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" --timeout=5m
```

`kubectl wait --for=create` requires kubectl 1.31 or later. With an older client, poll `kubectl get` until the replacement pod appears before running the readiness wait.

Restart kubelet only if it continues to report initialization failure after the runtime is healthy and a new sandbox retry does not recover:

```bash
sudo systemctl restart kubelet
sudo journalctl -u kubelet -b --no-pager | tail -150
```

While the node remains cordoned, create a test pod explicitly bound to it with `spec.nodeName`, then verify the pod's IP. Existing pods do not prove a new CNI ADD can execute. After the new sandbox succeeds, return the node to service:

```bash
kubectl uncordon "$NODE"
```

## Official Documentation

- [Flannel README: required CNI plugin binaries](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel CNI plugin operation](https://github.com/flannel-io/cni-plugin)
- [Kubernetes network plugins and post-1.24 runtime ownership](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/)
- [containerd CRI CNI configuration](https://github.com/containerd/containerd/blob/main/docs/cri/config.md)
- [CRI-O network configuration](https://github.com/cri-o/cri-o/blob/main/docs/crio.conf.5.md#crionetwork-table)
- [CNI reference plugin releases](https://github.com/containernetworking/plugins/releases)

## Conclusion

The missing-plugin error is fixed when the directory Flannel populates is included in the CRI runtime's configured binary search path. The configuration directories must likewise align. Inspect the running containerd or CRI-O configuration, verify every executable referenced directly or through delegation, install pinned reference binaries with checksums, and test a brand-new pod sandbox. Do not revive removed kubelet flags or scatter duplicate binaries across the host.
