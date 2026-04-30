# How to Set Up Fleet for Edge Cluster Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Edge

Description: Learn how to use Fleet to manage hundreds of edge Kubernetes clusters, including registration, configuration management, and handling intermittent connectivity.

## Introduction

Edge computing deployments present unique challenges: clusters may be geographically distributed, have limited bandwidth, experience intermittent connectivity, and run with minimal resources. Fleet is designed for exactly this use case - it was built to manage thousands of clusters at scale, making it ideal for edge deployments in retail stores, manufacturing plants, remote locations, and IoT gateways.

This guide covers the specific configurations and patterns needed for reliable edge cluster management with Fleet.

## Prerequisites

- Rancher with Fleet installed in a central location
- Edge clusters running K3s or another lightweight Kubernetes distribution
- Network connectivity from edge clusters to the Rancher/Fleet manager (even intermittent)
- Git repository for edge configurations

## Edge Architecture with Fleet

```text
Central Data Center
└── Rancher + Fleet Manager
    ├── Git Repository (configurations)
    └── Fleet Manager
        ├── Edge ClusterGroup: retail-stores
        ├── Edge ClusterGroup: manufacturing
        └── Edge ClusterGroup: remote-sites

Edge Locations (potentially thousands)
├── Store #001 (k3s cluster)
├── Store #002 (k3s cluster)
├── Factory #001 (k3s cluster)
└── Remote Site #001 (k3s cluster)
```

## Step 1: Prepare Edge Cluster Registration

### Create a Long-Lived Registration Token

Edge clusters may not register immediately. Use a non-expiring token:

```yaml
# edge-registration-token.yaml

apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterRegistrationToken
metadata:
  name: edge-clusters-token
  namespace: fleet-default
spec:
  # Set to 0 for non-expiring token
  ttl: 0s
```

```bash
kubectl apply -f edge-registration-token.yaml

# Wait for Fleet to create the token secret, then write the agent values file
while ! kubectl get secret edge-clusters-token -n fleet-default >/dev/null 2>&1; do sleep 5; done

kubectl get secret edge-clusters-token \
  -n fleet-default \
  -o jsonpath='{.data.values}' | base64 --decode > values.yaml
```

### Create an Edge Registration Script

```bash
#!/bin/bash
# register-edge-cluster.sh - Run on each edge cluster
# Copy the values.yaml generated from the ClusterRegistrationToken to this cluster first.
CLUSTER_LABELS="\
  --set-string labels.site=${HOSTNAME} \
  --set-string labels.location=${LOCATION:-unknown} \
  --set-string labels.region=${REGION:-unknown} \
  --set-string labels.env=production"

# Install Fleet agent
helm repo add fleet https://rancher.github.io/fleet-helm-charts/
helm repo update

helm -n cattle-fleet-system install --create-namespace --wait \
  ${CLUSTER_LABELS} \
  --values ./values.yaml \
  fleet-agent fleet/fleet-agent
```

## Step 2: Label Edge Clusters for Targeting

```bash
# Label edge clusters with their physical characteristics
kubectl label clusters.fleet.cattle.io store-001-dallas \
  env=production \
  type=retail-store \
  region=us-south \
  city=dallas \
  tenant=acme-retail \
  --overwrite \
  -n fleet-default

kubectl label clusters.fleet.cattle.io factory-001-seattle \
  env=production \
  type=manufacturing \
  region=us-west \
  city=seattle \
  tenant=acme-manufacturing \
  --overwrite \
  -n fleet-default
```

## Step 3: Create Edge ClusterGroups

```yaml
# edge-clustergroups.yaml
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: retail-stores
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      type: retail-store
      env: production
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: manufacturing-plants
  namespace: fleet-default
spec:
  selector:
    matchLabels:
      type: manufacturing
      env: production
---
apiVersion: fleet.cattle.io/v1alpha1
kind: ClusterGroup
metadata:
  name: all-edge
  namespace: fleet-default
spec:
  selector:
    matchExpressions:
      - key: type
        operator: In
        values:
          - retail-store
          - manufacturing
          - remote-site
```

## Step 4: Configure Edge-Specific fleet.yaml

```yaml
# retail-app/fleet.yaml - Edge-optimized configuration
defaultNamespace: retail-app

targetCustomizations:
  - name: retail-stores
    clusterGroup: retail-stores
    helm:
      values:
        # Low resource footprint for edge hardware
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "200m"
            memory: "256Mi"

        # Example application values for edge sites
        offline:
          # Cache data locally for offline operation
          cacheEnabled: true
          cacheSize: "1Gi"

        # Example application sync interval for edge sites
        syncIntervalMinutes: 30
```

## Step 5: Create Edge GitRepo Resources

```yaml
# gitrepo-edge-base.yaml - Common infrastructure for all edge clusters
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: edge-infrastructure
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/edge-configs
  branch: main
  paths:
    - infrastructure/common
    - infrastructure/monitoring

  # All edge clusters get base infrastructure
  targets:
    - clusterGroup: all-edge
---
# gitrepo-retail.yaml - Retail-specific applications
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: retail-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/edge-configs
  branch: main
  paths:
    - apps/retail

  targets:
    - clusterGroup: retail-stores
```

## Step 6: Handle Intermittent Connectivity

Fleet agents continue reconciling after connectivity interruptions. Separately, you can tune how often the central Fleet manager polls Git:

```yaml
# gitrepo-edge-connectivity.yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: edge-retail-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/edge-configs
  branch: main

  # Increase polling interval to reduce how often the Fleet manager checks Git
  pollingInterval: 5m

  targets:
    - clusterGroup: retail-stores
```

### Fleet Manager Connectivity Configuration

```yaml
# rancher-config.yaml - Configure Fleet install options in Rancher
apiVersion: v1
kind: ConfigMap
metadata:
  name: rancher-config
  namespace: cattle-system
data:
  fleet: |
    agentTLSMode: system-store
    # Shorter check-ins surface status changes more quickly for edge clusters
    agentCheckinInterval: 1m
```

## Monitoring Edge Cluster Health

```bash
# Get status of all edge clusters
kubectl get clusters.fleet.cattle.io -n fleet-default \
  -l type=retail-store

# List the last check-in time for edge clusters
kubectl get clusters.fleet.cattle.io -n fleet-default \
  -o jsonpath='{range .items[?(@.status.agent.lastSeen)]}{.metadata.name}: {.status.agent.lastSeen}{"\n"}{end}'

# Check bundle deployment status across edge cluster namespaces
kubectl get bundledeployments.fleet.cattle.io -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: ready={.status.ready}{"\n"}{end}'
```

## Scaling Considerations

For large edge deployments:

```bash
# Fleet can handle thousands of clusters
# Key performance settings for large deployments

# Increase Fleet controller memory limit
kubectl patch deployment fleet-controller \
  -n cattle-fleet-system \
  --type=merge \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"fleet-controller","resources":{"limits":{"memory":"2Gi"}}}]}}}}'
```

## Conclusion

Fleet's architecture makes it uniquely suited for edge cluster management at scale. Its agent-based model means that even clusters with intermittent connectivity will receive and apply updates when they reconnect, and its GitOps foundation ensures that edge clusters converge back to the desired state defined in Git after connectivity returns. For large-scale edge deployments, combining thoughtful labeling strategies, cluster groups, and environment-specific bundle configurations gives you centralized control over thousands of distributed clusters while maintaining the flexibility to customize each site's configuration.
