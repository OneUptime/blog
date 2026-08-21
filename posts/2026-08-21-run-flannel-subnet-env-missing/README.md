# Why `/run/flannel/subnet.env` Is Missing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, CNI, Subnet Configuration, Container Runtime, Troubleshooting

Description: Trace why Flannel's subnet.env file is absent by following the DaemonSet init containers, flanneld startup, hostPath mounts, node Pod CIDR, and CNI delegation path.

---

## Introduction

`/run/flannel/subnet.env` is a hand-off file between two components. `flanneld` writes the cluster-wide Flannel network, the node's subnet, MTU, and masquerade setting into the file. Later, when a container runtime invokes the Flannel CNI plugin for a pod, the plugin reads that file and constructs configuration for a delegated interface plugin, `bridge` by default, with `host-local` as the default IPAM plugin.

If the file is missing, the CNI error is downstream evidence. The root cause is usually earlier: the DaemonSet did not reach the node, an init container failed, `flanneld` could not read cluster configuration or acquire its Flannel subnet lease from the Node's Pod CIDR, or its `/run/flannel` hostPath is not the path the runtime sees.

## Understand the Initialization Sequence

The current upstream Kubernetes manifest follows this path:

1. The `install-cni-plugin` init container copies the `flannel` executable into the host CNI binary directory.
2. The `install-cni` init container writes `10-flannel.conflist` into the host CNI configuration directory.
3. The `kube-flannel` container starts `flanneld` with `--kube-subnet-mgr`.
4. Flannel reads `net-conf.json`, watches Kubernetes Nodes, uses the local Node's assigned Pod CIDR, and initializes the selected backend.
5. Flannel writes `/run/flannel/subnet.env` through a hostPath mount.
6. The runtime invokes CNI for an ordinary pod. The Flannel plugin reads the file, then delegates interface setup and local IPAM.

The DaemonSet itself uses the host network, so its main pod may start even while ordinary pod sandbox creation fails.

## Locate the Affected Flannel Pod

```bash
NODE=worker-1

kubectl -n kube-flannel get pods -l app=flannel -o wide

FLANNEL_POD=$(kubectl -n kube-flannel get pods -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' \
  | head -n 1)

kubectl -n kube-flannel get pod "$FLANNEL_POD" \
  -o jsonpath='{range .status.initContainerStatuses[*]}{.name}{"\t"}{.state}{"\n"}{end}'
kubectl -n kube-flannel describe pod "$FLANNEL_POD"
```

If no pod is returned, solve DaemonSet scheduling or admission first. Check node selectors, taints and tolerations, OS labels, and Pod Security admission. If a pod exists but has not started, also check image availability.

## Separate Init-Container Failures From flanneld Failures

Read every container's logs rather than only the default container:

```bash
kubectl -n kube-flannel logs "$FLANNEL_POD" -c install-cni-plugin
kubectl -n kube-flannel logs "$FLANNEL_POD" -c install-cni
kubectl -n kube-flannel logs "$FLANNEL_POD" -c kube-flannel --tail=300
kubectl -n kube-flannel logs "$FLANNEL_POD" -c kube-flannel \
  --previous --tail=300
```

Typical branches are:

- A failed copy to `/opt/cni/bin` means the binary hostPath, permissions, read-only filesystem, or security policy is wrong.
- A failed config installation means the `/etc/cni/net.d` hostPath or mount is wrong.
- `failed to read net conf` points to the `kube-flannel-cfg` ConfigMap or its mount at `/etc/kube-flannel`.
- `node ... pod cidr not assigned` means `.spec.podCIDR` is empty.
- An interface-selection or backend error prevents Flannel from completing initialization and writing usable state.
- Kubernetes API authorization or reachability errors prevent the subnet manager from getting its own Pod, listing or watching Node objects, or patching Node status and Flannel annotations.

## Verify the Inputs to the Subnet File

```bash
kubectl get node "$NODE" \
  -o jsonpath='{.metadata.name}{"\t"}{.spec.podCIDR}{"\t"}{.spec.podCIDRs}{"\n"}'

kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo

kubectl get clusterrole flannel -o yaml
kubectl auth can-i get "pods/${FLANNEL_POD}" \
  -n kube-flannel \
  --as=system:serviceaccount:kube-flannel:flannel
kubectl auth can-i get "nodes/${NODE}" -A \
  --as=system:serviceaccount:kube-flannel:flannel
kubectl auth can-i list nodes -A \
  --as=system:serviceaccount:kube-flannel:flannel
kubectl auth can-i watch nodes -A \
  --as=system:serviceaccount:kube-flannel:flannel
kubectl auth can-i patch "nodes/${NODE}" --subresource=status -A \
  --as=system:serviceaccount:kube-flannel:flannel
```

The node CIDR must be present, unique, and contained by the Flannel network. In dual-stack mode, confirm both `podCIDRs` and the Flannel IPv4/IPv6 configuration supported by the chosen backend and installed versions.

## Check the HostPath, Not Just the Container

The CNI runtime runs on the host. Inspect the host's view:

```bash
sudo stat /run/flannel
sudo ls -la /run/flannel
sudo cat /run/flannel/subnet.env

sudo stat /etc/cni/net.d/10-flannel.conflist
sudo stat /opt/cni/bin/flannel
```

Also verify the pod mounts:

```bash
kubectl -n kube-flannel get pod "$FLANNEL_POD" -o json \
  | jq '.spec.volumes, .spec.containers[].volumeMounts, .spec.initContainers[].volumeMounts'
```

`/run` is commonly volatile and is recreated at boot. Its being empty immediately after a reboot is not itself corruption; the Flannel DaemonSet must start and repopulate the file. A persistent failure after `flanneld` logs that it wrote the subnet file deserves investigation. When the deployed manifest uses Flannel's `/readyz` readiness probe, Pod `Ready` indicates that traffic rules were installed and this `flanneld` process completed the initial subnet-file write; the probe does not continuously verify that the file still exists.

If your deployment changed `--subnet-file`, the CNI config's `subnetFile` must point to the same host-visible path. The plugin default is `/run/flannel/subnet.env`. Mounting a different file only inside the Flannel container does not help the host runtime.

## Inspect the File's Expected Content

A normal IPv4 file resembles:

```text
FLANNEL_NETWORK=10.244.0.0/16
FLANNEL_SUBNET=10.244.3.1/24
FLANNEL_MTU=1450
FLANNEL_IPMASQ=true
```

Values vary with the node, backend, outer-interface MTU, and configuration. Do not copy this example onto a node. A fabricated subnet can duplicate another node, give pods the wrong MTU, or send traffic into a conflicting network.

The CNI plugin uses these values to build its delegate configuration. By default it populates the delegated IPAM ranges from `FLANNEL_SUBNET`, supplies a route for the Flannel network, passes the MTU, and uses `host-local` IPAM. That means `subnet.env` does not contain individual pod leases; those allocations are local CNI state.

## Recover After Fixing the Root Cause

Once Pod CIDR, RBAC, mounts, images, kernel support, and backend configuration are correct, recreate only the affected DaemonSet pod. The selector-based `--for=create` wait below requires kubectl v1.33 or later; with an older client, repeat the pod lookup until the replacement appears before running the `Ready` wait:

```bash
kubectl -n kube-flannel delete pod "$FLANNEL_POD"

kubectl -n kube-flannel wait \
  --for=create pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=180s

kubectl -n kube-flannel wait \
  --for=condition=Ready pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=180s
```

After `flanneld` reports the write, confirm the atomically written file on the node and then check kubelet:

```bash
sudo ls -l /run/flannel/subnet.env
sudo cat /run/flannel/subnet.env
sudo journalctl -u kubelet -b --no-pager | tail -n 150
```

No kubelet restart is required for a regenerated `subnet.env`; the Flannel CNI plugin reads the file on each new CNI `ADD`. On Kubernetes 1.24 and later, the container runtime, not kubelet, manages CNI configuration. If a changed CNI configuration is not picked up, inspect the container runtime's status and logs and follow its documented reload procedure.

Do not solve this error by deleting `/var/lib/cni`, `cni0`, or routes. Those actions do not make Flannel acquire its subnet lease and can disrupt running pods.

## Verify With a Fresh Sandbox

```bash
kubectl run subnet-env-test --image=busybox:1.36 --restart=Never \
  --overrides="{\"apiVersion\":\"v1\",\"spec\":{\"nodeName\":\"${NODE}\"}}" -- sleep 3600

kubectl get pod subnet-env-test -o wide
kubectl describe pod subnet-env-test
```

When `10-flannel.conflist` is the runtime's active CNI configuration, the pod receiving an address proves that the runtime could read the config, execute all required plugins, read `subnet.env`, and allocate from the node subnet. Cross-node reachability is a separate backend and firewall test.

## Official Documentation

- [Flannel CNI plugin: subnet file and delegation](https://github.com/flannel-io/cni-plugin)
- [Flannel upstream Kubernetes manifest](https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml)
- [Flannel configuration reference](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel troubleshooting guide](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md)
- [CNI specification](https://github.com/containernetworking/cni/blob/main/SPEC.md)

## Conclusion

A missing `/run/flannel/subnet.env` is normally a failed or incomplete `flanneld` startup, not a file-management task. Trace the DaemonSet's init containers, verify the Node Pod CIDR and Flannel ConfigMap, check the shared hostPath, and let a healthy Flannel process regenerate the file. Only then test a new pod sandbox.
