# Troubleshoot Calico Installation on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, GKE, Google Cloud

Description: A guide to diagnosing and resolving common issues when installing and running Calico on Google Kubernetes Engine (GKE) clusters.

---

## Introduction

Google Kubernetes Engine (GKE) clusters use Google's proprietary CNI plugin and network infrastructure. Running Calico on GKE requires operating in policy-only mode-Calico handles network policy enforcement while GKE's CNI handles IP allocation and routing.

GKE-specific constraints include the managed control plane's restrictions, GKE's default use of Dataplane V2 (which is built on Cilium), and the requirement to use node-pool-level configurations for some settings. Understanding these constraints is essential for troubleshooting Calico on GKE.

This guide covers common Calico installation issues on GKE and provides targeted solutions.

## Prerequisites

- GKE cluster with `gcloud` CLI access
- `kubectl` configured for the GKE cluster
- Calico manifests for GKE policy-only mode
- `calicoctl` installed

## Step 1: Check GKE Compatibility

Verify that your GKE configuration is compatible with Calico.

```bash
# Check if the GKE cluster uses Dataplane V2 (Cilium-based)
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(networkConfig.datapathProvider)"

# Calico and Dataplane V2 cannot run simultaneously
# If output is ADVANCED_DATAPATH, Calico cannot be installed

# Check the current network policy provider
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(networkConfig.networkPolicy.provider)"
```

## Step 2: Install Calico in Policy-Only Mode for GKE

Apply the GKE-compatible Calico manifests.

```bash
# Download and apply the GKE-specific Calico manifest
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-policy-only.yaml

# Check that Calico pods are starting on all nodes
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide -w
```

## Step 3: Diagnose GKE-Specific Startup Failures

Investigate Calico pods that fail to start in the GKE environment.

```bash
# Check for errors in failing Calico pods
kubectl describe pod -n kube-system <calico-node-pod>
kubectl logs -n kube-system <calico-node-pod>

# Common GKE-specific failures:
# - Cannot write to /var/lib/calico - GKE restricts some filesystem paths
# - RBAC errors - GKE managed nodes have restricted service account permissions
# - Interface detection failures - GKE nodes use eth0 not the expected interface

# Check if GKE's read-only rootfs is causing issues
kubectl logs -n kube-system <calico-node-pod> | grep -i "read.only\|permission"
```

## Step 4: Configure Calico for GKE Node Interfaces

Set the correct interface prefix for GKE nodes.

```yaml
# felix-config-gke.yaml - Felix configuration for GKE
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # GKE nodes typically use eth0 as the primary interface
  interfacePrefix: eth
  # Set appropriate log level
  logSeverityScreen: Info
```

```bash
calicoctl apply -f felix-config-gke.yaml

# Restart Calico DaemonSet to apply changes
kubectl rollout restart daemonset -n kube-system calico-node
```

## Step 5: Validate Network Policy on GKE

Confirm Calico policies are enforced correctly.

```bash
# Test a simple deny-all policy in a test namespace
kubectl create namespace gke-policy-test

# Create server pod
kubectl run -n gke-policy-test server --image=nginx
kubectl expose -n gke-policy-test pod server --port=80

# Verify connectivity before policy
kubectl run -n gke-policy-test client --rm -it --image=curlimages/curl -- \
  curl http://server

# Apply deny policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: gke-policy-test
spec:
  podSelector: {}
  policyTypes: [Ingress]
EOF

# Verify policy blocks traffic
kubectl run -n gke-policy-test client --rm -it --image=curlimages/curl -- \
  curl --max-time 5 http://server
```

## Best Practices

- Verify GKE's Dataplane V2 setting before attempting Calico installation-they are mutually exclusive
- Use GKE-specific Calico manifests rather than generic Kubernetes manifests
- Test after every GKE cluster upgrade, as managed updates can affect Calico compatibility
- Enable GKE's built-in Kubernetes NetworkPolicy support as a fallback while evaluating Calico
- Monitor for conflicts between GKE's built-in network security features and Calico policies

## Conclusion

Installing Calico on GKE requires careful verification of GKE's network configuration and using the correct installation mode. The primary constraint is ensuring Dataplane V2 is not enabled, as it cannot coexist with Calico. With the right configuration, Calico provides powerful network policy capabilities on GKE clusters.
