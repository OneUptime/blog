# Verify Pod Networking with Calico on Self-Managed GCE Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Verification, GCE, Google Cloud, Self-Managed

Description: Learn how to verify Calico pod networking on a self-managed Kubernetes cluster running on Google Compute Engine, including VPC firewall rules, IPIP mode support, and cross-zone connectivity...

---

## Introduction

Google Compute Engine (GCE) supports self-managed Kubernetes clusters with Calico as the CNI plugin. GCE's Virtual Private Cloud supports both IP-in-IP and VXLAN encapsulation, making both overlay modes viable. However, GCE VPC firewall rules must explicitly allow the encapsulation protocol - IP-in-IP (protocol 4) is not allowed by default and must be added.

GCE also supports native routing without overlay if you enable VPC native routing and add per-node pod CIDR routes to the VPC routing table. This is the highest-performance option but requires more configuration. The most common choice for self-managed clusters is Calico with IPIP or VXLAN, which provides a good balance of simplicity and performance.

This guide covers verification of pod networking for self-managed Kubernetes on GCE.

## Prerequisites

- Self-managed Kubernetes cluster on GCE instances
- Calico installed as the CNI plugin
- `gcloud` CLI configured
- `calicoctl` CLI configured
- `kubectl` with cluster admin access

## Step 1: Configure GCE Firewall Rules for Calico

Create GCE VPC firewall rules to allow Calico networking protocols.

```bash
# Get the network name used by your GCE instances
NETWORK=<your-gce-network>
PROJECT=<your-gcp-project>

# Create firewall rule allowing IP-in-IP between cluster nodes
gcloud compute firewall-rules create calico-ipip \
  --project=$PROJECT \
  --network=$NETWORK \
  --action=ALLOW \
  --rules=ipip \
  --source-ranges=<node-cidr>/16 \
  --target-tags=k8s-node

# Or create firewall rule for VXLAN if using that mode
gcloud compute firewall-rules create calico-vxlan \
  --project=$PROJECT \
  --network=$NETWORK \
  --action=ALLOW \
  --rules=udp:4789 \
  --source-ranges=<node-cidr>/16 \
  --target-tags=k8s-node

# Verify firewall rules are created
gcloud compute firewall-rules list --filter="name:calico*"
```

## Step 2: Verify Calico Configuration for GCE

Check that Calico is properly configured for the GCE environment.

```bash
# Check Calico node pod status
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide

# Verify IP pool and encapsulation mode
calicoctl get ippool -o wide

# For GCE with IPIP (cross-subnet mode recommended)
calicoctl get ippool default-ipv4-ippool -o yaml | grep -E "ipipMode|vxlanMode"
```

```yaml
# ippool-gce-ipip.yaml - GCE-compatible IP pool with cross-subnet IPIP
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  # CrossSubnet only encapsulates when crossing subnet boundaries
  ipipMode: CrossSubnet
  vxlanMode: Never
  natOutgoing: true
  disabled: false
```

## Step 3: Test Pod Connectivity Within a GCE Zone

Validate pod-to-pod connectivity between instances in the same zone.

```bash
# Deploy test pods in the same zone
kubectl run pod-a --image=busybox:1.28 \
  --overrides='{"spec":{"nodeSelector":{"topology.kubernetes.io/zone":"us-central1-a"}}}' \
  --restart=Never -- sleep 3600

kubectl run pod-b --image=busybox:1.28 \
  --overrides='{"spec":{"nodeSelector":{"topology.kubernetes.io/zone":"us-central1-a"}}}' \
  --restart=Never -- sleep 3600

# Test intra-zone connectivity (may use direct routing without encapsulation)
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c 5 $POD_B_IP
```

## Step 4: Test Cross-Zone Pod Connectivity

Validate that pods in different GCE zones can communicate (requires firewall rules).

```bash
# Deploy pods in different zones
kubectl run pod-zone-a --image=busybox:1.28 \
  --overrides='{"spec":{"nodeSelector":{"topology.kubernetes.io/zone":"us-central1-a"}}}' \
  --restart=Never -- sleep 3600

kubectl run pod-zone-b --image=busybox:1.28 \
  --overrides='{"spec":{"nodeSelector":{"topology.kubernetes.io/zone":"us-central1-b"}}}' \
  --restart=Never -- sleep 3600

# Test cross-zone connectivity (requires IPIP or VXLAN encapsulation)
POD_ZONE_B_IP=$(kubectl get pod pod-zone-b -o jsonpath='{.status.podIP}')
kubectl exec pod-zone-a -- ping -c 5 $POD_ZONE_B_IP
```

## Step 5: Validate Service Connectivity and DNS

Verify Kubernetes service resolution and access from pods.

```bash
# Test DNS resolution
kubectl exec pod-a -- nslookup kubernetes.default.svc.cluster.local

# Test Kubernetes API service
KUBE_SVC_IP=$(kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}')
kubectl exec pod-a -- nc -zv $KUBE_SVC_IP 443

# Verify external access works
kubectl exec pod-a -- wget -qO- --timeout=5 https://www.googleapis.com/
```

## Best Practices

- Use `ipipMode: CrossSubnet` on GCE for optimal performance - no encapsulation within a zone, IPIP only across zones
- Apply GCE firewall rules using network tags for easier management across instance groups
- Test connectivity across availability zones as GCE inter-zone routing differs from intra-zone
- Monitor GCE firewall rule hits to confirm Calico overlay traffic is being allowed
- Enable GCE VPC Flow Logs to gain visibility into cross-node traffic patterns

## Conclusion

Verifying Calico pod networking on self-managed GCE Kubernetes requires proper VPC firewall configuration, appropriate encapsulation mode selection, and cross-zone connectivity testing. GCE's support for IP-in-IP makes it a good platform for Calico with CrossSubnet IPIP mode, providing native routing within zones and encapsulation only where needed. Always verify connectivity across zone boundaries in addition to within-zone tests.
