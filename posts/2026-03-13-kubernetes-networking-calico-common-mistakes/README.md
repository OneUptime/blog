# How to Avoid Common Mistakes with Kubernetes Networking for Calico Users

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, CNI, Troubleshooting, Networking, Best Practices, IPAM

Description: The most common Kubernetes networking mistakes in Calico environments and how to diagnose and prevent them before they become production outages.

---

## Introduction

Most Kubernetes networking incidents in Calico environments are caused by a small set of recurring mistakes: IP pool exhaustion, misconfigured encapsulation, BGP peering failures, and overlapping CIDRs. These mistakes are not exotic - they happen in well-run organizations because networking configuration is set at cluster creation and rarely revisited until something breaks.

This post catalogs the mistakes with the highest blast radius and provides both prevention strategies and diagnostic procedures so you can fix them quickly when they occur.

## Prerequisites

- A running Calico cluster
- `kubectl` and `calicoctl` access
- Understanding of your cluster's IP pool configuration and encapsulation mode

## Mistake 1: IP Pool Exhaustion

The most painful networking mistake is discovering your IP pool is full when a new deployment tries to schedule pods. IPAM exhaustion causes pod scheduling failures with errors like `IPAM: no more free blocks`.

**Prevention**: Monitor IPAM allocation proactively:
```bash
calicoctl ipam show
# Watch the "Utilization" column - alert at 80%
```

**Fix**: Add a new non-overlapping IP pool:
```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: additional-pool
spec:
  cidr: 10.200.0.0/16
  ipipMode: Always
  natOutgoing: true
EOF
```

New pods will draw from the new pool; existing pods retain their IPs.

## Mistake 2: Overlapping Pod CIDR with the Node Network

If the Calico `IPPool` CIDR overlaps with the node network CIDR, pods on remote nodes become unreachable because node routes and pod routes conflict.

**Symptom**: Cross-node pod-to-pod connectivity fails, but same-node connectivity works.

**Diagnosis**:
```bash
ip route show
# Look for routes where the pod CIDR overlaps with a node network route
calicoctl get ippools -o wide
```

**Prevention**: Always use an RFC 1918 range that does not overlap with your node network, service CIDR, or any external networks your pods must reach.

## Mistake 3: MTU Misconfiguration with Encapsulation

Calico's encapsulation modes (VXLAN, IP-in-IP) add header overhead. If the MTU is not reduced to account for this overhead, pods send packets that exceed the physical MTU, causing silent packet fragmentation or drops.

**Symptom**: Large file transfers fail or hang; small requests work fine.

**Diagnosis**:
```bash
# Check the configured MTU
kubectl get configmap calico-config -n kube-system -o jsonpath='{.data.veth_mtu}'

# Check the actual MTU on a pod interface
kubectl exec pod-b -- ip link show eth0
```

**Fix**: Set the correct MTU in the Calico ConfigMap or installation resource:
- VXLAN: Node MTU minus 50 bytes
- IP-in-IP: Node MTU minus 20 bytes
- No encapsulation: Node MTU

## Mistake 4: BGP Route Advertisement Failure After Node Restart

In BGP mode, if a node restarts and does not re-establish its BGP sessions promptly, remote nodes lose routes to pods on the restarted node.

**Symptom**: Pods on a specific node become unreachable after node restart.

**Diagnosis**:
```bash
calicoctl node status
# Check BGP session state - should show "Established"
```

**Fix**: Ensure BIRD (Calico's BGP daemon) is healthy:
```bash
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i "bird\|bgp"
```

## Mistake 5: Not Configuring `natOutgoing` for Public Internet Access

If `natOutgoing` is not enabled on the IP pool, pods with RFC 1918 IPs attempting to reach the public internet will send packets with their pod IP as the source. These packets will be dropped by the upstream router since pod IPs are not routable externally.

**Symptom**: Pods cannot reach external services; internal connectivity works fine.

**Fix**:
```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"natOutgoing":true}}'
```

## Best Practices

- Monitor IPAM utilization via Prometheus (Calico Felix exposes IPAM metrics) and alert at 75%
- Document your pool CIDR, node CIDR, service CIDR, and all external CIDRs in a network diagram before cluster creation
- Set MTU explicitly in your Calico installation manifest - never rely on auto-detection in production
- Test BGP session recovery by simulating a node restart in your lab before production rollout

## Conclusion

The most common Calico networking mistakes are preventable through upfront capacity planning (IPAM sizing), careful CIDR design (no overlaps), correct MTU configuration, BGP health monitoring, and proper NAT settings. Building a pre-deployment checklist that covers these five areas will prevent the majority of production networking incidents in Calico environments.
