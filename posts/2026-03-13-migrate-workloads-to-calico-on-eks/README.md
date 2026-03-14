# Migrate Workloads to Calico on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, EKS, AWS

Description: A comprehensive guide to installing Calico network policy on Amazon EKS, replacing the default AWS CNI network policy with Calico's advanced policy engine for richer traffic control.

---

## Introduction

Amazon EKS uses the AWS VPC CNI plugin for pod networking, which provides native VPC IP addresses for pods. However, EKS's built-in network policy support is limited compared to what Calico offers. By adding Calico as a network policy engine on top of the AWS VPC CNI, you get the best of both worlds: native VPC networking with Calico's powerful GlobalNetworkPolicy, namespace isolation, and egress controls.

This approach - running Calico for policy while keeping the AWS VPC CNI for IPAM and routing - is the recommended pattern for EKS. Calico operates as a pure policy engine in this mode, using iptables or eBPF to enforce rules without replacing the existing data plane.

This guide walks through installing Calico on an existing EKS cluster, migrating your network policies, and validating that all workloads maintain connectivity under the new policy model.

## Prerequisites

- EKS cluster v1.27+ with worker nodes
- `kubectl` configured for the EKS cluster (`aws eks update-kubeconfig`)
- `calicoctl` v3.27+ installed
- IAM permissions for EKS management
- Existing network policies (if any) exported and ready for conversion
- `eksctl` v0.150+ (optional but recommended)

## Step 1: Disable AWS Network Policy on Existing Node Groups

Before installing Calico, disable the AWS VPC CNI's network policy functionality to avoid conflicts.

Update the aws-node DaemonSet to disable the AWS network policy controller:

```bash
# Disable the AWS network policy controller to avoid conflicts with Calico
kubectl set env daemonset aws-node \
  -n kube-system \
  ENABLE_NETWORK_POLICY_CONTROLLER=false

# Restart the aws-node DaemonSet to apply the change
kubectl rollout restart daemonset aws-node -n kube-system

# Verify the environment variable was applied
kubectl get daemonset aws-node -n kube-system -o jsonpath='{.spec.template.spec.containers[*].env}'
```

## Step 2: Install Calico on EKS

Install Calico using the operator-based installation targeting EKS.

Apply the Tigera operator and configure it for EKS policy-only mode:

```bash
# Install the Tigera operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for the operator to be ready
kubectl wait --for=condition=available deployment tigera-operator -n tigera-operator --timeout=120s
```

Create an Installation resource that uses the existing AWS VPC CNI for networking:

```yaml
# calico-eks-installation.yaml - Calico policy-only mode for EKS
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # EKS uses AWS VPC CNI, so we set Calico to policy-only mode
  kubernetesProvider: EKS
  cni:
    type: AmazonVPC         # Keep AWS VPC CNI for pod networking
  calicoNetwork:
    bgp: Disabled           # BGP not needed in policy-only mode
```

Apply the installation configuration:

```bash
kubectl create -f calico-eks-installation.yaml
```

## Step 3: Verify Calico Installation

Confirm that Calico is running correctly alongside the AWS VPC CNI.

Check that all Calico components are healthy and nodes are recognized:

```bash
# Watch Calico system pods come up
kubectl get pods -n calico-system -w

# Verify all nodes are registered with Calico
calicoctl get nodes

# Check that Calico is operating in policy-only mode
calicoctl get installation default -o yaml | grep -A5 cni
```

## Step 4: Migrate Network Policies to Calico

Convert any existing Kubernetes NetworkPolicy objects to Calico NetworkPolicy for enhanced capabilities.

Apply a Calico GlobalNetworkPolicy to enforce cluster-wide default-deny:

```yaml
# eks-global-deny.yaml - default deny all ingress at cluster level
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-ingress
spec:
  selector: "projectcalico.org/orchestrator == 'k8s'"
  order: 1000
  types:
  - Ingress
  ingress: []
---
# eks-allow-dns.yaml - allow DNS resolution for all pods
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns-egress
spec:
  selector: all()
  order: 100
  types:
  - Egress
  egress:
  - action: Allow
    destination:
      ports:
      - 53
      selector: "k8s-app == 'kube-dns'"
```

Apply the global policies:

```bash
calicoctl apply -f eks-global-deny.yaml
calicoctl apply -f eks-allow-dns.yaml
```

## Step 5: Validate Workload Connectivity

Confirm that Calico policies are correctly enforced without breaking existing workloads.

Run connectivity tests to validate policy enforcement:

```bash
# Deploy two test pods in different namespaces
kubectl run allowed-pod --image=curlimages/curl -n app-ns -- sleep 3600
kubectl run blocked-pod --image=curlimages/curl -n other-ns -- sleep 3600

# Test allowed connectivity
kubectl exec allowed-pod -n app-ns -- curl -s http://backend-service.app-ns:8080/health

# Test that default-deny is working for unauthorized traffic
kubectl exec blocked-pod -n other-ns -- curl --connect-timeout 5 http://backend-service.app-ns:8080/health

# Review Calico policy statistics
calicoctl get globalnetworkpolicies -o wide
```

## Best Practices

- Run Calico in policy-only mode on EKS to preserve native VPC CNI IP management
- Use Calico tiers to separate platform team policies from application team policies
- Enable Calico eBPF mode on EKS for improved performance on high-throughput workloads
- Integrate with AWS CloudTrail for audit logging of policy changes
- Use OneUptime to monitor pod-to-pod connectivity and alert on unexpected policy drops

## Conclusion

Installing Calico on EKS in policy-only mode gives you a powerful, expressive network policy engine without replacing AWS's native VPC networking. The combination of AWS VPC CNI for routing and Calico for policy enforcement is a production-proven pattern used by many large EKS deployments. Complement your Calico policies with OneUptime monitoring to maintain continuous visibility into network connectivity and security compliance.
