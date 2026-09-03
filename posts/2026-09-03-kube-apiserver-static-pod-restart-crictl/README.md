# Recover a Restarting kube-apiserver Static Pod with `crictl`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubernetes API Server, Static Pods, Crictl, CRI, Container Runtime, Kubelet, Troubleshooting

Description: Diagnose and recover a crash-looping kube-apiserver static Pod from the control-plane host using crictl, kubelet logs, and safe manifest repairs.

---

In a kubeadm cluster, kube-apiserver is normally a static Pod. The local kubelet watches `/etc/kubernetes/manifests`, asks the configured CRI runtime to run the Pod, and later creates a mirror Pod in the API. When the API server is unavailable, that mirror is inaccessible-but the real container and its logs are still visible through the runtime.

Use `crictl` to recover evidence. Do not try to recreate kube-apiserver with `crictl run`; the kubelet owns the static Pod and will reconcile it from the manifest.

## Establish the Runtime Endpoint

Run these checks on the affected control-plane host. Kubeadm records the detected CRI endpoint in `/var/lib/kubelet/instance-config.yaml` on current installations:

```bash
sudo sed -n '/containerRuntimeEndpoint/p' \
  /var/lib/kubelet/instance-config.yaml
sudo systemctl status kubelet --no-pager
sudo systemctl status containerd crio --no-pager
```

Use the endpoint actually configured on the node. For containerd, a common value is `unix:///run/containerd/containerd.sock`; CRI-O commonly uses `unix:///var/run/crio/crio.sock`. Paths can differ by distribution.

```bash
CRI_ENDPOINT=unix:///run/containerd/containerd.sock
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" info
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" pods \
  --name kube-apiserver
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" ps -a \
  --name kube-apiserver
```

If `crictl info` fails, diagnose the runtime socket and service before the Pod. Configure `/etc/crictl.yaml` only after confirming the endpoint; otherwise pass it explicitly so the incident record shows which runtime was queried. Use a `crictl` release compatible with the Kubernetes release.

## Read the Previous Container, Not Only the Current One

A fast crash loop produces many exited container IDs. Select the newest relevant ID from `crictl ps -a`, then inspect both logs and runtime state:

```bash
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" logs \
  --tail=300 <container-id>
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" inspect \
  <container-id>
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" inspectp \
  <pod-sandbox-id>
```

Keep timestamps and exit information. Logs from only the briefly running current container may be empty; an exited predecessor often contains the fatal message.

At the same time, inspect kubelet and runtime journals:

```bash
sudo journalctl -u kubelet --since '-20 min' --no-pager
sudo journalctl -u containerd --since '-20 min' --no-pager
```

Use the actual runtime unit name. Kubelet logs reveal manifest parsing failures, mount errors, sandbox creation errors, image failures, and repeated backoff decisions that may never reach kube-apiserver logs.

## Classify the Failure Before Editing

Common signatures lead to different repairs:

| Evidence | Likely area |
| --- | --- |
| Unknown flag or invalid value | Manifest arguments do not match the installed kube-apiserver image |
| YAML decode or duplicate static Pod errors | Damaged manifest or a backup file left in the watched directory |
| `no such file` or mount failure | Missing hostPath, certificate, key, audit file, or encryption config |
| `x509` error | Expired certificate, wrong CA, SAN mismatch, or clock problem |
| Cannot connect to `127.0.0.1:2379` | Local stacked etcd is down or its TLS material is invalid |
| Address already in use | Another process owns the secure port |
| OOM or signal exit | Host/container memory pressure or an external stop |
| Image pull/unpack error | Registry, image reference, disk, or runtime content problem |

Collect low-risk host evidence:

```bash
sudo ls -la /etc/kubernetes/manifests
sudo sed -n '1,240p' /etc/kubernetes/manifests/kube-apiserver.yaml
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" images
sudo ss -ltnp 'sport = :6443'
df -h / /var/lib/kubelet /var/lib/containerd 2>/dev/null
df -i / /var/lib/kubelet /var/lib/containerd 2>/dev/null
free -m
```

Manifest arguments can disclose internal topology, so sanitize them before sharing. Never print private key contents. Inspect certificate metadata safely:

```bash
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -noout -subject -issuer -dates -ext subjectAltName
```

For stacked etcd, use `crictl` in the same way to inspect the `etcd` static Pod. Confirm etcd health with its trusted CA and client certificate; do not replace its data directory or start a new member as an API server troubleshooting shortcut.

## Repair the Static Pod Safely

Before changing anything, preserve the original outside the watched directory:

```bash
sudo install -d -m 0700 /root/kubernetes-recovery
sudo cp -a /etc/kubernetes/manifests/kube-apiserver.yaml \
  /root/kubernetes-recovery/kube-apiserver.yaml.before
```

The kubelet scans the configured static Pod directory. A file such as `kube-apiserver.yaml.bak` left there can also be read and create conflicting definitions. Keep backups and temporary output elsewhere.

Make the smallest evidence-backed correction: restore a known-good flag, restore the referenced host file with its correct permissions, renew or regenerate the specific certificate through the supported kubeadm workflow, or repair the runtime/etcd dependency. For kubeadm-managed configuration, ensure local changes also match the cluster's intended `ClusterConfiguration`; otherwise a later upgrade can overwrite them.

Once the manifest becomes valid, kubelet notices the filesystem change and recreates the static Pod. A manual `crictl stop` is at most temporary because kubelet will start it again. Deleting the mirror Pod with `kubectl` would not remove the static Pod either.

## Verify Recovery from the Bottom Up

Watch runtime state until one container remains running and restart churn stops:

```bash
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" ps \
  --name kube-apiserver
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" logs \
  --tail=100 <running-container-id>
```

Then check the local secure endpoint with the correct CA, name, and credential. On a kubeadm node whose serving certificate covers the chosen local address:

```bash
kubectl --kubeconfig=/etc/kubernetes/admin.conf \
  --server=https://127.0.0.1:6443 get --raw='/readyz?verbose'
```

If `127.0.0.1` is not a certificate SAN, use a certified node name or address rather than disabling TLS verification. Finally verify through the shared endpoint, check the Node and control-plane Pods, and monitor for new restarts.

## Conclusion

When `kubectl` depends on the server that is failing, move one layer down: kubelet, CRI runtime, static Pod sandbox, and container logs. Preserve evidence, repair the manifest or dependency that explains the crash, and let kubelet recreate kube-apiserver. Confirm stable runtime state and `/readyz` before returning the node to service.

## Official References

- [Kubernetes: Debugging Nodes with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)
- [Kubernetes: Create Static Pods](https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/)
- [Kubernetes: kubeadm Implementation Details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes: Local Files and Paths Used by the Kubelet](https://kubernetes.io/docs/reference/node/kubelet-files/)
- [Kubernetes: API Health Endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
