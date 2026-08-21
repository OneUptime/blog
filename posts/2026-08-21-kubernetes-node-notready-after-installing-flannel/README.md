# Why a Kubernetes Node Stays NotReady After Installing Flannel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, CNI, Kubeadm, Node NotReady, Troubleshooting

Description: Distinguish a CNI-related NotReady node from later pod-network failures, then trace Flannel from node CIDR allocation through the DaemonSet, subnet file, CNI configuration, kernel, and host firewall.

---

## Introduction

Installing the Flannel manifest is only one part of making a node network-ready. In the standard Kubernetes deployment, `flanneld` establishes the node-to-node data plane and writes `/run/flannel/subnet.env`. The Flannel CNI plugin then delegates pod interface creation and local IP allocation to plugins such as `bridge` and `host-local`. Kubernetes Service virtual IPs are normally implemented by `kube-proxy`, not Flannel.

That separation explains a common surprise: a `kube-flannel` pod can be Running because it uses `hostNetwork: true`, while ordinary pods still fail with `NetworkPluginNotReady`. A missing or invalid CNI configuration can keep the CRI runtime's `NetworkReady` condition false and the node NotReady. Once the runtime loads a valid configuration, later CNI execution or data-plane failures can leave the node Ready while pods fail to start or communicate. Work through the layers in order instead of reinstalling the manifest repeatedly.

## Start With the Node Condition and Events

Set the affected node explicitly so that the node-scoped commands examine the same host:

```bash
NODE=worker-1

kubectl get node "$NODE" -o wide
kubectl describe node "$NODE"
kubectl get events --all-namespaces \
  --field-selector involvedObject.kind=Node,involvedObject.name="$NODE" \
  --sort-by=.metadata.creationTimestamp

kubectl get events --all-namespaces \
  --field-selector reason=FailedCreatePodSandBox \
  --sort-by=.metadata.creationTimestamp
```

Look at the `Ready` and `NetworkUnavailable` conditions. The node-scoped events show lifecycle transitions; the second query finds pod-scoped sandbox failures across the cluster, so correlate the affected Pods with `$NODE`. Kubelet and CRI runtime logs may contain more detail. Messages such as these point to different layers:

- `cni plugin not initialized`: the CRI runtime has not loaded a usable CNI configuration; kubelet reports the runtime's `NetworkReady` status.
- `failed to find plugin "flannel" in path`: the config exists, but the runtime's binary search path does not contain the Flannel CNI plugin executable.
- `failed to load flannel 'subnet.env' file` (older releases may say `loadFlannelSubnetEnv failed`): the CNI binary ran but could not read or parse the configured subnet file; check that `flanneld` wrote a valid host file.
- `node ... pod cidr not assigned`: Kubernetes did not allocate `.spec.podCIDR`; Flannel cannot invent it in Kubernetes subnet-manager mode.

Do not assume that `NetworkUnavailable=False` proves pod networking works. Test the complete path after fixing the reported layer.

## Check the DaemonSet on the Affected Node

The current upstream manifest runs `kube-flannel-ds` in the `kube-flannel` namespace and includes two init containers: one installs the Flannel CNI plugin binary and one installs `10-flannel.conflist`.

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds
kubectl -n kube-flannel get pods -l app=flannel -o wide

FLANNEL_POD=$(kubectl -n kube-flannel get pods -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-flannel describe pod "$FLANNEL_POD"
kubectl -n kube-flannel logs "$FLANNEL_POD" -c install-cni-plugin
kubectl -n kube-flannel logs "$FLANNEL_POD" -c install-cni
kubectl -n kube-flannel logs "$FLANNEL_POD" -c kube-flannel --tail=200
```

An `Init:ImagePullBackOff` points to image retrieval or registry access; an init-container copy error points to host CNI installation. Neither is a VXLAN problem. A running main container that logs an API, RBAC, interface-selection, or Pod CIDR error has not completed Flannel's control-plane work.

Confirm that a DaemonSet pod is desired and scheduled for the node. A custom `nodeSelector`, missing toleration, unsupported OS, or admission policy can prevent that.

## Verify CIDR Agreement

Flannel's Kubernetes subnet manager consumes the Pod CIDR already stored on each Node. The cluster-wide network in `net-conf.json` must contain every node CIDR.

```bash
kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,PODCIDRS:.spec.podCIDRs[*]'

kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo
```

For the usual IPv4 manifest, a node CIDR such as `10.244.3.0/24` must fall inside the configured `10.244.0.0/16`. If every `.spec.podCIDR` is empty in a kubeadm cluster, fix control-plane node-CIDR allocation; do not create a fake `subnet.env` file.

If kubeadm was initialized with custom Pod ranges, edit a downloaded, version-pinned Flannel manifest so `Network` and, for dual-stack, `IPv6Network` match before applying it. Do not configure Kubernetes and Flannel with conflicting ranges for the same address family.

## Inspect the Host CNI Hand-Off

Run these commands on the affected node. The exact CNI directories are runtime- and distribution-specific, so confirm the CRI runtime settings rather than assuming defaults.

```bash
sudo ls -la /etc/cni/net.d
sudo sed -n '1,200p' /etc/cni/net.d/10-flannel.conflist

sudo ls -l /opt/cni/bin/flannel \
  /opt/cni/bin/bridge \
  /opt/cni/bin/host-local \
  /opt/cni/bin/loopback \
  /opt/cni/bin/portmap

sudo cat /run/flannel/subnet.env
sudo journalctl -u kubelet -b --no-pager | tail -200
```

A healthy upstream-style installation has:

1. One intended primary CNI configuration selected by the runtime.
2. A `flannel` CNI plugin executable plus the delegated CNI executables in the runtime's binary directory.
3. A current `/run/flannel/subnet.env` written after boot.
4. Network and subnet values consistent with the cluster and Node Pod CIDRs (for example, `.spec.podCIDR=10.244.3.0/24` normally corresponds to `FLANNEL_SUBNET=10.244.3.1/24`), plus the expected MTU.

Old Calico, Cilium, or bridge configuration files can win by filename order or confuse a runtime. Inventory them before changing anything. Do not delete all of `/etc/cni/net.d` on a live node.

## Check Kernel and Forwarding Prerequisites

For the default iptables-based upstream manifest, Flannel's documentation requires `br_netfilter`. Beginning with Kubernetes 1.30, kubeadm no longer checks whether `net.bridge.bridge-nf-call-iptables` or `net.bridge.bridge-nf-call-ip6tables` is set to `1`. Kubernetes networking also needs IPv4 forwarding.

```bash
lsmod | grep -w br_netfilter
sudo modprobe br_netfilter

sysctl net.ipv4.ip_forward
sysctl net.bridge.bridge-nf-call-iptables

cat <<'EOF' | sudo tee /etc/modules-load.d/flannel.conf
br_netfilter
EOF

cat <<'EOF' | sudo tee /etc/sysctl.d/90-kubernetes-networking.conf
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sudo sysctl --system
```

For dual-stack clusters, validate the IPv6 forwarding settings required by that design too. Do not enable unrelated sysctls copied from an old checklist.

With the default Linux VXLAN backend, allow the configured UDP port between node underlay addresses. The default is UDP 8472, but the backend `Port` setting can override it. Cloud security groups, host firewalls, and upstream ACLs all matter.

## Recover in the Smallest Safe Scope

After correcting the actual cause, restart only the affected Flannel pod and let the DaemonSet recreate it:

```bash
kubectl -n kube-flannel delete pod "$FLANNEL_POD"
kubectl -n kube-flannel get pods -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" --watch
```

Wait for a replacement pod with a new name to reach `1/1 Running`, then stop the watch with Ctrl+C. A DaemonSet-wide rollout check can be misleading here because deleting a pod does not create a new rollout revision and an unrelated unhealthy node can affect its result.

On Kubernetes 1.24 and later, the CRI runtime loads CNI configuration and invokes the plugin binaries, and kubelet polls the runtime's `NetworkReady` status. Restarting kubelet does not reload runtime-owned CNI state. If `NetworkReady` remains false after correcting the files, inspect the CRI runtime's status and logs and follow its documented reload procedure; restart kubelet only if kubelet itself is unhealthy.

Do not remove `cni0`, CNI IPAM data, or routes while workload pods are attached. Those are destructive recovery actions reserved for a cordoned and drained node after confirming that no CNI-attached pods remain and the state is genuinely stale.

## Prove the Data Plane, Then Services

Create test pods on two nodes and test Pod IPs before testing a Service. This keeps Flannel and kube-proxy failures separate.

```bash
kubectl run flannel-test-a --image=busybox:1.36 --restart=Never \
  --overrides='{"spec":{"nodeName":"worker-1"}}' --command -- sleep 3600
kubectl run flannel-test-b --image=busybox:1.36 --restart=Never \
  --overrides='{"spec":{"nodeName":"worker-2"}}' --command -- sleep 3600

kubectl wait --for=condition=Ready \
  pod/flannel-test-a pod/flannel-test-b --timeout=120s
kubectl get pods flannel-test-a flannel-test-b -o wide

FLANNEL_TEST_B_IP=$(kubectl get pod flannel-test-b \
  -o jsonpath='{.status.podIP}')
kubectl exec flannel-test-a -- ping -c 3 "$FLANNEL_TEST_B_IP"
```

If direct Pod IP traffic succeeds but a ClusterIP fails, examine EndpointSlices and kube-proxy (or the installed Service proxy replacement). Flannel does not program the Service VIP.

## Official Documentation

- [Flannel README and Kubernetes installation requirements](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel Kubernetes manifest architecture](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md)
- [Flannel troubleshooting guide](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md)
- [Flannel CNI plugin operation](https://github.com/flannel-io/cni-plugin)
- [Kubernetes: Creating a cluster with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/)
- [Kubernetes cluster networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)

## Conclusion

A Flannel installation that leaves a node NotReady, or leaves pod networking broken after the node becomes Ready, is usually failing at a specific hand-off: Kubernetes has not assigned a node Pod CIDR, the DaemonSet did not initialize the host, the CNI runtime cannot find its config or binaries, `flanneld` did not write `subnet.env`, or the kernel and firewall cannot forward traffic. Verify those layers in that order, repair only the failing one, and test Pod IP connectivity before moving on to kube-proxy and Services.
