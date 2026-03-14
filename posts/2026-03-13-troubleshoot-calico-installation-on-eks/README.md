# How to Troubleshoot Installation Issues with Calico on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, EKS, AWS

Description: Diagnose and resolve common Calico installation issues on Amazon EKS clusters.

---

## Introduction

Running Calico on EKS allows you to apply Calico network policies to control traffic between pods, providing more expressive policy options than the default Kubernetes NetworkPolicy API. On EKS, Calico typically runs in policy-only mode alongside the AWS VPC CNI plugin, which handles IP address allocation.

Installations on EKS can fail due to version incompatibilities, AWS-specific security group configurations, or conflicts between Calico's default settings and the EKS-managed infrastructure. This guide covers the most common installation issues and their resolutions.

## Prerequisites

- EKS cluster with AWS VPC CNI plugin
- `kubectl` configured for the EKS cluster
- AWS CLI configured with sufficient IAM permissions
- `calicoctl` installed

## Step 1: Choose the Correct Installation Mode

Determine whether you need full Calico CNI or policy-only mode.

```bash
# Check the current CNI plugin on your EKS cluster
kubectl get pods -n kube-system | grep aws-node

# For EKS with AWS VPC CNI, install Calico in policy-only mode
# Full CNI mode replaces AWS VPC CNI - use only if intentional

# Apply Calico for EKS (policy-only mode)
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-vxlan.yaml
```

## Step 2: Diagnose Calico Pod Failures on EKS

Investigate pods that fail to start or crash on EKS nodes.

```bash
# Check Calico DaemonSet status
kubectl get daemonset -n kube-system calico-node

# Identify which nodes have failing pods
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide | grep -v Running

# Check logs for the failing pod
kubectl logs -n kube-system <failing-calico-pod> --previous

# Common EKS-specific errors:
# - "Failed to create tunnel device" - encapsulation mode mismatch
# - "Unable to reach kubernetes API" - network policy blocking control plane access
```

## Step 3: Resolve AWS Security Group Issues

EKS nodes use security groups that may block Calico's required ports.

```bash
# Check what ports Calico needs (BGP: 179, VXLAN: 4789, Typha: 5473)
# Verify security group rules allow these ports between nodes

# List security groups for EKS nodes
aws ec2 describe-security-groups \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=owned" \
  --query 'SecurityGroups[*].[GroupId,GroupName]'

# Check inbound rules for the worker node security group
aws ec2 describe-security-group-rules \
  --filters "Name=group-id,Values=<security-group-id>"
```

## Step 4: Configure Calico for EKS Specific Requirements

Apply EKS-specific Calico configuration to avoid common issues.

```yaml
# felix-config-eks.yaml - Felix configuration optimized for EKS
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Use AWS interface naming for EKS nodes
  interfacePrefix: eni
  # Adjust for AWS VPC CNI chaining
  chainInsertMode: Append
```

```bash
calicoctl apply -f felix-config-eks.yaml
```

## Step 5: Validate Network Policy on EKS

Confirm Calico network policies are enforced after installation.

```bash
# Deploy test pods and validate policy enforcement
kubectl create namespace eks-policy-test
kubectl run -n eks-policy-test server --image=nginx --port=80
kubectl expose -n eks-policy-test pod server --port=80

# Confirm connectivity before policy
kubectl run -n eks-policy-test client --rm -it --image=busybox -- \
  wget -qO- http://server

# Apply a deny-all policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: eks-policy-test
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

# Verify policy is enforced
kubectl run -n eks-policy-test client --rm -it --image=busybox -- \
  wget -T 5 -qO- http://server
```

## Best Practices

- Verify EKS and Calico version compatibility before upgrading either component
- Always install Calico in policy-only mode on EKS unless you intentionally want to replace AWS VPC CNI
- Add required Calico ports to EKS worker node security groups before installation
- Test network policy enforcement in a non-production cluster before enabling in production
- Monitor Calico DaemonSet for pod restarts as an early indicator of configuration issues

## Conclusion

Installing Calico on EKS requires careful attention to the interaction with AWS VPC CNI, security group configurations, and EKS-specific settings. By following the correct installation mode, resolving security group issues, and validating policy enforcement, you can add Calico's advanced network policy capabilities to your EKS cluster successfully.
