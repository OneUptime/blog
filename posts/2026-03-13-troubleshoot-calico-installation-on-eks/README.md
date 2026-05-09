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

# For EKS with AWS VPC CNI, install Calico in Amazon VPC mode
# Full Calico CNI mode replaces AWS VPC CNI - use only if intentional

# Do not enable the AWS VPC CNI network policy feature when Calico enforces policy
cat <<EOF > append.yaml
- apiGroups:
  - ""
  resources:
  - pods
  verbs:
  - patch
EOF

kubectl apply -f <(cat <(kubectl get clusterrole aws-node -o yaml) append.yaml)
kubectl set env -n kube-system daemonset/aws-node ANNOTATE_POD_IP=true

# Install the Tigera operator and Calico for EKS with Amazon VPC CNI
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml

kubectl create -f - <<EOF
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  kubernetesProvider: EKS
  cni:
    type: AmazonVPC
  calicoNetwork:
    bgp: Disabled
EOF
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

EKS nodes use security groups that may block node-to-node or control-plane traffic. In the standard EKS policy-only installation with AWS VPC CNI, Calico does not use BGP or VXLAN. Those ports are only relevant if you intentionally install Calico for full networking or enable those features.

```bash
# For policy-only mode, verify node security groups allow expected
# cluster traffic, including node-to-node traffic if you restrict
# the default EKS cluster security group.

# If you intentionally use full Calico networking, check the ports
# for the enabled mode, such as BGP: 179, VXLAN: 4789, or Typha: 5473.

# List security groups for EKS nodes
aws ec2 describe-security-groups \
  --filters "Name=tag:kubernetes.io/cluster/<cluster-name>,Values=owned,shared" \
  --query 'SecurityGroups[*].[GroupId,GroupName]'

# Check inbound rules for the worker node security group
aws ec2 describe-security-group-rules \
  --filters "Name=group-id,Values=<security-group-id>"
```

## Step 4: Configure Calico for EKS Specific Requirements

Apply EKS-specific Calico configuration to avoid common issues.

```yaml
# felix-config-eks.yaml - Felix configuration for AWS VPC CNI interfaces
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Use AWS VPC CNI workload interface naming when using manifest-based installs
  interfacePrefix: eni
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
- Add Calico networking ports to EKS worker node security groups only when you intentionally enable BGP, VXLAN, or Typha traffic between nodes
- Test network policy enforcement in a non-production cluster before enabling in production
- Monitor Calico DaemonSet for pod restarts as an early indicator of configuration issues

## Conclusion

Installing Calico on EKS requires careful attention to the interaction with AWS VPC CNI, security group configurations, and EKS-specific settings. By following the correct installation mode, resolving security group issues, and validating policy enforcement, you can add Calico's advanced network policy capabilities to your EKS cluster successfully.
