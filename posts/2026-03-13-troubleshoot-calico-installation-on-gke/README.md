# Troubleshoot Calico Installation on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, GKE, Google Cloud

Description: A guide to diagnosing and resolving common issues when installing and running Calico on Google Kubernetes Engine (GKE) clusters.

---

## Introduction

Google Kubernetes Engine (GKE) provides integrated networking dataplanes. On legacy dataplane clusters, GKE has built-in support for Calico network policy; GKE still handles IP allocation and VPC-native routing.

GKE-specific constraints include the managed control plane's restrictions, Autopilot clusters' default use of Dataplane V2 (which is built on Cilium), and the fact that enabling or disabling network policy enforcement can recreate nodes. Understanding these constraints is essential for troubleshooting Calico on GKE.

This guide covers common Calico installation issues on GKE and provides targeted solutions.

## Prerequisites

- GKE cluster with `gcloud` CLI access
- `kubectl` configured for the GKE cluster
- A Standard GKE cluster that does not use Dataplane V2
- `calicoctl` installed

## Step 1: Check GKE Compatibility

Verify that your GKE configuration is compatible with Calico.

```bash
# Check if the GKE cluster uses Dataplane V2 (Cilium-based)

gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(networkConfig.datapathProvider)"

# If output is ADVANCED_DATAPATH, use GKE Dataplane V2 network policy
# instead of installing or enabling Calico network policy

# Check the current network policy provider
gcloud container clusters describe <cluster-name> \
  --zone <zone> \
  --format="value(networkPolicy.provider)"
```

## Step 2: Enable Calico Network Policy for GKE

Enable GKE's built-in Calico network policy support on a legacy dataplane cluster.

```bash
# For a new Standard cluster that does not use Dataplane V2
gcloud container clusters create <cluster-name> \
  --zone <zone> \
  --enable-network-policy

# For an existing Standard cluster that does not use Dataplane V2
gcloud container clusters update <cluster-name> \
  --zone <zone> \
  --update-addons=NetworkPolicy=ENABLED

gcloud container clusters update <cluster-name> \
  --zone <zone> \
  --enable-network-policy

# Check that nodes are ready for Calico network policy enforcement
kubectl get nodes -l projectcalico.org/ds-ready=true

# Check that GKE-managed Calico pods are running
kubectl get pods -n kube-system | grep calico
```

## Step 3: Diagnose GKE-Specific Startup Failures

Investigate Calico pods that fail to start in the GKE environment.

```bash
# Check for errors in failing Calico pods
kubectl describe pod -n kube-system <calico-node-pod>
kubectl logs -n kube-system <calico-node-pod>

# Common GKE-specific failures:
# - Network policy enabled on the control plane but nodes have not been recreated yet
# - Manually deployed ip-masquerade-agent or calico-node pods are unscheduled
# - Pods stuck in ContainerCreating with "ipAddrs is not compatible with configured IPAM"
# - Calico readiness probe failures in large autoscaling clusters

# Confirm network policy enforcement is enabled on legacy dataplane nodes
kubectl get nodes -l projectcalico.org/ds-ready=true
```

## Step 4: Avoid Incorrect Felix Interface Prefix Changes

Do not set Felix `interfacePrefix` to the node's primary interface, such as `eth0`. This setting identifies Calico workload endpoint interfaces, and the Kubernetes integration normally uses the `cali` prefix.

```yaml
# felix-config-gke.yaml - Felix configuration for GKE
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Calico workload endpoint interfaces normally use the cali prefix
  interfacePrefix: cali
  # Set appropriate log level
  logSeverityScreen: Info
```

```bash
# Apply this only if the value was previously changed incorrectly
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
- Use GKE network policy settings rather than generic Calico manifests
- Test after every GKE cluster upgrade, as managed updates can affect Calico compatibility
- Use GKE Dataplane V2's built-in Kubernetes NetworkPolicy enforcement when you do not need Calico-specific APIs
- Monitor for conflicts between GKE's built-in network security features and Calico policies

## Conclusion

Using Calico network policy on GKE requires careful verification of GKE's network configuration and using the supported GKE network policy mode. The primary constraint is ensuring Dataplane V2 is not enabled, because Dataplane V2 uses Cilium-based built-in network policy enforcement instead of Calico. With the right configuration, Calico provides powerful network policy capabilities on legacy dataplane GKE clusters.
