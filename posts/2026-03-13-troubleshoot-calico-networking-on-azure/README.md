# Troubleshoot Calico Networking on Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Azure, Cloud, Troubleshooting

Description: Diagnose and resolve common Calico networking failures on Azure, including IP forwarding issues, NSG blocking, and VXLAN encapsulation problems on self-managed Kubernetes clusters.

---

## Introduction

Calico networking failures on Azure have a distinct set of root causes compared to other cloud providers. Azure's platform network virtualization enforces source and destination IP validation unless IP forwarding is enabled, and custom NSG rules can override Azure's default VirtualNetwork allow rules. These platform constraints are often the cause of pod networking failures that appear to be Calico misconfigurations but are actually Azure infrastructure issues.

This guide covers the most common failure scenarios for Calico on Azure and provides step-by-step diagnosis and resolution for each.

## Prerequisites

- Azure CLI authenticated with VM and network permissions
- `kubectl` and `calicoctl` with cluster admin access
- SSH access to cluster nodes or ability to run privileged pods
- `tcpdump` available on nodes

## Issue 1: Pods on Different Nodes Cannot Communicate

**Symptom**: `ping` between pods on the same node works, but fails across nodes.

**Diagnosis Flow:**

```mermaid
graph TD
    A[Cross-node pod ping fails] --> B{IP Forwarding enabled?}
    B -->|No| C[Enable on all VM NICs]
    B -->|Yes| D{NSG allows VXLAN?}
    D -->|No| E[Add UDP 4789 Allow rule]
    D -->|Yes| F{Check encapsulation mode}
    F -->|None - native routing| G[Add Azure route table entries]
    F -->|VXLAN| H[Check Felix logs for errors]
```

**Check IP Forwarding:**

```bash
az network nic show --ids /subscriptions/.../networkInterfaces/worker-1-nic \
  --query "enableIPForwarding"
# If false:

az network nic update --ids /subscriptions/.../networkInterfaces/worker-1-nic \
  --ip-forwarding true
```

## Issue 2: NSG Blocking VXLAN Traffic

**Symptom**: Packets sent but not received on destination node. `tcpdump` on sender shows packets, but receiver shows nothing.

```bash
# On sender node
tcpdump -i eth0 udp port 4789 -n

# On receiver node
tcpdump -i eth0 udp port 4789 -n
# If sender shows traffic but receiver doesn't: NSG is dropping it
```

**Resolution:**

```bash
az network nsg rule create \
  --resource-group k8s-rg \
  --nsg-name k8s-workers-nsg \
  --name AllowCalicoVXLAN \
  --priority 200 \
  --direction Inbound \
  --protocol Udp \
  --destination-port-ranges 4789 \
  --source-address-prefixes VirtualNetwork \
  --access Allow
```

## Issue 3: Native Routing Mode - Missing Route Table Entry

**Symptom**: VXLAN is disabled and Azure UDR/native routing is configured, but cross-node traffic fails.

```bash
# Check if pod CIDR routes exist
az network route-table route list \
  --resource-group k8s-rg \
  --route-table-name k8s-routes \
  --output table

# Find the Calico IPAM blocks assigned to the node
kubectl get blockaffinities.crd.projectcalico.org -o custom-columns=NODE:.spec.node,CIDR:.spec.cidr,STATE:.spec.state | grep worker-2
```

If the pod CIDR for a node is missing from the route table, add it:

```bash
az network route-table route create \
  --resource-group k8s-rg \
  --route-table-name k8s-routes \
  --name worker-2-pods \
  --address-prefix 192.168.2.0/24 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address 10.240.0.11
```

## Issue 4: Felix CrashLoopBackOff on Azure

```bash
kubectl logs -n calico-system ds/calico-node --previous | tail -50
```

Common Azure-specific Felix failures:
- Cannot determine the correct node IP (use `IP=autodetect` or specify `IP_AUTODETECTION_METHOD=interface=eth0`)
- Autodetection selects an address that is not routable on the Azure VNet

```yaml
# Fix node IP autodetection
env:
  - name: IP_AUTODETECTION_METHOD
    value: "interface=eth0"
```

## Issue 5: DNS Resolution Failures

```bash
kubectl run test --image=busybox --rm -it -- nslookup kubernetes.default
# If this fails, check CoreDNS pods
kubectl get pods -n kube-system | grep coredns
```

If CoreDNS runs on another node, treat this as a cross-node pod/service traffic issue first. Also check network policies or node firewall rules that might block UDP/TCP 53.

## Conclusion

Azure Calico troubleshooting starts with two platform-specific checks: IP Forwarding on VM NICs and NSG rules for VXLAN. These cover the majority of cross-node connectivity failures. For more complex issues, `tcpdump` on the VXLAN interface (`vxlan.calico`) provides direct visibility into whether encapsulated packets are being sent and received correctly.
