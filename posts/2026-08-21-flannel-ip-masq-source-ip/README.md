# Preserve or Masquerade Pod Source IPs With Flannel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flannel, IP Masquerade, Source IP, NAT, Routing

Description: Choose whether Flannel should masquerade pod egress or preserve pod source addresses, including the CNI delegate, return-routing, and kube-proxy boundaries.

---

## Introduction

Flannel's `--ip-masq` controls source NAT for traffic originating in the Flannel network and destined outside that network. Masquerading makes external systems see a node address and avoids teaching them routes to Pod CIDRs. Preserving pod source IPs enables identity, logging, and direct routing, but every return path and firewall must understand those Pod CIDRs.

There is an important two-layer detail: the Flannel CNI plugin delegates to the bridge plugin. If `delegate.ipMasq` is not set, the Flannel plugin sets it to the inverse of `FLANNEL_IPMASQ`. This prevents Flannel and the bridge delegate from both trying to own the same masquerade behavior. Changing only one layer can produce the opposite of the intended result.

## Inspect the Effective Configuration

```bash
kubectl -n kube-flannel get daemonset kube-flannel-ds \
  -o jsonpath='{.spec.template.spec.containers[?(@.name=="kube-flannel")].args}'
echo

kubectl -n kube-flannel get configmap kube-flannel-cfg \
  -o jsonpath='{.data.cni-conf\.json}'
echo

sudo cat /run/flannel/subnet.env
sudo sed -n '1,240p' /etc/cni/net.d/10-flannel.conflist
```

Flannel's command-line default is currently `--ip-masq=false`, but the upstream Kubernetes manifest explicitly supplies `--ip-masq`. A normal upstream installation therefore writes:

```text
FLANNEL_IPMASQ=true
```

Because the default CNI delegate omits `ipMasq`, the Flannel CNI plugin then passes `ipMasq: false` to the bridge delegate. Flannel owns the cluster-wide egress rule in that arrangement.

Inspect both possible rule APIs:

```bash
iptables --version
sudo iptables-save -t nat | grep -i -C 3 flannel
sudo nft list ruleset | grep -i -C 3 flannel
```

Chain and rule names are implementation details and can change. Use comments, CIDRs, counters, and the pinned source version to identify ownership.

## Decide What the Destination Should See

Enable masquerading when:

- Pods need internet or shared-network egress and external routers have no Pod CIDR routes.
- External firewall policy is intentionally based on node or egress addresses.
- Return routing to ephemeral per-node Pod CIDRs is impractical.

Preserve pod source IPs when:

- An external private network has explicit return routes for every active Pod CIDR.
- Applications or firewalls require pod-level source identity.
- Direct external-to-pod routing is part of the supported design.
- The security team accepts Pod CIDRs as routed infrastructure addresses.

Flannel's `--ip-masq` is a broad outside-the-Flannel-network choice, not a destination exception-list interface. Selective NAT usually belongs at a controlled egress router or in a deliberately managed masquerade component, not in hand-edited rules that Flannel may reconcile.

## Configure the Standard Masqueraded Design

In the managed DaemonSet source, retain:

```yaml
args:
  - --ip-masq
  - --kube-subnet-mgr
```

Leave `delegate.ipMasq` unset or explicitly false in the CNI configuration. Do not set both Flannel and bridge masquerading to true.

After rollout:

```bash
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds \
  --timeout=5m
sudo grep '^FLANNEL_IPMASQ=' /run/flannel/subnet.env
```

Test a new connection from a pod to a controlled external server and observe the source there. Existing conntrack entries can preserve an earlier NAT decision, so do not rely only on a long-lived connection.

## Configure Source Preservation Deliberately

To preserve Pod IPs for destinations outside the Flannel network, two settings must agree:

1. Remove `--ip-masq` from the `kube-flannel` container arguments so `flanneld` writes `FLANNEL_IPMASQ=false` and does not create its outside-network masquerade rule.
2. Set `"ipMasq": false` explicitly inside the CNI `delegate`, preventing the plugin from deriving the inverse value (`true`) for the bridge delegate.

The relevant CNI fragment becomes:

```json
{
  "type": "flannel",
  "delegate": {
    "hairpinMode": true,
    "isDefaultGateway": true,
    "ipMasq": false
  }
}
```

Make both changes in the managed manifest or Helm values. Restart the Flannel DaemonSet so the new subnet file and host conflist are installed:

```bash
kubectl -n kube-flannel rollout restart daemonset/kube-flannel-ds
kubectl -n kube-flannel rollout status daemonset/kube-flannel-ds \
  --timeout=5m
```

Disabling `--ip-masq` stops Flannel from ensuring its outside-network masquerade rules, but a restart does not guarantee that same-backend rules created by the earlier configuration are removed. Inventory the exact rules before and after the rollout:

```bash
sudo iptables-save -t nat | grep -E 'FLANNEL|flannel' || true
sudo nft list ruleset | grep -i flannel || true
```

If old Flannel masquerade rules remain, remove or reconcile only those identified rules through a version-tested, tightly scoped maintenance procedure. Never flush the NAT table. The bridge plugin also applies IP masquerade through CNI lifecycle operations, so roll workloads through their controllers during the maintenance window. Finally, verify the rules again and observe a new connection at the destination; existing conntrack entries can retain the earlier NAT decision.

## Build the Required Return Path

Without SNAT, the external destination replies directly to the Pod IP. Its network must route each per-node Pod CIDR through a reachable node address, for example:

```text
10.244.1.0/24 via 192.0.2.11
10.244.2.0/24 via 192.0.2.12
10.244.3.0/24 via 192.0.2.13
```

Validate on the external router and destination:

```bash
ip route get <pod-ip>
```

Validate on the owning node:

```bash
ip route get <pod-ip>
sysctl net.ipv4.ip_forward
```

Host firewall policies must permit forwarding in both directions. Strict reverse-path filtering can also reject an intentionally asymmetric multi-homed design. Change it only after proving the route asymmetry and reviewing the security impact.

## Distinguish kube-proxy Source NAT

Kubernetes Services introduce their own source-IP behavior. kube-proxy may perform SNAT for NodePort, LoadBalancer, external traffic policies, and hairpin cases depending on proxy mode and topology. Flannel's `--ip-masq` does not control those decisions.

Test these paths separately:

- Pod IP to external IP: Flannel/bridge egress masquerade.
- Pod to ClusterIP: kube-proxy Service path.
- External client to NodePort or LoadBalancer: Service traffic policy.
- External client routed directly to Pod IP: external routing plus Flannel source preservation.

Use packet capture at the pod, node egress interface, and destination to identify exactly where the source changes.

## Avoid Conflicting NAT Owners

firewalld zone masquerade, a cloud NAT gateway, an egress gateway, the CNI bridge plugin, Flannel, and kube-proxy can all translate in different paths. Document one owner for each flow and check counters. Flannel's `EnableNFTables` option remains experimental in current documentation; do not switch rule APIs as an incidental part of a source-IP change.

Never use `iptables -t nat -F` or `nft flush ruleset` to clear old observations. Those destructive commands remove Service and security state shared by the node.

## Official Documentation

- [Flannel configuration: `--ip-masq`](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md#key-command-line-options)
- [Flannel CNI plugin: derived delegate `ipMasq`](https://github.com/flannel-io/cni-plugin)
- [CNI bridge plugin: `ipMasq` and backends](https://www.cni.dev/plugins/current/main/bridge/)
- [Kubernetes: Using Source IP](https://kubernetes.io/docs/tutorials/services/source-ip/)
- [firewalld masquerade reference](https://firewalld.org/documentation/man-pages/firewall-cmd)

## Conclusion

Use Flannel masquerading when external networks do not route Pod CIDRs. To preserve Pod IPs, disable Flannel's outside-network masquerade and explicitly keep the CNI delegate's `ipMasq` false, then provide return routes and forwarding policy for every node subnet. Verify new flows at the destination and keep kube-proxy's separate Service NAT behavior out of the diagnosis.
