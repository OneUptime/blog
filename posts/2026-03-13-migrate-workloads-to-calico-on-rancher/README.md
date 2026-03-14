# Migrate Workloads to Calico on Rancher

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Rancher, Kubernetes, RKE, Networking, Migration, CNI

Description: A step-by-step guide to replacing Canal or Flannel with Calico on Rancher-managed Kubernetes clusters, enabling advanced network policy enforcement across your Rancher fleet.

---

## Introduction

Rancher by SUSE is a popular multi-cluster Kubernetes management platform that supports multiple CNI options through its RKE (Rancher Kubernetes Engine) provisioner. By default, many Rancher-managed clusters use Canal (a combination of Flannel for networking and Calico for network policy), but teams that need full Calico IPAM, BGP support, or eBPF data plane capabilities should migrate to a pure Calico deployment.

Rancher's cluster management UI and RKE configuration make it possible to select Calico as the CNI at cluster creation time. For existing clusters, the migration path involves creating a new RKE cluster with Calico and migrating workloads, since in-place CNI replacement is not supported in most Rancher configurations.

This guide covers configuring a new Rancher-managed cluster with Calico, migrating workloads from an existing cluster, and applying Calico policies through both the Rancher UI and `calicoctl`.

## Prerequisites

- Rancher v2.7+ management server
- RKE2 or RKE1 cluster provisioner access
- `kubectl` configured for both source and target clusters
- `calicoctl` v3.27+ installed
- Rancher API access or UI access with cluster create permissions
- Workload manifests exported from the source cluster

## Step 1: Create a New RKE2 Cluster with Calico

Provision a new Rancher-managed cluster with Calico as the network provider.

Create a new RKE2 cluster via Rancher with Calico CNI selected:

```bash
# Using the Rancher CLI to create a cluster with Calico
# Alternatively, use the Rancher UI: Cluster Management > Create > Custom > Network > Calico

# Export the Rancher cluster configuration template
cat <<EOF > rancher-calico-cluster.yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: calico-cluster
  namespace: fleet-default
spec:
  rkeConfig:
    machineGlobalConfig:
      cni: calico             # Select Calico as the CNI plugin
      disable-kube-proxy: false
    chartValues:
      rke2-calico: {}         # Use default Calico chart values
    machineSelectorConfig:
    - config:
        protect-kernel-defaults: false
EOF

kubectl apply -f rancher-calico-cluster.yaml
```

## Step 2: Configure Calico via RKE2 HelmChartConfig

Customize Calico configuration using RKE2's HelmChartConfig CRD.

Override Calico chart values to set your desired IP pool and encapsulation:

```yaml
# calico-helmchartconfig.yaml - customize Calico on RKE2 via Rancher
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: rke2-calico
  namespace: kube-system
spec:
  valuesContent: |-
    installation:
      calicoNetwork:
        ipPools:
        - blockSize: 26
          cidr: 10.42.0.0/16      # Match RKE2 default pod CIDR
          encapsulation: VXLAN
          natOutgoing: Enabled
          nodeSelector: all()
```

Apply the HelmChartConfig to the new cluster:

```bash
kubectl --context=calico-cluster apply -f calico-helmchartconfig.yaml
```

## Step 3: Export Workloads from Source Cluster

Back up all workload definitions from the source cluster before migration.

Export namespace resources, excluding cluster-specific objects:

```bash
# Export all application namespaces and their resources
for ns in production staging; do
  kubectl --context=source-cluster get all,configmaps,secrets,ingress,pvc \
    -n $ns -o yaml > ${ns}-backup.yaml
done

# Export custom resource definitions used by your applications
kubectl --context=source-cluster get crds -o yaml > app-crds.yaml

# Export any custom Rancher projects and namespaces
kubectl --context=source-cluster get namespaces -o yaml > namespaces.yaml
```

## Step 4: Apply Workloads to Calico Cluster

Deploy the exported workloads to the new Calico-enabled cluster.

Apply workload manifests and verify pod scheduling:

```bash
# Create namespaces first
kubectl --context=calico-cluster apply -f namespaces.yaml

# Apply CRDs before workloads that depend on them
kubectl --context=calico-cluster apply -f app-crds.yaml

# Deploy production workloads
kubectl --context=calico-cluster apply -f production-backup.yaml

# Verify pods are running with Calico-assigned IPs
kubectl --context=calico-cluster get pods -n production -o wide
```

## Step 5: Apply Calico Network Policies

Create network policies in the Calico cluster to enforce traffic rules.

Define namespace isolation and application-level policies:

```yaml
# rancher-calico-policy.yaml - network policy for Rancher Calico cluster
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
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-internal-ingress
  namespace: production
spec:
  selector: all()
  order: 500
  types:
  - Ingress
  ingress:
  - action: Allow
    source:
      namespaceSelector: "kubernetes.io/metadata.name == 'production'"
```

Apply the policies using calicoctl:

```bash
calicoctl apply -f rancher-calico-policy.yaml
```

## Best Practices

- Use Rancher Projects to group namespaces and apply consistent resource quotas alongside Calico policies
- Enable Rancher's Monitoring stack alongside Calico for unified metrics collection
- Configure Calico IPAM to use separate IP pools per Rancher Project for clear traffic attribution
- Test Calico policies in a Rancher downstream cluster before promoting to the fleet
- Use OneUptime to monitor cross-cluster connectivity and alert on policy drops during migration

## Conclusion

Migrating to Calico on Rancher-managed clusters unlocks the full Calico feature set — including IPAM, BGP, and eBPF — within Rancher's multi-cluster management framework. By provisioning new clusters with Calico and migrating workloads systematically, you can achieve a clean migration without in-place CNI replacement risks. Integrate OneUptime monitoring with your Rancher environment for continuous network health validation across your entire fleet.
