# Configure Calico on Self-Managed AWS Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: calico, aws, kubernetes, self-managed, cni, networking

Description: A step-by-step guide to installing Calico on a self-managed Kubernetes cluster running on AWS EC2, covering both the CNI and network policy configuration for cloud environments.

---

## Introduction

Running self-managed Kubernetes on AWS gives you full control over the cluster configuration, including the CNI plugin. Unlike EKS which manages the control plane, self-managed clusters let you choose and configure Calico without managed service constraints, including full Calico IPAM, BGP route advertisement to AWS VPC, and custom encapsulation settings.

Calico integrates well with AWS networking. You can run Calico with VXLAN or IP-in-IP encapsulation for overlay networking, or configure Calico to advertise pod routes via BGP to leverage AWS VPC routing without encapsulation overhead.

This guide covers deploying kubeadm-based Kubernetes on AWS EC2 with Calico as the CNI, with appropriate configuration for the AWS networking environment.

## Prerequisites

- AWS EC2 instances with Ubuntu 22.04 (1 control plane, 2+ workers)
- Security groups configured to allow pod-to-pod traffic between nodes
- kubeadm, kubelet, and kubectl installed on all nodes
- `calicoctl` CLI available

## Step 1: Initialize the Kubernetes Cluster

Initialize the cluster with a pod CIDR that doesn't overlap with the AWS VPC.

```bash
# On the control plane node — initialize kubeadm with the pod CIDR
# Use a CIDR that doesn't overlap with your VPC or other networks
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)

# Set up kubectl for the admin user
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Save the join command for worker nodes
kubeadm token create --print-join-command
```

## Step 2: Install Calico via the Tigera Operator

Deploy Calico using the Tigera operator on the fresh cluster.

```bash
# Install the Tigera Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Verify the operator pod is running
kubectl get pods -n tigera-operator
```

```yaml
# calico-aws-installation.yaml
# Calico installation for self-managed AWS with VXLAN cross-subnet
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - name: default-ipv4-ippool
      # Match the pod CIDR used in kubeadm init
      cidr: 192.168.0.0/16
      # CrossSubnet VXLAN: no encapsulation for same-subnet, VXLAN for cross-subnet
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
# Apply the installation resource
kubectl apply -f calico-aws-installation.yaml

# Monitor Calico installation progress
kubectl get tigerastatus --watch

# Verify all Calico pods are running
kubectl get pods -n calico-system
```

## Step 3: Join Worker Nodes

Add worker nodes to the cluster.

```bash
# On each worker node, run the join command from Step 1
# Example (use your actual token and hash):
sudo kubeadm join <control-plane-ip>:6443 \
  --token <token> \
  --discovery-token-ca-cert-hash sha256:<hash>

# Verify all nodes join and get Ready status
kubectl get nodes --watch
```

## Step 4: Configure AWS Security Groups for Calico

Ensure AWS security groups allow the necessary Calico traffic.

```bash
# Required security group rules for Calico with VXLAN:
# - VXLAN: UDP port 4789 between all cluster nodes
# - BGP (if enabled): TCP port 179 between all cluster nodes
# - Calico Typha: TCP port 5473 from nodes to Typha instances

# Using AWS CLI to add the VXLAN rule to your cluster security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-<your-cluster-sg-id> \
  --protocol udp \
  --port 4789 \
  --source-group sg-<your-cluster-sg-id>

# Allow Calico Typha traffic
aws ec2 authorize-security-group-ingress \
  --group-id sg-<your-cluster-sg-id> \
  --protocol tcp \
  --port 5473 \
  --source-group sg-<your-cluster-sg-id>
```

## Step 5: Verify Calico Installation

Confirm Calico is operating correctly.

```bash
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o calicoctl && chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/

# Check node status and BGP peering
calicoctl node status

# Verify IP pool configuration
calicoctl get ippools -o wide

# Run a connectivity test
kubectl run test-ping --image=busybox --rm -it -- ping -c 3 <another-pod-ip>
```

## Best Practices

- Disable the AWS source/destination check on EC2 instances if using BGP route advertisement without encapsulation
- Use `VXLANCrossSubnet` mode for hybrid environments where some nodes share a subnet and some do not
- Configure Security Groups to allow all required Calico control plane ports before joining nodes
- Use placement groups to co-locate nodes in the same subnet and reduce encapsulation overhead
- Enable CloudWatch metrics for Calico's Prometheus endpoint to monitor cluster networking health

## Conclusion

Self-managed Kubernetes on AWS with Calico gives you complete control over your networking stack. By configuring Calico with AWS-appropriate encapsulation settings and correct security group rules, you get a production-ready CNI that supports advanced network policies, multiple IP pools, and BGP integration with AWS routing infrastructure.
