# How to Manage Multiple Clusters from a Single Rancher Instance (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Multi-Cluster, Management

Description: Learn how to effectively manage tens or hundreds of Kubernetes clusters from a single Rancher instance using cluster groups, RBAC, and Fleet-based policies.

## Introduction

One of Rancher's core strengths is its ability to manage many Kubernetes clusters from a single management plane. Whether you're managing 10 or 1,000 clusters across multiple clouds and data centers, Rancher provides the tools to organize, access, monitor, and govern them all. This guide covers the organizational patterns and operational workflows for large-scale multi-cluster management.

## Step 1: Organize Clusters with Labels

Labels are the foundation of multi-cluster organization in Rancher:

```bash
# Label clusters for organizational grouping

kubectl label clusters.management.cattle.io c-onprem-prod \
  environment=production \
  region=us-east \
  cloud=on-premises \
  tier=1

kubectl label clusters.management.cattle.io c-aws-prod-1 \
  environment=production \
  region=us-east-1 \
  cloud=aws \
  tier=1

kubectl label clusters.management.cattle.io c-gcp-dev-1 \
  environment=development \
  region=us-central1 \
  cloud=gcp \
  tier=3
```

## Step 2: Create Cluster Groups

```yaml
# cluster-group-production.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: production-clusters
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      environment: production
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: development-clusters
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      environment: development
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: us-east-clusters
  namespace: fleet-default
spec:
  selector:
    matchExpressions:
      - key: region
        operator: In
        values: [us-east, us-east-1, us-east-2]
```

```bash
kubectl apply -f cluster-group-production.yaml
kubectl get clustergroups.fleet.cattle.io -n fleet-default
```

## Step 3: Implement Multi-Cluster RBAC

Grant cluster-level access by selecting the clusters you want and creating a binding for each one:

```bash
# Bind a Rancher user to the cluster-owner role on every production cluster.
# Use userPrincipalName or groupPrincipalName instead when binding external identities.
for cluster_id in $(kubectl get clusters.management.cattle.io \
  -l environment=production \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}'); do
  cat <<EOF | kubectl apply -f -
apiVersion: management.cattle.io/v3
kind: ClusterRoleTemplateBinding
metadata:
  name: platform-owner-${cluster_id}
  namespace: ${cluster_id}
clusterName: ${cluster_id}
roleTemplateName: cluster-owner
userName: u-xxxxx
EOF
done
```

For project-level access across clusters:

```bash
# Create a ProjectRoleTemplateBinding in the project's namespace
kubectl create -f - <<EOF
apiVersion: management.cattle.io/v3
kind: ProjectRoleTemplateBinding
metadata:
  generateName: prtb-
  namespace: p-xxxxx
projectName: c-aws-prod-1:p-xxxxx
roleTemplateName: project-member
userName: u-xxxxx
EOF
```

## Step 4: Apply Policies Across All Clusters with Fleet

```yaml
# gitops/global-policies/fleet.yaml
# Apply security policies to ALL clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: global-policies
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/cluster-policies
  branch: main
  paths:
    - policies/
  targets:
    - clusterSelector: {}    # Empty = all clusters
```

```yaml
# policies/network-policy-deny-all.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: default
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Step 5: Centralized Namespace Management

```bash
# Create a namespace on the downstream cluster and attach it
# to a Rancher project with consistent metadata

kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    team: alpha
    costcenter: engineering
  annotations:
    field.cattle.io/projectId: c-aws-prod-1:p-xxxxx
EOF
```

## Step 6: Bulk Operations Across Clusters

```bash
#!/usr/bin/env bash
# bulk-kubectl.sh - Run kubectl commands across multiple clusters

# Create a Rancher kubeconfig for a single cluster
get_kubeconfig() {
  local cluster_id="$1"

  kubectl create -o json -f - <<EOF
apiVersion: ext.cattle.io/v1
kind: Kubeconfig
spec:
  clusters: ["${cluster_id}"]
  currentContext: "${cluster_id}"
  description: bulk-operations-${cluster_id}
EOF
}

# Get all production cluster IDs
CLUSTER_IDS=$(kubectl get clusters.management.cattle.io \
  -l environment=production \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

# Run a command on all production clusters
for cluster_id in ${CLUSTER_IDS}; do
  echo "=== Cluster: ${cluster_id} ==="
  kubeconfig_json=$(get_kubeconfig "${cluster_id}")
  kubeconfig_resource=$(echo "${kubeconfig_json}" | jq -r '.metadata.name')
  kubeconfig_file=$(mktemp)

  echo "${kubeconfig_json}" | jq -r '.status.value' > "${kubeconfig_file}"
  kubectl --kubeconfig="${kubeconfig_file}" get nodes --no-headers | wc -l

  kubectl delete kubeconfig "${kubeconfig_resource}" >/dev/null 2>&1
  rm -f "${kubeconfig_file}"
done
```

## Step 7: Monitor Clusters from the Same Rancher UI

Enable Monitoring on each cluster you want to observe:

`Cluster Management` → `<cluster>` → `Explore` → `Cluster Tools` → `Install` by `Monitoring`

When monitoring is enabled on the local (`local`) cluster, Rancher exposes health metrics for Rancher itself. Downstream clusters are monitored by enabling the app on each cluster individually.

## Step 8: Implement Namespace Quota Policies

```yaml
# ResourceQuota applied via Fleet to the default namespace on all development clusters
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: default
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    persistentvolumeclaims: "10"
    services.loadbalancers: "0"   # No LBs in dev
```

## Conclusion

Managing multiple clusters from a single Rancher instance requires deliberate organization through labels, cluster groups, and RBAC. Fleet-based GitOps ensures consistent configuration across all clusters, while Rancher's monitoring tooling keeps observability accessible from the same management interface. As your cluster count grows, automating cluster registration, labeling, and policy application becomes essential for maintaining operational efficiency at scale.
