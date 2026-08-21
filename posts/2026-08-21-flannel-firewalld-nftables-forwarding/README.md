# Run Flannel With firewalld and nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, firewalld, nftables, Firewall, Forwarding

Description: Integrate Flannel with modern firewalld and nftables by separating VXLAN input, Pod CIDR forwarding, masquerade ownership, and kube-proxy Service rules.

---

## Introduction

Flannel, firewalld, and kube-proxy can all program Linux packet processing, but they own different behavior. A reliable configuration begins by identifying the active backend and rule manager for each component:

- Flannel's data backend may be VXLAN, host-gw, WireGuard, or another supported backend.
- Flannel can install forwarding and IP masquerade rules. Its current `EnableNFTables` option is explicitly documented as experimental and defaults to false.
- firewalld uses zones and policies; current firewalld defaults to an nftables backend.
- kube-proxy independently selects `iptables`, `nftables`, or `ipvs` mode, unless another Service proxy replaces it.

firewalld using nftables does not automatically move Flannel or kube-proxy to nftables. Likewise, an `iptables` command may be an nftables compatibility frontend. Diagnose the real stack before changing it.

## Inventory Rule Ownership

```bash
sudo firewall-cmd --state
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --get-policies
sudo firewall-cmd --list-all-zones

sudo grep -E '^(FirewallBackend|FlushAllOnReload|ReloadPolicy)' \
  /etc/firewalld/firewalld.conf
iptables --version
sudo iptables-save
sudo nft list ruleset
```

Read Flannel's configuration and arguments:

```bash
kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.net-conf\.json}'
echo

kubectl -n kube-flannel get daemonset kube-flannel-ds \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="kube-flannel")].args}'
echo
```

Read the Service proxy separately:

```bash
kubectl -n kube-system get daemonset kube-proxy
kubectl -n kube-system get configmap kube-proxy \
  -o jsonpath='{.data.config\.conf}'
echo
```

If the distribution has no kube-proxy, identify its replacement. Do not install kube-proxy on top of an eBPF or vendor Service implementation.

## Separate Input From Forwarding

For default Linux VXLAN, the outer UDP packet is addressed to the node, so the host firewall must accept the configured VXLAN port from peer node addresses. The decapsulated pod packet is forwarded and must pass forwarding policy.

Flannel currently documents these defaults:

- VXLAN: UDP 8472 on Linux unless `Backend.Port` overrides it.
- UDP backend: UDP 8285.
- WireGuard: its configured listen ports.
- host-gw: no overlay UDP port, but direct node routing is required.

Open only the verified backend and source range. For example, after replacing the documentation ranges with the real node underlay range and zone:

```bash
# Adds a permanent, tightly scoped VXLAN allowance.
sudo firewall-cmd --permanent --zone=<underlay-zone> \
  --add-rich-rule='rule family="ipv4" source address="192.0.2.0/24" port port="8472" protocol="udp" accept'
```

Do not expose UDP 8472 to `0.0.0.0/0` unless every address is intentionally a trusted peer. Mirror the same peer-only rule in cloud security groups and upstream ACLs.

## Model Pod Forwarding With Zones and Policies

Modern firewalld policies govern traffic between zones; inter-zone traffic is denied by default. One approach is to classify the Pod CIDR by source and create an explicit policy for permitted egress:

```bash
# Review existing names first; these commands create persistent objects.
sudo firewall-cmd --permanent --new-zone=k8s-pods
sudo firewall-cmd --permanent --zone=k8s-pods \
  --add-source=10.244.0.0/16

sudo firewall-cmd --permanent --new-policy=k8s-pods-out
sudo firewall-cmd --permanent --policy=k8s-pods-out \
  --add-ingress-zone=k8s-pods
sudo firewall-cmd --permanent --policy=k8s-pods-out \
  --add-egress-zone=ANY
sudo firewall-cmd --permanent --policy=k8s-pods-out \
  --set-target=ACCEPT
```

This is a design example, not a universal policy. Replace `10.244.0.0/16`, review which destinations pods should reach, and use narrower egress zones or rich rules where required. New inbound connections from external networks to pods need their own explicit, security-reviewed direction; stateful reply traffic does not.

firewalld versions without policy objects require a different, distribution-supported design. Do not mix copied direct rules with zone policies without understanding rule priority.

## Decide Who Owns Masquerading

The upstream Flannel manifest runs `flanneld` with `--ip-masq`. Flannel documents this as masquerading traffic whose destination is outside the Flannel network. The effective value appears as `FLANNEL_IPMASQ` in `/run/flannel/subnet.env`.

```bash
sudo cat /run/flannel/subnet.env
sudo iptables-save -t nat | grep -i flannel
sudo nft list ruleset | grep -i -C 3 flannel
```

firewalld can also enable masquerading on an egress zone, but enabling both indiscriminately can make source-IP behavior hard to reason about. Pick an owner based on routing requirements, document it, and verify packet source addresses at the destination.

Do not turn on Flannel's `EnableNFTables` merely because firewalld uses nftables. Flannel still marks that option experimental in current documentation; validate it against the pinned release and kube-proxy/runtime combination before enabling it.

## Apply and Test a Permanent Configuration

Before reloading, capture the existing rules and make sure you have out-of-band access:

```bash
sudo firewall-cmd --check-config
sudo nft list ruleset > /var/tmp/nft-before-flannel-firewall.txt
sudo iptables-save > /var/tmp/iptables-before-flannel-firewall.txt
```

These snapshots can contain security-sensitive policy. Protect and remove them according to your retention procedure.

Apply permanent configuration:

```bash
sudo firewall-cmd --reload
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --get-active-policies
sudo firewall-cmd --zone=<underlay-zone> --list-rich-rules
sudo firewall-cmd --policy=k8s-pods-out --list-all
```

Current firewalld's `FlushAllOnReload` default can replace runtime rules during reload, while Flannel and kube-proxy reconcile on their own schedules. Test a reload as an operational event; do not assume rules that worked before it survive correctly.

## Trace Drops Without Flushing Rules

Run direct Pod IP tests across nodes while watching counters and logs:

```bash
sudo journalctl -u firewalld -b --no-pager | tail -200
sudo nft -a list ruleset
sudo iptables -L FORWARD -n -v --line-numbers
sudo tcpdump -ni <underlay-interface> udp port 8472
```

Interpret the path:

- No outer VXLAN packet arrives: upstream ACL or node-input rule.
- VXLAN arrives but the inner packet is dropped: forwarding zone/policy, netfilter hook, or reverse-path issue.
- Direct Pod IPs work but ClusterIPs fail: inspect kube-proxy's mode-specific rules.
- Pod egress works but source identity is lost: inspect Flannel and firewalld NAT ownership.

Do not use `iptables -F`, `nft flush ruleset`, or a blanket `FORWARD ACCEPT` as a fix. Those destructive commands remove unrelated security, Service, and runtime state and erase diagnostic evidence.

## Account for NetworkPolicy Separately

firewalld host policy and Kubernetes NetworkPolicy are not substitutes for one another. Basic Flannel does not itself enforce NetworkPolicy; current Flannel documents an optional separate network-policy component. If one is deployed, validate its policy decisions after the host path works.

## Official Documentation

- [Flannel configuration, forwarding, masquerade, and nftables option](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [Flannel backend firewall ports](https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md)
- [firewalld concepts: zones and policies](https://firewalld.org/documentation/concepts.html)
- [firewalld policy manual](https://firewalld.org/documentation/man-pages/firewalld.policy.html)
- [firewalld configuration and backend](https://firewalld.org/documentation/man-pages/firewalld.conf.html)
- [Kubernetes Service proxy modes](https://kubernetes.io/docs/reference/networking/virtual-ips/#proxy-modes)

## Conclusion

Run Flannel with firewalld by assigning clear ownership: permit the configured node-to-node backend traffic, express forwarded Pod CIDR policy with firewalld zones and policies, choose one intentional masquerade design, and inspect kube-proxy separately. Treat Flannel's nftables mode as version-dependent and experimental while its documentation says so, and never clear the shared ruleset to make a transient test pass.
