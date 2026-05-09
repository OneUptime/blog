# How to Troubleshoot Installation Issues with Calico on Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, Rancher, CNI

Description: Diagnose and resolve common Calico installation issues on Rancher-managed Kubernetes clusters.

---

## Introduction

Calico installation issues on Rancher clusters can stem from Rancher's own infrastructure requirements, RKE/RKE2 version compatibility, node operating system variations, and cloud provider network configurations. The combination of Rancher's management layer and Calico's networking layer introduces more potential points of failure than a simple single-node installation.

Rancher provides its own diagnostic tools through the UI and `kubectl` access, while Calico-specific diagnostics require calicoctl and log inspection. Effective troubleshooting requires using both toolsets together to correlate Rancher cluster events with Calico component behavior.

This guide covers systematic troubleshooting for Calico on Rancher clusters, from initial symptom identification through targeted remediation.

## Prerequisites

- Rancher-managed cluster with Calico installation issues
- kubectl configured with Rancher cluster kubeconfig
- calicoctl installed
- SSH access to cluster nodes (optional but helpful)

## Step 1: Check Rancher Cluster Status

In the Rancher UI:
1. Check the cluster health indicator
2. Navigate to **Events** to see recent cluster events
3. Check **Conditions** on the cluster detail page

Via kubectl:

```bash
kubectl get nodes
kubectl describe node <node-name> | grep -A10 Conditions
```

## Step 2: Check Calico Pod Status

```bash
kubectl get pods -n kube-system | grep calico
kubectl describe pod -n kube-system -l k8s-app=calico-node
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=100
```

## Step 3: Check RKE Cluster Logs

For RKE1 clusters, check the network plugin deploy job and RKE-managed component logs. RKE1 reached end of life on July 31, 2025, and Rancher 2.12.0 and later no longer support provisioning or managing downstream RKE1 clusters:

```bash
kubectl -n kube-system get pods -l job-name=rke-network-plugin-deploy-job \
  --no-headers -o custom-columns=NAME:.metadata.name | \
  xargs -L1 kubectl -n kube-system logs

docker logs kubelet
docker logs kube-proxy
```

## Step 4: Resolve CIDR Conflicts

Rancher clusters may conflict with existing network ranges:

```bash
kubectl get pods -n kube-system -o wide
calicoctl get ippool -o yaml | grep cidr
```

If conflicting, update via Rancher cluster edit:
1. Go to **Edit Cluster** in Rancher UI
2. Under **Advanced Options**, change the **Pod CIDR**

Note: Pod CIDR changes require cluster rebuild. To migrate Calico IP allocations, create a new non-overlapping IPPool, disable the old pool so it stops receiving new allocations, then restart affected pods after verifying the new pool:

```bash
calicoctl create -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: new-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  ipipMode: Always
  natOutgoing: true
EOF

calicoctl patch ippool default-ipv4-ippool -p '{"spec":{"disabled":true}}'
kubectl delete pod -A --all
```

## Step 5: Fix Cloud Provider Network Issues

For Rancher clusters on AWS or GCP, security groups or firewall rules may block IPIP. On Azure, IPIP packets are blocked by the Azure network fabric:

```bash
# Check if IPIP protocol (protocol 4) is allowed between nodes

# AWS: Check Security Groups allow protocol 4
# GCP: Check firewall rules allow protocol 4
```

Switch to VXLAN to use UDP 4789 traffic:

```bash
calicoctl patch ippool default-ipv4-ippool \
  -p '{"spec":{"ipipMode":"Never","vxlanMode":"Always"}}'
kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 6: Check Node-to-Node Communication

```bash
# From node 1, test connectivity to node 2
kubectl debug node/<node1> -it --image=ubuntu -- bash
apt-get update && apt-get install -y iputils-ping
ping <node2-ip>
```

## Step 7: Rancher Cluster Recovery

If Calico is blocking Rancher's cluster management:

```bash
# Force Rancher to reconcile the cluster
# In Rancher UI: Cluster > Edit > Save (without changes)
```

## Conclusion

Troubleshooting Calico on Rancher clusters requires combining Rancher's cluster diagnostics with Calico-specific tools. Cloud provider security groups blocking IPIP traffic and CIDR conflicts are the most common issues. Switching to VXLAN encapsulation resolves most cloud provider network restriction issues quickly.
