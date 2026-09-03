# kubeadm Says "API Server Is Not Healthy": Check Kubelet, cgroups, etcd, and Static-Pod Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubeadm, Kubernetes API Server, Kubelet, Cgroups, Container Runtime, etcd, Static Pods, Troubleshooting

Description: Diagnose kubeadm control-plane health timeouts from the host upward, covering kubelet, CRI and cgroups, static Pods, certificates, and etcd.

---

When `kubeadm init` or a control-plane `kubeadm join` reports that the API server is not healthy, the timeout is a summary, not a root cause. Kubeadm has written control-plane static Pod manifests and is waiting for components to answer their health endpoints. The kubelet, container runtime, kube-apiserver, or etcd may have failed earlier.

Preserve the complete kubeadm output and investigate the node before running `kubeadm reset`. Resetting removes state and evidence and is not a general-purpose retry button.

## Follow the Startup Chain

In a kubeadm control plane, startup flows roughly as follows:

```text
systemd -> kubelet -> CRI runtime -> static Pod sandbox
        -> etcd (stacked topology) -> kube-apiserver -> health check
```

CoreDNS and ordinary Pods do not need to be running for the API server static Pod to start. Kubeadm sets control-plane static Pods to `hostNetwork: true`, and stacked etcd is reached locally. A missing CNI can leave CoreDNS pending later, but it is usually not the cause of this particular health timeout.

## Start with Kubelet and the CRI

Check service state and recent logs:

```bash
sudo systemctl status kubelet --no-pager
sudo journalctl -u kubelet --since '-20 min' --no-pager
sudo sed -n '/containerRuntimeEndpoint/p' \
  /var/lib/kubelet/instance-config.yaml
```

Use the node's configured endpoint with `crictl`:

```bash
CRI_ENDPOINT=unix:///run/containerd/containerd.sock
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" info
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" pods
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" ps -a
```

The endpoint is an example; CRI-O and distribution-specific containerd installations use other paths. If kubeadm detected multiple runtimes, use the intended `--cri-socket` consistently. A missing socket, disabled CRI plugin, runtime crash, image unpack error, or full filesystem must be repaired before an API container can exist.

Also check that required images match the exact kubeadm configuration:

```bash
sudo kubeadm config images list --config=/path/to/kubeadm-config.yaml
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" images
df -h / /var/lib/kubelet /var/lib/containerd 2>/dev/null
df -i / /var/lib/kubelet /var/lib/containerd 2>/dev/null
```

Do not pull an arbitrary “latest” control-plane image. The kube-apiserver image and manifest flags must agree with the target Kubernetes version.

## Verify cgroup Agreement

On systemd-based Linux, Kubernetes recommends the `systemd` cgroup driver for both kubelet and the runtime; cgroup v2 requires it. Historically, a kubelet/runtime driver mismatch has caused unhealthy nodes and failed container startup. Current releases may support CRI-based automatic detection, so inspect the effective configuration for the installed version instead of assuming defaults.

```bash
stat -fc %T /sys/fs/cgroup
sudo grep -E '^(cgroupDriver|containerRuntimeEndpoint):' \
  /var/lib/kubelet/config.yaml
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" info
```

For containerd, compare the effective `SystemdCgroup` setting using the runtime's documented configuration for its major version. Do not paste a containerd 1.x configuration stanza into 2.x—or the reverse. If drivers must be migrated on an existing cluster, follow the Kubernetes node-by-node migration procedure rather than changing one service during a bootstrap retry.

Review kubelet logs for swap and cgroup errors too. Kubernetes supports specific swap configurations in current releases, but an unplanned swap state can still conflict with the kubelet's `failSwapOn` and memory-swap settings. Make host state match the chosen, documented kubelet configuration.

## Inspect Static Pod Containers and Logs

Kubeadm writes manifests under `/etc/kubernetes/manifests`. Confirm that the expected files exist and that no backup manifest was left in the watched directory:

```bash
sudo ls -la /etc/kubernetes/manifests
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" ps -a \
  --name kube-apiserver
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" ps -a \
  --name etcd
```

Select the newest exited container IDs and read their logs:

```bash
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" logs \
  --tail=300 <kube-apiserver-container-id>
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" logs \
  --tail=300 <etcd-container-id>
```

Typical fatal messages identify an unknown flag, unreadable mounted file, address conflict, certificate error, invalid admission or encryption configuration, or unreachable etcd endpoint. Correct that evidence-backed cause; increasing kubeadm's health-check timeout only helps when a healthy component genuinely needs more startup time.

## Prove etcd Health and TLS

For stacked etcd, kubeadm normally creates an etcd static Pod and configures kube-apiserver to use local port 2379 over mutual TLS. From the etcd container, an authenticated check commonly looks like:

```bash
sudo crictl --runtime-endpoint="$CRI_ENDPOINT" exec <etcd-container-id> \
  etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/healthcheck-client.crt \
  --key=/etc/kubernetes/pki/etcd/healthcheck-client.key \
  endpoint health
```

Use paths from the actual manifest. For external etcd, test every configured endpoint from the API server host with its configured CA and client certificate. Check quorum, endpoint status, disk latency, free space, and alarms. Never remove an etcd data directory or create a replacement cluster merely to clear this health message.

Inspect certificate metadata and listening ports without exposing keys:

```bash
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt \
  -noout -dates -issuer -subject -ext subjectAltName
sudo ss -ltnp 'sport = :6443 or sport = :2379'
date -u
```

## Recover and Recheck

After repairing the runtime, cgroup configuration, mounted file, certificate, flag, image, or etcd dependency, let kubelet reconcile the static Pods. Watch `crictl ps -a` until restart churn stops. If kubeadm must be rerun, use the same reviewed configuration and the documented failed phase; do not improvise a second cluster configuration over partially created state.

Test locally with the correct TLS name and administrative kubeconfig:

```bash
kubectl --kubeconfig=/etc/kubernetes/admin.conf \
  --server=https://127.0.0.1:6443 get --raw='/readyz?verbose'
```

Use a certified node address if `127.0.0.1` is not a SAN. Then verify the shared endpoint and, for HA, keep the repaired node out of rotation until readiness remains stable.

## Conclusion

“API Server is not healthy” marks the end of kubeadm's wait, not the beginning of the failure. Walk upward from kubelet and CRI through cgroups, static Pod logs, etcd, certificates, and the secure API port. Repair the first broken layer, retain the original kubeadm configuration, and confirm stable readiness before continuing bootstrap.

## Official References

- [Kubernetes: Troubleshooting kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/troubleshooting-kubeadm/)
- [Kubernetes: kubeadm Implementation Details](https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/)
- [Kubernetes: Debugging Nodes with crictl](https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/)
- [Kubernetes: Container Runtimes and cgroup Drivers](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)
- [Kubernetes: About cgroup v2](https://kubernetes.io/docs/concepts/architecture/cgroups/)
- [etcd: How to Check Cluster Status](https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/)
