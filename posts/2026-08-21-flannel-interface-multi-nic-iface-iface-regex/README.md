# Select a Flannel Interface on Multi-NIC Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Multi-NIC, Interface Selection, VXLAN, Routing

Description: Select and verify Flannel's inter-host interface on multi-NIC nodes using exact interface matches, ordered regular expressions, and reachability-based routing.

---

## Introduction

Flannel needs a unique, mutually reachable node address for inter-host communication. By default it chooses the interface associated with the host's default route. That is often wrong on servers with separate management, storage, public, VPN, and cluster networks.

Choosing the wrong interface can produce an apparently healthy DaemonSet while cross-node pod traffic times out. Flannel may advertise an address reachable only from a management VLAN, choose the same NAT-side address on multiple virtual machines, or send VXLAN through a low-MTU VPN.

Current Flannel supports exact `--iface` matches, `--iface-regex` matches, and, on Linux, `--iface-can-reach`. Their precedence matters: exact `--iface` candidates are tried first; regex candidates are used only if no exact candidate matches; reachability selection is used only if neither group matches.

## Inventory Routes and Addresses on Every Node

Run these commands on representative nodes before changing the DaemonSet:

```bash
ip -br link
ip -br address
ip route show table main
ip -6 route show table main

ip route get <another-node-cluster-ip>
```

Record the properties of the intended interface:

- It has a unique address on every node.
- Other nodes can route to that address in both directions.
- The required backend port is allowed on that network.
- Its MTU reflects the effective underlay path.
- Its name or identifying pattern is stable across reboot and provisioning.

Check what Flannel chose now:

```bash
kubectl -n kube-flannel logs daemonset/kube-flannel-ds \
  -c kube-flannel --all-pods=true --tail=300 --prefix \
  | grep -E 'Determining (IP address|interface)|Searching for interface|Using interface|external address'

kubectl get nodes -o wide
```

For a VXLAN backend, also inspect each node:

```bash
ip -d link show type vxlan
```

The `local` address on Flannel's VXLAN device should be the intended local tunnel source.

## Use `--iface` for an Exact, Stable Choice

`--iface` accepts an interface name or an IP address. It can be repeated; Flannel checks candidates in order and uses the first match.

If every node uses `ens192` for cluster traffic, update the managed manifest or Helm values so the Flannel container arguments include:

```yaml
containers:
  - name: kube-flannel
    args:
      - --ip-masq
      - --kube-subnet-mgr
      - --iface=ens192
```

For nodes whose preferred name differs by hardware generation, ordered fallbacks can be useful:

```yaml
      - --iface=ens192
      - --iface=enp6s0
```

Do not put a node-specific IP such as `--iface=10.20.1.17` into one shared DaemonSet unless only one node will run it. An exact common interface name, regex, separate node-targeted DaemonSets, or generated per-node configuration is more appropriate.

Persist the change in the installation source-GitOps manifest, Helm values, or distribution configuration. An interactive `kubectl edit` is useful for a controlled test but is easily overwritten.

## Use `--iface-regex` for Predictable Naming Patterns

`--iface-regex` matches interface names or IPs and can also be repeated in preference order. Anchor expressions so they cannot accidentally match `cni0`, `flannel.1`, a transient veth, or a similarly named management NIC.

```yaml
      - --iface-regex=^ens(192|224)$
```

A broad expression such as `eth.*` is risky on a multi-NIC node: Flannel returns the first match it finds, which may not express your intended priority. Prefer the narrowest stable pattern, and verify the selected address after every rollout.

If any `--iface` value matches, Flannel does not use `--iface-regex`. Remove stale exact flags when changing to regex-based selection.

## Consider `--iface-can-reach` When Routing Is Authoritative

When interface names vary but every node has a route to a stable underlay target, Flannel can select the interface the kernel would use to reach it:

```yaml
      - --iface-can-reach=10.20.0.1
```

Preview that decision on each node:

```bash
ip route get 10.20.0.1
```

This is useful only if the route is stable and representative of peer traffic. A target reached through a policy route, VPN, or temporary default route can select an unintended interface. `--iface-can-reach` is a distinct option, not an alias for the two title flags.

## Distinguish Interface, Public IP, and Kubernetes Node IP

These values can differ:

- `--iface` selects the local interface used for inter-host communication.
- `--public-ip` changes the address Flannel advertises to peers. Without another interface-selection flag, Flannel also tries to find a local interface with that IP.
- Kubernetes Node `InternalIP` is chosen by kubelet or the cloud provider.
- Flannel's node annotations carry backend and advertised-address data.

The Flannel Kubernetes documentation also defines node annotations for public IP selection and overwrite, including NAT cases. Do not use a public-IP overwrite to hide an incorrect local route. If an advertised address is behind NAT, make sure every peer has a symmetric way to reach it and account for VXLAN/NAT checksum behavior documented by Flannel.

Inspect relevant annotations without assuming their exact contents:

```bash
kubectl get node <node-name> -o json \
  | jq '.metadata.annotations | with_entries(select(.key | startswith("flannel.")))'
```

## Roll Out Safely

An interface change updates how all peers reach a node. Roll it out during a maintenance window and preserve control-plane access on a separate path.

```bash
kubectl -n kube-flannel rollout restart daemonset/kube-flannel-ds
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds \
  --timeout=5m
```

For a large or sensitive cluster, update and verify a canary node through your deployment system before a full rollout. Flannel's current non-UDP backends use a kernel data path, so short daemon restarts can preserve established flow state, but peer address and route changes are not equivalent to a no-op restart.

After rollout, verify on every node:

```bash
kubectl -n kube-flannel logs daemonset/kube-flannel-ds \
  -c kube-flannel --all-pods=true --tail=300 --prefix \
  | grep -E 'Using interface|external address'

ip route get <peer-selected-address>
ip -d link show type vxlan
```

Then test cross-node Pod IP traffic in both directions and capture the configured backend port on the intended NIC.

## Common Failure Patterns

- A DHCP-renewed default route makes Flannel switch back after restart: persist an explicit interface choice.
- Two nodes advertise the same NAT-side address: use unique reachable addresses or a correctly designed NAT/public-IP scheme.
- A regex matches a VPN before Ethernet: anchor and narrow the expression.
- The selected NIC works but carries a smaller path MTU: recalculate the backend and pod MTU.
- Kubernetes Node IP and Flannel endpoint differ: this is not automatically wrong, but firewall and routing policy must allow both required paths.
- Only new peers fail after an address change: inspect Flannel logs, Node annotations, FDB entries, and reverse routes on every node.

## Official Documentation

- [Flannel configuration and interface-selection flags](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md#key-command-line-options)
- [Flannel troubleshooting: interface selection and public IP](https://github.com/flannel-io/flannel/blob/master/Documentation/troubleshooting.md#interface-selection-and-the-public-ip)
- [Flannel Kubernetes node annotations](https://github.com/flannel-io/flannel/blob/master/Documentation/kubernetes.md#annotations)
- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [Kubernetes node addresses](https://kubernetes.io/docs/reference/node/node-status/#addresses)

## Conclusion

On multi-NIC nodes, choose Flannel's inter-host interface from observed routing, reachability, and MTU. Prefer an exact `--iface` when names are stable, use narrowly anchored and ordered `--iface-regex` values where they are not, and use reachability selection only when the route is the reliable source of truth. Verify Flannel's logged choice and real cross-node traffic after rollout.
