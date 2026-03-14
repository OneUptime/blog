# Troubleshoot Calico Installation on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, AKS, Azure

Description: A guide to diagnosing and resolving common issues when installing Calico as the network policy engine on Azure Kubernetes Service (AKS) clusters.

---

## Introduction

Installing Calico on AKS enables advanced network policy capabilities beyond what Azure's built-in network policies provide. However, AKS's managed environment introduces constraints and requirements that can cause Calico installations to fail or behave unexpectedly.

Common issues include conflicts with Azure CNI's IP address management, incorrect Calico manifest configuration for AKS, and permission issues in the AKS managed control plane. Understanding the AKS-specific requirements for Calico is essential for a successful installation.

This guide covers the most frequent installation failures on AKS and how to resolve them.

## Prerequisites

- AKS cluster with Azure CNI networking
- `az` CLI configured with cluster access
- `kubectl` with cluster admin access
- `calicoctl` installed

## Step 1: Verify AKS Network Plugin Compatibility

Confirm the AKS cluster is using a compatible network plugin.

```bash
# Check the network plugin used by the AKS cluster
az aks show --resource-group <rg-name> --name <cluster-name> \
  --query networkProfile.networkPlugin

# Calico network policy is supported with azure and kubenet network plugins
# If using 'none', you need a full Calico CNI installation

# Check if network policy is already configured
az aks show --resource-group <rg-name> --name <cluster-name> \
  --query networkProfile.networkPolicy
```

## Step 2: Install Calico Network Policy on AKS

Apply the Calico manifests appropriate for AKS.

```bash
# Apply Calico network policy manifests for Azure CNI
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-policy-only.yaml

# Check that Calico pods are starting
kubectl get pods -n kube-system -l k8s-app=calico-node -w
```

## Step 3: Diagnose Pod Startup Failures

Investigate Calico pods that fail to start on AKS nodes.

```bash
# Check Calico node pod status
kubectl get pods -n kube-system -l k8s-app=calico-node

# Describe a failing pod for detailed error messages
kubectl describe pod -n kube-system <calico-node-pod>

# Check the Calico node logs
kubectl logs -n kube-system <calico-node-pod>

# Common issues on AKS:
# - RBAC permission errors (AKS restricts some API access)
# - Datastore connection failures
# - Incorrect network interface detection
```

## Step 4: Resolve RBAC and Permission Issues

Fix permission-related failures specific to AKS's managed control plane.

```bash
# Check if required ClusterRoles exist
kubectl get clusterrole | grep calico

# Verify ClusterRoleBindings are in place
kubectl get clusterrolebinding | grep calico

# Check for permission denied errors in Calico logs
kubectl logs -n kube-system <calico-node-pod> | grep -i "forbidden\|permission\|rbac"

# If RBAC resources are missing, reapply the Calico manifest
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-policy-only.yaml
```

## Step 5: Validate Network Policy Enforcement

Test that Calico is enforcing network policies correctly after installation.

```bash
# Create a test namespace and deploy two pods
kubectl create namespace policy-test
kubectl run client --image=busybox -n policy-test -- sleep 3600
kubectl run server --image=nginx -n policy-test

# Verify connectivity before applying a policy (should succeed)
kubectl exec -n policy-test client -- wget -qO- http://server.policy-test.svc.cluster.local

# Apply a deny-all policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: policy-test
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF

# Verify connectivity is now blocked (should time out)
kubectl exec -n policy-test client -- wget -qO- --timeout=5 http://server.policy-test.svc.cluster.local
```

## Best Practices

- Always check AKS version compatibility before installing a specific Calico version
- Use the AKS-specific Calico manifests rather than generic Kubernetes manifests
- Monitor Calico node pod restarts after installation as an indicator of configuration issues
- Test network policy enforcement immediately after installation before adding workloads
- Review AKS release notes when upgrading-Calico compatibility can change

## Conclusion

Installing Calico on AKS requires attention to AKS-specific constraints, including the network plugin in use, RBAC permissions, and version compatibility. By following a systematic installation process and validating network policy enforcement after installation, you can successfully add Calico's capabilities to your AKS cluster.
