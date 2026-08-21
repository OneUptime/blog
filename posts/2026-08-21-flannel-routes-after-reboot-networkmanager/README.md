# Recover Flannel VXLAN Routes After Reboot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, NetworkManager, VXLAN, Reboot, Route

Description: Restore Flannel VXLAN routes after a reboot and prevent NetworkManager or another host network manager from taking ownership of cni0 and flannel.1.

---

## Introduction

Flannel's VXLAN interface and remote Pod CIDR routes are runtime state. They should be recreated from Kubernetes Node information when `flanneld` starts; they are not normally static routes that an administrator persists by hand. After a reboot, a delayed underlay, a changed node address, or interference from NetworkManager can prevent that reconciliation.

First confirm that the cluster really uses the Linux VXLAN backend. `host-gw` intentionally has no `flannel.1`; WireGuard, IPIP, UDP, and Windows implementations create different devices and routes.

## Capture the Expected State

On a healthy peer using the same backend, record:

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo

kubectl get nodes \
  -o custom-columns='NAME:.metadata.name,PODCIDR:.spec.podCIDR,INTERNAL_IP:.status.addresses[?(@.type=="InternalIP")].address'

ip -d link show flannel.1
ip -4 address show dev flannel.1
ip -4 route show
ip neigh show dev flannel.1
bridge fdb show dev flannel.1
```

The exact remote routes, next hops, MAC addresses, and endpoint IPs differ on each node. Do not copy another node's routes verbatim.

## Diagnose the Rebooted Node in Startup Order

### 1. Verify the underlay first

```bash
ip -br address
ip route show table main
ip route get <peer-node-underlay-ip>
ping -c 3 <peer-node-underlay-ip>
```

If DHCP, bonding, a VLAN, or a VPN is not ready, Flannel may select the wrong default-route interface or fail to create a usable backend. Repair the underlay and make its boot configuration deterministic before restarting Flannel.

### 2. Check the Node and Flannel pod

```bash
NODE=worker-1

kubectl get node "$NODE" \
  -o jsonpath='{.metadata.name}{"\t"}{.spec.podCIDR}{"\t"}{.spec.podCIDRs}{"\n"}'

FLANNEL_POD=$(kubectl -n kube-flannel get pod -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-flannel describe pod "$FLANNEL_POD"
kubectl -n kube-flannel logs "$FLANNEL_POD" -c kube-flannel --tail=300
kubectl -n kube-flannel logs "$FLANNEL_POD" -c kube-flannel \
  --previous --tail=300
```

Look for interface selection, missing Pod CIDR, API authorization, `operation not permitted`, missing kernel module, or route-add errors. The current upstream manifest exposes readiness only after traffic rules are installed and `subnet.env` is written; older manifests may not have that probe.

### 3. Check volatile and kernel state

```bash
sudo cat /run/flannel/subnet.env
lsmod | grep -E 'vxlan|br_netfilter'
sysctl net.ipv4.ip_forward

ip -d link show flannel.1
ip -4 route show
```

`/run` is normally volatile. It being empty early in boot is expected; it must be repopulated after Flannel successfully initializes.

`lsmod` lists dynamically loaded modules, so no match is not proof that support is missing when a feature is built into the kernel.

Recent Flannel releases include logic to notice and recreate a missing VXLAN device. Older releases may require recreating the Flannel pod. Check the changelog and source for the pinned release instead of assuming that every version self-heals identically.

## Prove Whether NetworkManager Owns the Interfaces

```bash
NetworkManager --print-config
nmcli device status
nmcli -f GENERAL.DEVICE,GENERAL.TYPE,GENERAL.STATE,GENERAL.CONNECTION \
  device show flannel.1

sudo journalctl -u NetworkManager -b --no-pager \
  | grep -iE 'flannel|cni0|route|unmanaged'
```

Evidence of a generated connection, address removal, route cleanup, or device activation around the failure makes NetworkManager a likely owner. If NetworkManager is not installed or does not mention the device, check `systemd-networkd`, cloud-init, network dispatcher scripts, security agents, and configuration-management jobs instead.

## Mark Flannel and CNI Devices Unmanaged

NetworkManager's official `keyfile.unmanaged-devices` setting makes matching devices strictly unmanaged. Append a narrow rule for the stable Flannel and CNI devices without replacing existing unmanaged-device rules:

```bash
cat <<'EOF' | sudo tee /etc/NetworkManager/conf.d/90-flannel-unmanaged.conf
[keyfile]
unmanaged-devices+=interface-name:=flannel.1;interface-name:=cni0
EOF

sudo nmcli general reload conf
NetworkManager --print-config | grep -A3 -B2 unmanaged-devices
nmcli device status
```

Use the actual interface names for the selected backend. A matcher such as `interface-name:flannel*` supports simple globbing in current NetworkManager device-list syntax, but exact names reduce the chance of excluding an unrelated host interface.

Changing NetworkManager ownership can disrupt connectivity. Test on a cordoned canary node and keep out-of-band access. If a reload does not apply the ownership state to an existing device, schedule a NetworkManager restart or node reboot; do not restart the host network manager remotely without a recovery path.

Also inspect distribution-provided snippets under `/usr/lib/NetworkManager/conf.d` and `/etc/NetworkManager/conf.d`. Later configuration can override earlier settings, and some Kubernetes distributions already ship a broader CNI-unmanaged rule.

## Restore State Through Flannel

After the underlay, modules, sysctls, and NetworkManager configuration are correct, recreate the Flannel pod on only the affected node:

```bash
kubectl -n kube-flannel delete pod "$FLANNEL_POD"

kubectl -n kube-flannel wait --for=create pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=180s

kubectl -n kube-flannel wait --for=condition=Ready pod \
  -l app=flannel \
  --field-selector "spec.nodeName=${NODE}" \
  --timeout=180s
```

Then verify:

```bash
sudo cat /run/flannel/subnet.env
ip -d link show flannel.1
ip -4 route show
ip neigh show dev flannel.1
bridge fdb show dev flannel.1
```

Do not add Flannel routes to persistent NetworkManager profiles and do not add static FDB entries. They will become stale when nodes or Pod CIDRs change and can conflict with Flannel reconciliation.

## Make Boot Prerequisites Persistent

Persist `vxlan` and IPv4 forwarding. For the default upstream iptables configuration, also persist `br_netfilter` and the bridge iptables hook:

```bash
cat <<'EOF' | sudo tee /etc/modules-load.d/flannel.conf
br_netfilter
vxlan
EOF

cat <<'EOF' | sudo tee /etc/sysctl.d/90-kubernetes-networking.conf
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sudo modprobe br_netfilter
sudo modprobe vxlan
sudo sysctl --system
```

An nftables-only design may not require the bridge-iptables settings; confirm the requirements of both Flannel and the Service proxy.

Only add IPv6 settings when the cluster design uses IPv6. Ensure kubelet starts after the container runtime and that Flannel images are locally available or reachable during boot.

## Validate With a Canary Reboot

Cordon and drain a test node according to workload disruption policy, reboot it, and check in sequence:

1. Underlay interface and default route.
2. Node Pod CIDR and Ready condition.
3. Flannel pod and readiness.
4. `subnet.env`, `flannel.1`, routes, neighbor table, and FDB.
5. Cross-node Pod IP traffic in both directions.
6. ClusterIP traffic through the Service proxy.

Only then roll the host configuration to the rest of the cluster.

## Official Documentation

- [NetworkManager configuration: unmanaged devices](https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html)
- [Flannel configuration and health endpoints](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel running and restart behavior](https://github.com/flannel-io/flannel/blob/master/Documentation/running.md#zero-downtime-restarts)
- [Flannel VXLAN backend](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md#vxlan)
- [Flannel troubleshooting guide](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md)

## Conclusion

Flannel VXLAN routes should be reconstructed from cluster state after boot. Restore the underlay and Flannel process first, then prove whether NetworkManager removed `flannel.1` or its routes. Mark only the Flannel and CNI interfaces unmanaged, make modules and sysctls persistent, and validate a canary reboot. Static route and FDB workarounds merely create a second, stale source of truth.
