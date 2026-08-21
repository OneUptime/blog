# Why a Kubernetes Node Stays NotReady After Installing Flannel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, CNI, Kubeadm, Node NotReady, Troubleshooting

Description: Trace a Kubernetes node that remains NotReady after Flannel installation from node CIDR allocation through the DaemonSet, subnet file, CNI configuration, kernel, and host firewall.

---

## Introduction

Installing the Flannel manifest is only one part of making a node network-ready. In the standard Kubernetes deployment, `flanneld` establishes the node-to-node data plane and writes `/run/flannel/subnet.env`. The Flannel CNI plugin then delegates pod interface creation and local IP allocation to plugins such as `bridge` and `host-local`. Kubernetes Service virtual IPs are normally implemented by `kube-proxy`, not Flannel.

That separation explains a common surprise: a `kube-flannel` pod can be Running because it uses `hostNetwork: true`, while ordinary pods still fail with `NetworkPluginNotReady`. Work through the layers in order instead of reinstalling the manifest repeatedly.

## Start With the Node Condition and Events

Set the affected node explicitly so that every command examines the same host:

```bash
NODE=worker-1

kubectl get node "$NODE" -o wide
kubectl describe node "$NODE"
kubectl get events --all-namespaces \
  --field-selector involvedObject.kind=Node,involvedObject.name="$NODE" \
  --sort-by=.lastTimestamp
```

Look at the `Ready` and `NetworkUnavailable` conditions, but also read kubelet-related events. Messages such as these point to different layers:

- `cni plugin not initialized`: kubelet or the container runtime cannot load a usable CNI configuration.
- `failed to find plugin "flannel" in path`: the config exists, but the runtime's binary search path does not contain the Flannel executable.
- `loadFlannelSubnetEnv failed`: the CNI binary ran, but `flanneld` did not produce the subnet file on the host.
- `node ... pod cidr not assigned`: Kubernetes did not allocate `.spec.podCIDR`; Flannel cannot invent it in Kubernetes subnet-manager mode.

Do not assume that `NetworkUnavailable=False` proves pod networking works. Test the complete path after fixing the reported layer.

## Check the DaemonSet on the Affected Node

The current upstream manifest runs `kube-flannel-ds` in the `kube-flannel` namespace and includes two init containers: one installs the Flannel binary and one installs `10-flannel.conflist`.

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

An `Init:ImagePullBackOff` or copy error is a host installation problem, not a VXLAN problem. A running main container that logs an API, RBAC, interface-selection, or Pod CIDR error has not completed Flannel's control-plane work.

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

If kubeadm was initialized with a custom Pod network, edit a downloaded, version-pinned Flannel manifest so its `Network` value matches before applying it. Do not use two overlapping or different cluster Pod ranges.

## Inspect the Host CNI Hand-Off

Run these commands on the affected node. The exact CNI directories are runtime and distribution configuration, so confirm the kubelet and CRI settings rather than assuming defaults.

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
2. A `flannel` executable plus the delegated CNI executables in the runtime's binary directory.
3. A current `/run/flannel/subnet.env` written after boot.
4. Matching network, node subnet, and MTU values.

Old Calico, Cilium, or bridge configuration files can win by filename order or confuse a runtime. Inventory them before changing anything. Do not delete all of `/etc/cni/net.d` on a live node.

## Check Kernel and Forwarding Prerequisites

Flannel's upstream documentation requires `br_netfilter`; this is especially important because kubeadm 1.30 and newer no longer performs the old preflight check for it. Kubernetes networking also needs IPv4 forwarding.

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
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds --timeout=180s
```

If the kubelet cached an earlier CNI initialization failure, restart kubelet on that node after the configuration and binaries are correct:

```bash
sudo systemctl restart kubelet
sudo journalctl -u kubelet -b --no-pager | tail -100
```

Do not remove `cni0`, CNI IPAM data, or routes while workload pods are attached. Those are destructive recovery actions reserved for a cordoned and drained node with verified stale state.

## Prove the Data Plane, Then Services

Create test pods on two nodes and test Pod IPs before testing a Service. This keeps Flannel and kube-proxy failures separate.

```bash
kubectl run flannel-test-a --image=busybox:1.36 --restart=Never \
  --overrides='{"spec":{"nodeName":"worker-1"}}' -- sleep 3600
kubectl run flannel-test-b --image=busybox:1.36 --restart=Never \
  --overrides='{"spec":{"nodeName":"worker-2"}}' -- sleep 3600

kubectl get pods flannel-test-a flannel-test-b -o wide
kubectl exec flannel-test-a -- ping -c 3 <flannel-test-b-pod-ip>
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

A node that stays NotReady after installing Flannel is usually failing at a specific hand-off: Kubernetes has not assigned a node Pod CIDR, the DaemonSet did not initialize the host, the CNI runtime cannot find its config or binaries, `flanneld` did not write `subnet.env`, or the kernel and firewall cannot forward traffic. Verify those layers in that order, repair only the failing one, and test Pod IP connectivity before moving on to kube-proxy and Services.
