# Verify Pod Networking with Calico on Self-Managed DigitalOcean Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, DigitalOcean, Self-Managed

Description: Learn how to verify Calico pod networking on a self-managed Kubernetes cluster running on DigitalOcean Droplets, including firewall rule configuration and overlay mode selection.

---

## Introduction

DigitalOcean Droplets support self-managed Kubernetes clusters with Calico as the CNI plugin. Unlike the managed DOKS service, self-managed deployments on DigitalOcean require you to configure networking manually. DigitalOcean's networking supports both IP-in-IP and VXLAN overlay modes, but DigitalOcean Cloud Firewalls must be explicitly configured to allow the necessary CNI traffic.

The DigitalOcean private network (VPC) provides connectivity between Droplets in the same region. Calico leverages this private network for pod traffic. Without proper Cloud Firewall rules, even Droplets in the same VPC will have their Calico overlay traffic blocked.

This guide covers verification of pod networking for self-managed Kubernetes on DigitalOcean.

## Prerequisites

- Self-managed Kubernetes cluster on DigitalOcean Droplets
- Calico installed as the CNI plugin
- DigitalOcean CLI (`doctl`) configured
- `calicoctl` CLI configured
- `kubectl` with cluster admin access

## Step 1: Check DigitalOcean Cloud Firewall Rules

Verify that DigitalOcean Cloud Firewalls allow the necessary Calico traffic.

```bash
# List Cloud Firewalls for your cluster
doctl compute firewall list

# Get the firewall rules for your cluster firewall
FIREWALL_ID=<firewall-id>
doctl compute firewall get $FIREWALL_ID

# Add inbound rule for IPIP (protocol 4) between cluster nodes
doctl compute firewall add-rules $FIREWALL_ID \
  --inbound-rules "protocol:icmp,address:10.0.0.0/8 protocol:tcp,ports:all,address:10.0.0.0/8 protocol:udp,ports:all,address:10.0.0.0/8"

# Note: For IPIP, use DigitalOcean VPC-level rules as doctl may not support protocol 4 directly
```

## Step 2: Verify Calico Installation and IP Pool

Confirm Calico is running with the correct configuration for DigitalOcean.

```bash
# Check Calico component status
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide

# Verify IP pool configuration
calicoctl get ippool -o wide

# Check encapsulation mode (VXLAN recommended for DigitalOcean)
calicoctl get ippool default-ipv4-ippool -o yaml | grep -E "ipipMode|vxlanMode"
```

```yaml
# ippool-do-vxlan.yaml - recommended VXLAN config for DigitalOcean
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  # Use VXLAN for reliable operation on DigitalOcean
  vxlanMode: Always
  ipipMode: Never
  natOutgoing: true
  disabled: false
```

## Step 3: Verify Node-to-Node Private Network Connectivity

Confirm that DigitalOcean Droplets can communicate over the private network.

```bash
# Get private IP addresses of all nodes
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.addresses[?(@.type=="InternalIP")].address}{"\n"}{end}'

# Test ICMP connectivity between nodes on private network
kubectl debug node/<node-1> -it --image=ubuntu -- ping -c 3 <node-2-private-ip>

# Test VXLAN UDP connectivity between nodes (port 4789)
kubectl debug node/<node-1> -it --image=ubuntu -- nc -zuv <node-2-private-ip> 4789
```

## Step 4: Test Pod-to-Pod Connectivity Across Droplets

Deploy test pods and validate cross-node communication.

```bash
# Deploy test pods on different nodes
kubectl run pod-a --image=busybox:1.28 \
  --overrides='{"spec":{"nodeName":"<droplet-1-hostname>"}}' \
  --restart=Never -- sleep 3600

kubectl run pod-b --image=busybox:1.28 \
  --overrides='{"spec":{"nodeName":"<droplet-2-hostname>"}}' \
  --restart=Never -- sleep 3600

# Test connectivity
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 5 $POD_B_IP

# Test DNS and service connectivity
kubectl exec pod-a -- nslookup kubernetes.default.svc.cluster.local
```

## Step 5: Validate External Connectivity via NAT

Verify that pods can reach external services through Calico's NAT.

```bash
# Test outbound internet connectivity from a pod
kubectl exec pod-a -- wget -qO- --timeout=10 https://icanhazip.com

# Verify the IP shown is the Droplet's public IP (indicating NAT is working)
# Compare with the Droplet's public IP
doctl compute droplet get <droplet-name> --format PublicIPv4

# Check Calico natOutgoing is enabled in the IP pool
calicoctl get ippool -o yaml | grep natOutgoing
```

## Best Practices

- Use VXLAN mode for reliable overlay networking on DigitalOcean
- Apply DigitalOcean Cloud Firewall rules using both VPC CIDR and Droplet tags for flexibility
- Enable monitoring on your cluster to catch VXLAN tunnel failures early
- Test connectivity after any DigitalOcean VPC or firewall configuration change
- Use a private Floating IP if you need persistent external access to cluster nodes

## Conclusion

Verifying Calico pod networking on self-managed DigitalOcean Kubernetes requires confirming VXLAN mode configuration, DigitalOcean Cloud Firewall rules, private network connectivity between Droplets, and actual cross-node pod communication. DigitalOcean's VPC provides reliable private networking that works well with Calico VXLAN, but firewall rules must be carefully configured to avoid blocking overlay traffic between Droplets.
