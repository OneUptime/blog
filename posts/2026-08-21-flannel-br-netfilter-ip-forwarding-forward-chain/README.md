# Verify Linux Forwarding Before Blaming Flannel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, Bridge Netfilter, IP Forwarding, iptables, nftables

Description: Validate the Linux kernel modules, sysctls, and netfilter forwarding path that Flannel and Kubernetes networking rely on before changing the CNI.

---

## Introduction

Flannel creates an overlay or routes, but the Linux host still has to forward packets between pod veth devices, bridges, tunnel interfaces, and the underlay. A missing `br_netfilter` module, disabled IP forwarding, or a host firewall drop can make healthy Flannel routes look broken.

The upstream Flannel README explicitly requires `br_netfilter` and notes that kubeadm 1.30 and newer no longer checks for it. Kubernetes' runtime setup documentation separately requires IPv4 forwarding for network implementations that do not configure it themselves.

Verify these host prerequisites before deleting CNI state or reinstalling the DaemonSet.

## Confirm the Symptom at the Right Layer

Test in order:

1. Pod to another pod on the same node.
2. Pod to a Pod IP on another node.
3. Pod to a ClusterIP.
4. Pod to an external IP.

If direct cross-node Pod IP traffic works, the basic Flannel forwarding path is present. A ClusterIP-only failure points toward kube-proxy or its replacement. If only external egress fails, routing and masquerade deserve more attention than the VXLAN device.

## Verify `br_netfilter`

```bash
lsmod | grep -w br_netfilter
modinfo br_netfilter
test -e /proc/sys/net/bridge/bridge-nf-call-iptables \
  && echo "bridge netfilter sysctls are present"
```

Load it for the current boot:

```bash
sudo modprobe br_netfilter
```

Persist the module across reboot:

```bash
cat <<'EOF' | sudo tee /etc/modules-load.d/flannel.conf
br_netfilter
EOF
```

If `modprobe` reports that the module is unavailable, install the kernel module package appropriate to the distribution and kernel. Flannel documents a separate `linux-modules-extra-raspi` requirement for VXLAN on affected Ubuntu Raspberry Pi releases; do not generalize that package name to other systems.

## Verify Forwarding Sysctls

```bash
sysctl net.ipv4.ip_forward
sysctl net.bridge.bridge-nf-call-iptables
sysctl net.bridge.bridge-nf-call-ip6tables
```

For an IPv4 Flannel cluster, persist the required values:

```bash
cat <<'EOF' | sudo tee /etc/sysctl.d/90-kubernetes-networking.conf
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
EOF

sudo sysctl --system
```

Verify after applying:

```bash
sysctl net.ipv4.ip_forward
sysctl net.bridge.bridge-nf-call-iptables
```

For IPv6 or dual-stack, review the installed Flannel backend and Kubernetes IPv6 requirements, then deliberately configure IPv6 forwarding and bridge netfilter. Do not enable a collection of unrelated IPv6 settings on an IPv4-only host.

`sysctl --system` loads all system configuration files, not only the new one. Review existing snippets and command output for conflicting later values.

## Identify the Active Firewall APIs

```bash
iptables --version
sudo iptables-save
sudo nft list ruleset
sudo firewall-cmd --state 2>/dev/null || true
```

`iptables v1.8.x (nf_tables)` means the command uses the nftables compatibility backend; it does not mean every native nftables rule is visible in a traditional mental model. firewalld, Flannel, kube-proxy, the runtime, and other agents may all contribute rules.

Read Flannel's current arguments:

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="kube-flannel")].args}'
echo
```

Flannel currently documents `--iptables-forward-rules` as enabled by default. It installs forwarding accepts for its traffic, but an earlier higher-priority drop or a separate nftables hook can still win.

## Inspect the FORWARD Path and Counters

For iptables-managed forwarding:

```bash
sudo iptables -S FORWARD
sudo iptables -L FORWARD -n -v --line-numbers
sudo iptables-save | grep -E 'FLANNEL|KUBE-FORWARD|FORWARD'
```

For native nftables:

```bash
sudo nft -a list ruleset
```

A default `FORWARD DROP` policy is not automatically broken if explicit Flannel and Kubernetes accepts run before it. Conversely, a default `ACCEPT` does not prove that another base chain or higher-priority hook cannot drop the packet.

Generate one known cross-node Pod IP flow and compare counters before and after:

```bash
kubectl exec -n <namespace> <source-pod> -- ping -c 3 <remote-pod-ip>
sudo iptables -L FORWARD -n -v --line-numbers
sudo nft -a list ruleset
```

Use simultaneous packet capture to locate the drop:

```bash
sudo tcpdump -ni cni0 host <remote-pod-ip>
sudo tcpdump -ni flannel.1 host <remote-pod-ip>
sudo tcpdump -ni <underlay-interface> udp port 8472
```

Those interface names and UDP port apply to the usual Linux bridge plus VXLAN configuration. Adapt them for `host-gw`, WireGuard, custom ports, or another delegate.

## Check Reverse Path and Return Traffic

```bash
ip route get <remote-pod-ip>
ip route get <remote-node-underlay-ip>
sysctl net.ipv4.conf.all.rp_filter
sysctl net.ipv4.conf.<underlay-interface>.rp_filter
```

Strict reverse-path filtering can drop valid packets in an asymmetric, multi-homed design. Do not disable it globally as a folklore fix. Prove the asymmetry and choose a scoped value consistent with the distribution's security guidance.

Capture the request and reply on both nodes. A request reaching the destination pod proves the forward direction only.

## Make a Minimal Repair

- If a module is missing, install/load and persist that one module.
- If forwarding is disabled, enable and persist the relevant address-family setting.
- If a firewall rule drops the Pod CIDR, change the owning firewalld policy or security configuration in a narrow scope.
- If Flannel's forwarding chain is absent, inspect Flannel privileges and logs, then restart only the affected DaemonSet pod.
- If direct Pod IPs work but Services do not, repair kube-proxy instead.

Do not use these destructive shortcuts:

```text
iptables -F
iptables -P FORWARD ACCEPT
nft flush ruleset
```

They erase policy and shared component state, can expose the host, and remove evidence. A temporary lab experiment still needs an approved rollback and isolated node.

## Verify Persistence

After the immediate fix, reboot a cordoned canary node and recheck:

```bash
lsmod | grep -w br_netfilter
sysctl net.ipv4.ip_forward
sysctl net.bridge.bridge-nf-call-iptables
sudo iptables -L FORWARD -n -v
sudo nft list ruleset
```

Then repeat cross-node Pod IP and ClusterIP tests. A boot-time fix is incomplete if a later firewall reload removes it.

## Official Documentation

- [Flannel README: kernel and CNI requirements](https://github.com/flannel-io/flannel/blob/master/README.md)
- [Flannel configuration: forwarding rules](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md#key-command-line-options)
- [Kubernetes container runtime prerequisites: IPv4 forwarding](https://kubernetes.io/docs/setup/production-environment/container-runtimes/#enable-ipv4-packet-forwarding)
- [Kubernetes cluster networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)
- [firewalld concepts](https://firewalld.org/documentation/concepts.html)

## Conclusion

Before blaming Flannel, confirm that `br_netfilter` is loaded, forwarding is enabled for the cluster's address families, and the real FORWARD path accepts the tested packet in both directions. Use counters and captures to identify the owning rule manager. Persist the narrow prerequisite or policy change, and never flush the shared firewall as a troubleshooting shortcut.
