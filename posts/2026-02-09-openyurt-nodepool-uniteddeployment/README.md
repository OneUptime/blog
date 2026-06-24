# How to Set Up OpenYurt NodePool and UnitedDeployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenYurt, Edge Computing

Description: Learn how to use OpenYurt's NodePool and UnitedDeployment resources to manage groups of edge nodes by location.

---

Managing edge deployments across dozens of locations requires grouping nodes by site and deploying applications consistently to each group. Standard Kubernetes Deployments lack location awareness, making multi-site management complex. OpenYurt's NodePool and YurtAppSet solve this by adding location-based node grouping and deployment distribution.

In this guide, you'll configure NodePools for different edge locations and use YurtAppSet to distribute applications across sites with site-specific customizations.

## Understanding NodePools

NodePools group nodes that share characteristics like geographic location, network zone, or hardware type. Each NodePool acts as an independent failure domain with its own node lifecycle management.

Benefits of NodePools:

- Logical grouping of nodes by location
- Independent workload replicas per location
- Location-specific taints and labels
- Network topology awareness

## Installing OpenYurt

Install the OpenYurt control-plane manager:

```bash
helm repo add openyurt https://openyurtio.github.io/charts
helm repo update
helm upgrade --install yurt-manager -n kube-system openyurt/yurt-manager
```

Verify installation:

```bash
kubectl get pods -n kube-system | grep yurt-manager
```

## Creating NodePools for Edge Locations

Create NodePools for different retail stores:

```yaml
# nodepool-store-01.yaml

apiVersion: apps.openyurt.io/v1beta2
kind: NodePool
metadata:
  name: store-01-boston
  labels:
    app: pos
spec:
  type: Edge
  labels:
    location: boston
    store-id: "001"
  annotations:
    address: "123 Main St, Boston, MA"
    region: "us-east"
  taints:
  - key: location
    value: store-01
    effect: NoSchedule
---
apiVersion: apps.openyurt.io/v1beta2
kind: NodePool
metadata:
  name: store-02-seattle
  labels:
    app: pos
spec:
  type: Edge
  labels:
    location: seattle
    store-id: "002"
  annotations:
    address: "456 Pike St, Seattle, WA"
    region: "us-west"
---
apiVersion: apps.openyurt.io/v1beta2
kind: NodePool
metadata:
  name: store-03-miami
  labels:
    app: pos
spec:
  type: Edge
  labels:
    location: miami
    store-id: "003"
  annotations:
    address: "789 Ocean Dr, Miami, FL"
    region: "us-south"
```

Apply NodePools:

```bash
kubectl apply -f nodepool-store-01.yaml
```

## Assigning Nodes to NodePools

Label nodes to assign them to pools:

```bash
# Assign Boston nodes
kubectl label node edge-node-boston-1 apps.openyurt.io/nodepool=store-01-boston
kubectl label node edge-node-boston-2 apps.openyurt.io/nodepool=store-01-boston

# Assign Seattle nodes
kubectl label node edge-node-seattle-1 apps.openyurt.io/nodepool=store-02-seattle

# Assign Miami nodes
kubectl label node edge-node-miami-1 apps.openyurt.io/nodepool=store-03-miami
```

Verify node assignments:

```bash
kubectl get nodepool
kubectl get nodes -l apps.openyurt.io/nodepool=store-01-boston
```

## Creating YurtAppSet

Deploy applications across all NodePools:

```yaml
# pos-system-appset.yaml
apiVersion: apps.openyurt.io/v1beta1
kind: YurtAppSet
metadata:
  name: pos-system
  namespace: retail
spec:
  revisionHistoryLimit: 5
  nodepoolSelector:
    matchLabels:
      app: pos
  workload:
    workloadTemplate:
      deploymentTemplate:
        metadata:
          labels:
            app: pos
        spec:
          replicas: 2
          selector:
            matchLabels:
              app: pos
          template:
            metadata:
              labels:
                app: pos
            spec:
              containers:
              - name: pos
                image: retail/pos-system:v2.1
                ports:
                - containerPort: 8080
                resources:
                  requests:
                    cpu: "500m"
                    memory: "512Mi"
              tolerations:
              - key: location
                operator: Exists
                effect: NoSchedule
```

Apply the YurtAppSet:

```bash
kubectl apply -f pos-system-appset.yaml
```

This creates 2 POS system replicas in each selected store location.

## Customizing Per-Location Configuration

Override settings for specific locations:

```yaml
spec:
  workload:
    workloadTweaks:
    - pools:
      - store-01-boston
      tweaks:
        replicas: 3  # Boston needs more capacity
        patches:
        - path: /spec/template/spec/containers/0/env
          operation: add
          value:
          - name: PAYMENT_GATEWAY
            value: "stripe-us-east"
          - name: TAX_RATE
            value: "0.0625"  # MA tax rate
    - pools:
      - store-02-seattle
      tweaks:
        replicas: 2
        patches:
        - path: /spec/template/spec/containers/0/env
          operation: add
          value:
          - name: PAYMENT_GATEWAY
            value: "stripe-us-west"
          - name: TAX_RATE
            value: "0.101"  # WA tax rate
```

## Implementing Progressive Rollouts

Roll out updates gradually across locations:

```yaml
spec:
  revisionHistoryLimit: 10
  workload:
    workloadTweaks:
    - nodepoolSelector:
        matchLabels:
          rollout-stage: canary
      tweaks:
        containerImages:
        - name: pos
          targetImage: retail/pos-system:v2.2
```

Update process:

```bash
# Step 1: Deploy to canary location (Boston)
kubectl label nodepool store-01-boston rollout-stage=canary

# Step 2: Apply the YurtAppSet image tweak
kubectl apply -f pos-system-appset.yaml

# Step 3: Monitor Boston
kubectl logs -l app=pos,apps.openyurt.io/pool-name=store-01-boston -n retail

# Step 4: Roll out to remaining locations
kubectl label nodepool store-02-seattle rollout-stage=canary
kubectl label nodepool store-03-miami rollout-stage=canary
```

## Using YurtAppSet for DaemonSet-like Behavior

Deploy one pod per NodePool:

```yaml
# monitoring-agent-appset.yaml
apiVersion: apps.openyurt.io/v1beta1
kind: YurtAppSet
metadata:
  name: monitoring-agent
spec:
  nodepoolSelector:
    matchLabels:
      app: pos
  workload:
    workloadTemplate:
      deploymentTemplate:
        metadata:
          labels:
            app: monitoring
        spec:
          replicas: 1
          selector:
            matchLabels:
              app: monitoring
          template:
            metadata:
              labels:
                app: monitoring
            spec:
              containers:
              - name: agent
                image: monitoring/agent:v1
```

This deploys one monitoring agent Deployment per selected NodePool, with one replica in each generated Deployment.

## Managing NodePool Resources

Kubernetes ResourceQuota is namespace-scoped and does not provide a built-in NodePool scope. If you need per-location quotas, use separate namespaces per store and apply standard ResourceQuota objects to those namespaces:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: store-01-quota
  namespace: retail-store-01
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    pods: "50"
```

## Monitoring NodePool Health

Track NodePool status:

```bash
# Get NodePool status
kubectl get nodepool -o wide

# Check deployment distribution
kubectl get deployment -l app=pos -n retail

# View YurtAppSet status
kubectl describe yurtappset pos-system -n retail
```

Create monitoring dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nodepool-dashboard
data:
  dashboard.json: |
    {
      "panels": [
        {
          "title": "Pods per NodePool",
          "query": "sum by (label_apps_openyurt_io_pool_name) (kube_pod_labels{label_apps_openyurt_io_pool_name!=\"\"})"
        },
        {
          "title": "Ready Nodes per NodePool",
          "query": "sum by (label_apps_openyurt_io_nodepool) (kube_node_status_condition{condition=\"Ready\",status=\"true\"} * on(node) group_left(label_apps_openyurt_io_nodepool) kube_node_labels{label_apps_openyurt_io_nodepool!=\"\"})"
        }
      ]
    }
```

## Handling NodePool Failures

When an entire NodePool fails:

```bash
# Cordon all nodes in failed pool
kubectl cordon -l apps.openyurt.io/nodepool=store-01-boston

# Increase replicas in other pools
kubectl patch yurtappset pos-system -n retail --type='merge' -p='{
  "spec": {"workload": {"workloadTweaks": [
    {"pools": ["store-02-seattle"], "tweaks": {"replicas": 4}},
    {"pools": ["store-03-miami"], "tweaks": {"replicas": 4}}
  ]}}
}'
```

## Implementing Multi-Cluster NodePools

OpenYurt NodePools are cluster-scoped resources inside a single Kubernetes cluster. They do not support a `spec.clusters` field. To manage multiple clusters, create matching NodePools in each cluster and coordinate them with your multi-cluster management tooling:

```bash
kubectl --context seattle-cluster apply -f nodepool-store-01.yaml
kubectl --context portland-cluster apply -f nodepool-store-01.yaml
kubectl --context sf-cluster apply -f nodepool-store-01.yaml
```

## Automating NodePool Management

Create NodePools automatically for new locations:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nodepool-sync
spec:
  schedule: "*/10 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: nodepool-manager
          containers:
          - name: sync
            image: bitnami/kubectl:latest
            command:
            - bash
            - -c
            - |
              # Discover new locations from node labels
              for location in $(kubectl get nodes -o json | jq -r '.items[].metadata.labels.location // empty' | sort -u); do
                # Create NodePool if it doesn't exist
                if ! kubectl get nodepool "pool-$location" >/dev/null 2>&1; then
                  kubectl apply -f - <<EOF
              apiVersion: apps.openyurt.io/v1beta2
              kind: NodePool
              metadata:
                name: pool-$location
                labels:
                  app: pos
              spec:
                type: Edge
                labels:
                  location: $location
              EOF
                fi
              done
          restartPolicy: OnFailure
```

## Conclusion

OpenYurt NodePools and YurtAppSet provide powerful primitives for managing geographically distributed edge infrastructure. By grouping nodes logically and distributing workloads intelligently, you create scalable edge architectures that maintain location awareness while leveraging Kubernetes automation.

Start with a few NodePools representing key locations, test failover and update scenarios, then scale to your full edge topology. The combination of NodePools for organization and YurtAppSet for distribution makes multi-site edge management practical and maintainable.
