# Migrate Workloads to Calico on Self-Managed AWS Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, AWS, Self-Managed

Description: Learn how to migrate workloads to Calico on a self-managed Kubernetes cluster running on AWS EC2, covering CNI replacement, IP pool configuration, and network policy enforcement.

---

## Introduction

Running a self-managed Kubernetes cluster on AWS gives you full control over your infrastructure, but it also means you are responsible for choosing and maintaining your CNI plugin. Many teams start with the default AWS VPC CNI and later discover they need more advanced network policy capabilities, BGP peering support, or fine-grained IPAM control - all areas where Calico excels.

Migrating to Calico on a self-managed AWS cluster is different from managed EKS because you have direct access to the control plane nodes and can adjust kubelet and kube-proxy settings freely. This flexibility makes the migration more straightforward while also requiring careful planning to avoid network disruption.

This guide walks you through replacing your existing CNI with Calico on a self-managed AWS Kubernetes cluster, reconfiguring IP pools to align with your VPC CIDR, and validating that all workloads maintain connectivity throughout the process.

## Prerequisites

- Self-managed Kubernetes cluster on AWS EC2 (kubeadm or similar)
- `kubectl` configured with cluster-admin access
- `calicoctl` v3.27+ installed
- Existing workloads in a non-production namespace for initial testing
- AWS VPC with sufficient CIDR space for Calico IP pools
- Node access via SSH or AWS Systems Manager

## Step 1: Drain and Prepare Nodes

Before replacing the CNI, drain workloads from each node one at a time to maintain availability.

Drain the first node to safely evict all workloads before modifying the CNI:

```bash
# Identify all nodes in the cluster
kubectl get nodes -o wide

# Cordon the first worker node to prevent new scheduling
kubectl cordon ip-10-0-1-100.ec2.internal

# Drain the node, ignoring DaemonSet pods managed by the old CNI
kubectl drain ip-10-0-1-100.ec2.internal \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=120s
```

## Step 2: Remove the Existing CNI Plugin

Delete the current CNI DaemonSet and associated resources before installing Calico.

Remove the existing CNI to free up network configuration on the node:

```bash
# Delete the existing CNI DaemonSet (example for flannel)
kubectl delete daemonset kube-flannel-ds -n kube-flannel

# Remove CNI config files on the drained node (run via SSH or SSM)
sudo rm -f /etc/cni/net.d/10-flannel.conflist
sudo rm -f /opt/cni/bin/flannel

# Restart the kubelet to clear stale network state
sudo systemctl restart kubelet
```

## Step 3: Install Calico

Apply the Calico operator and custom resource definitions on your cluster.

Install Calico using the Tigera operator for production-grade lifecycle management:

```bash
# Install the Tigera operator CRDs and controller
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Download the installation custom resource template
curl -O https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/custom-resources.yaml
```

Configure the Calico installation to match your AWS VPC CIDR:

```yaml
# custom-resources.yaml - configure Calico for self-managed AWS cluster
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use VXLAN encapsulation for cross-AZ traffic compatibility
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16   # Adjust to your pod CIDR
      encapsulation: VXLAN
      natOutgoing: Enabled
      nodeSelector: all()
```

Apply the configuration:

```bash
kubectl create -f custom-resources.yaml
```

## Step 4: Validate Calico Installation

Confirm all Calico components are running and nodes are healthy.

Check that the Calico node DaemonSet is fully rolled out:

```bash
# Wait for all calico-node pods to be Running
kubectl get pods -n calico-system -w

# Verify node status in Calico using calicoctl
calicoctl node status

# Check that BGP peers are established (if using BGP mode)
calicoctl get bgppeers
```

## Step 5: Uncordon and Validate Workloads

Bring the node back into service and verify connectivity.

Uncordon the node and confirm workload pods are rescheduled successfully:

```bash
# Uncordon the node to allow scheduling
kubectl uncordon ip-10-0-1-100.ec2.internal

# Verify pods are running with new Calico-assigned IPs
kubectl get pods -A -o wide | grep ip-10-0-1-100

# Test pod-to-pod connectivity across nodes
kubectl exec -it <pod-name> -- ping <other-pod-ip>
```

## Best Practices

- Migrate one node at a time to limit the blast radius of any issues
- Take VPC Flow Logs snapshots before and after migration for comparison
- Use Calico GlobalNetworkPolicy to enforce a default-deny baseline after migration
- Align Calico IP pool CIDRs with your VPC secondary CIDR ranges to avoid conflicts
- Enable Calico IPAM metrics and monitor via OneUptime for IP exhaustion alerts

## Conclusion

Migrating to Calico on a self-managed AWS Kubernetes cluster gives you powerful network policy enforcement and flexible IPAM that scales with your workload requirements. By following a node-by-node approach and validating connectivity at each step, you can complete the migration with minimal disruption. Pair Calico with OneUptime to continuously monitor network health and alert on policy violations or IP pool exhaustion after the migration is complete.
