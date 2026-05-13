# How to Configure Calico on OpenShift Hosted Control Planes for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Hosted Control Planes, HyperShift, Kubernetes, Networking, Configuration

Description: A guide to configuring Calico on a new OpenShift Hosted Control Plane cluster, covering IP pools, network policies, and Felix settings.

---

## Introduction

Configuring Calico on OpenShift Hosted Control Planes (HCP) has one key difference from standard OpenShift configuration: the hosted cluster's pod CIDR must not overlap with the management cluster or any connected networks, and it must remain separate from the hosted cluster's service CIDR. HCP clusters are multi-tenant - multiple hosted clusters run on the same management cluster - so CIDR planning requires coordination across hosted clusters if their networks need to be routed together.

Beyond CIDR planning, Calico configuration on HCP follows the same principles as standard OpenShift: align with OpenShift's network model, create permissive policies for system namespaces, and tune Felix for the workload pattern. This guide covers the HCP-specific CIDR considerations and the standard configuration steps.

## Prerequisites

- Calico installed on an OpenShift Hosted Control Plane cluster
- `kubectl` configured with the hosted cluster kubeconfig
- `calicoctl` installed

## Step 1: Verify Non-Overlapping CIDRs

List all hosted clusters and their CIDRs to check for routing conflicts.

```bash
# On the management cluster

oc get hostedcluster -A -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.networking.clusterNetwork[0].cidr}{"\n"}{end}'
```

The hosted cluster's Calico IP pool should use the hosted cluster's pod CIDR. Use a unique CIDR across hosted clusters when those cluster networks need to communicate or be routed by shared infrastructure.

## Step 2: Configure the IP Pool

```bash
export KUBECONFIG=hosted-kubeconfig.yaml

cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.132.0.0/14
  blockSize: 26
  vxlanMode: Always
  natOutgoing: true
  nodeSelector: all()
EOF
```

## Step 3: Configure Felix

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true,
    "iptablesRefreshInterval": "30s"
  }}'
```

## Step 4: Apply System Namespace Policies

Allow OpenShift system namespaces to communicate freely.

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-openshift-system
spec:
  namespaceSelector: projectcalico.org/name starts with 'openshift-'
  ingress:
    - action: Allow
  egress:
    - action: Allow
  order: 10
```

```bash
calicoctl apply -f allow-openshift-system.yaml
```

## Step 5: Verify Configuration

```bash
calicoctl get ippool -o wide
calicoctl get felixconfiguration default -o yaml
kubectl get tigerastatus
```

## Step 6: Test Multi-Tenant Isolation

If your environment routes hosted cluster pod networks, verify that pods in this hosted cluster cannot reach pods in other hosted clusters unless you explicitly allow that traffic.

```bash
kubectl run test --image=busybox -- sleep 300
# Attempt to reach a known IP in another hosted cluster (should fail)
kubectl exec test -- ping -c3 <other-hosted-cluster-pod-ip> || echo "Isolated as expected"
```

## Conclusion

Configuring Calico on OpenShift Hosted Control Planes requires careful CIDR planning to avoid address space conflicts with the management cluster and with any hosted cluster networks that share routing. Beyond CIDR alignment, the configuration follows standard OpenShift Calico patterns: VXLAN encapsulation, permissive policies for system namespaces, and Felix tuning appropriate for the workload profile.
