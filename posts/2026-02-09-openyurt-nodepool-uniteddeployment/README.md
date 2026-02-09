# How to Set Up OpenYurt NodePool and UnitedDeployment for Edge Node Group Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenYurt, Edge Computing

Description: Learn how to use OpenYurt's NodePool and UnitedDeployment resources to manage groups of edge nodes by location, enabling application distribution across multiple sites with location-specific configurations.

---

Managing edge deployments across dozens of locations requires grouping nodes by site and deploying applications consistently to each group. Standard Kubernetes Deployments lack location awareness, making multi-site management complex. OpenYurt's NodePool and UnitedDeployment solve this by adding location-based node grouping and deployment distribution.

In this guide, you'll configure NodePools for different edge locations and use UnitedDeployment to distribute applications across sites with site-specific customizations.

## Understanding NodePools

NodePools group nodes that share characteristics like geographic location, network zone, or hardware type. Each NodePool acts as an independent failure domain with its own node lifecycle management.

Benefits of NodePools:

- Logical grouping of nodes by location
- Independent scaling per location
- Location-specific taints and labels
- Network topology awareness

## Installing OpenYurt

Install OpenYurt components:

```bash
kubectl apply -f https://raw.githubusercontent.com/openyurtio/openyurt/master/config/setup/all_in_one.yaml
```

Verify installation:

```bash
kubectl get pods -n kube-system | grep yurt
```

## Creating NodePools for Edge Locations

Create NodePools for different retail stores:

```yaml
# nodepool-store-01.yaml
apiVersion: apps.openyurt.io/v1beta1
kind: NodePool
metadata:
  name: store-01-boston
spec:
  type: Edge
  selector:
    matchLabels:
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
apiVersion: apps.openyurt.io/v1beta1
kind: NodePool
metadata:
  name: store-02-seattle
spec:
  type: Edge
  selector:
    matchLabels:
      location: seattle
      store-id: "002"
  annotations:
    address: "456 Pike St, Seattle, WA"
    region: "us-west"
---
apiVersion: apps.openyurt.io/v1beta1
kind: NodePool
metadata:
  name: store-03-miami
spec:
  type: Edge
  selector:
    matchLabels:
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
kubectl label node edge-node-boston-1 location=boston store-id=001
kubectl label node edge-node-boston-2 location=boston store-id=001

# Assign Seattle nodes
kubectl label node edge-node-seattle-1 location=seattle store-id=002

# Assign Miami nodes
kubectl label node edge-node-miami-1 location=miami store-id=003
```

Verify node assignments:

```bash
kubectl get nodepool
kubectl get nodes -l location=boston
```

## Creating UnitedDeployment

Deploy applications across all NodePools:

```yaml
# pos-system-united.yaml
apiVersion: apps.openyurt.io/v1alpha1
kind: UnitedDeployment
metadata:
  name: pos-system
  namespace: retail
spec:
  selector:
    matchLabels:
      app: pos
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
              env:
              - name: STORE_ID
                valueFrom:
                  fieldRef:
                    fieldPath: metadata.labels['store-id']
              resources:
                requests:
                  cpu: "500m"
                  memory: "512Mi"
            tolerations:
            - key: location
              operator: Exists
              effect: NoSchedule
  topology:
    pools:
    - name: store-01-boston
      replicas: 2
    - name: store-02-seattle
      replicas: 2
    - name: store-03-miami
      replicas: 2
  revisionHistoryLimit: 5
```

Apply the UnitedDeployment:

```bash
kubectl apply -f pos-system-united.yaml
```

This creates 2 POS system replicas in each store location.

## Customizing Per-Location Configuration

Override settings for specific locations:

```yaml
spec:
  topology:
    pools:
    - name: store-01-boston
      replicas: 3  # Boston needs more capacity
      patch:
        spec:
          template:
            spec:
              containers:
              - name: pos
                env:
                - name: PAYMENT_GATEWAY
                  value: "stripe-us-east"
                - name: TAX_RATE
                  value: "0.0625"  # MA tax rate
    - name: store-02-seattle
      replicas: 2
      patch:
        spec:
          template:
            spec:
              containers:
              - name: pos
                env:
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
  topology:
    pools:
    - name: store-01-boston
      replicas: 2
      nodeSelectorTerm:
        matchExpressions:
        - key: canary
          operator: In
          values: ["true"]
    - name: store-02-seattle
      replicas: 2
    - name: store-03-miami
      replicas: 2
```

Update process:

```bash
# Step 1: Deploy to canary location (Boston)
kubectl label nodepool store-01-boston canary=true

# Step 2: Update image
kubectl set image uniteddeployment/pos-system pos=retail/pos-system:v2.2

# Step 3: Monitor Boston
kubectl logs -l app=pos,location=boston

# Step 4: Roll out to remaining locations
kubectl label nodepool store-02-seattle canary=true
kubectl label nodepool store-03-miami canary=true
```

## Using YurtAppSet for DaemonSet-like Behavior

Deploy one pod per NodePool:

```yaml
# monitoring-agent-appset.yaml
apiVersion: apps.openyurt.io/v1alpha1
kind: YurtAppSet
metadata:
  name: monitoring-agent
spec:
  selector:
    matchLabels:
      app: monitoring
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
              env:
              - name: LOCATION
                valueFrom:
                  fieldRef:
                    fieldPath: metadata.annotations['nodepool']
  nodepoolSelector:
    matchLabels:
      type: Edge
```

This deploys exactly one monitoring agent per NodePool.

## Managing NodePool Resources

Set resource quotas per NodePool:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: store-01-quota
  namespace: retail
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    pods: "50"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: NodePool
      values: ["store-01-boston"]
```

## Monitoring NodePool Health

Track NodePool status:

```bash
# Get NodePool status
kubectl get nodepool -o wide

# Check deployment distribution
kubectl get deployment -l app=pos -A

# View UnitedDeployment status
kubectl describe uniteddeployment pos-system
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
          "query": "sum by (nodepool) (kube_pod_info)"
        },
        {
          "title": "NodePool Health",
          "query": "yurt_nodepool_ready_nodes / yurt_nodepool_total_nodes"
        }
      ]
    }
```

## Handling NodePool Failures

When an entire NodePool fails:

```bash
# Cordon all nodes in failed pool
kubectl cordon -l location=boston

# Increase replicas in other pools
kubectl patch uniteddeployment pos-system --type='json' -p='[
  {"op": "replace", "path": "/spec/topology/pools/1/replicas", "value": 4},
  {"op": "replace", "path": "/spec/topology/pools/2/replicas", "value": 4}
]'
```

## Implementing Multi-Cluster NodePools

Extend NodePools across clusters:

```yaml
apiVersion: apps.openyurt.io/v1beta1
kind: NodePool
metadata:
  name: west-coast-pool
spec:
  type: Edge
  selector:
    matchExpressions:
    - key: region
      operator: In
      values: ["us-west-1", "us-west-2"]
  clusters:
  - name: seattle-cluster
  - name: portland-cluster
  - name: sf-cluster
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
            image: kubectl:latest
            command:
            - bash
            - -c
            - |
              # Discover new locations from node labels
              for location in $(kubectl get nodes -o json | jq -r '.items[].metadata.labels.location' | sort -u); do
                # Create NodePool if it doesn't exist
                if ! kubectl get nodepool "pool-$location" 2>/dev/null; then
                  kubectl apply -f - <<EOF
              apiVersion: apps.openyurt.io/v1beta1
              kind: NodePool
              metadata:
                name: pool-$location
              spec:
                type: Edge
                selector:
                  matchLabels:
                    location: $location
              EOF
                fi
              done
          restartPolicy: OnFailure
```

## Conclusion

OpenYurt NodePools and UnitedDeployment provide powerful primitives for managing geographically distributed edge infrastructure. By grouping nodes logically and distributing workloads intelligently, you create scalable edge architectures that maintain location awareness while leveraging Kubernetes automation.

Start with a few NodePools representing key locations, test failover and update scenarios, then scale to your full edge topology. The combination of NodePools for organization and UnitedDeployment for distribution makes multi-site edge management practical and maintainable.
