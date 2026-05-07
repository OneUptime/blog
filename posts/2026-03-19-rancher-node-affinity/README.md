# How to Set Node Affinity and Anti-Affinity in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Node Templates

Description: A practical guide to configuring node affinity and anti-affinity rules in Rancher for optimized workload scheduling.

Affinity and anti-affinity rules in Kubernetes control where pods are scheduled based on node labels and the locations of other pods. Rancher provides a user-friendly interface for configuring these rules alongside direct YAML editing. This guide covers how to set up both node affinity and anti-affinity for your workloads.

## Prerequisites

- Rancher v2.6 or later with a managed cluster
- Nodes labeled with relevant metadata
- Basic understanding of Kubernetes scheduling concepts
- kubectl access to your cluster

## Understanding Affinity Types

Kubernetes supports several affinity types:

- **Node Affinity**: Schedules pods on nodes matching specific label criteria.
- **Pod Affinity**: Schedules pods on nodes where specific other pods are already running.
- **Pod Anti-Affinity**: Prevents pods from being scheduled on nodes where specific other pods are running.

Each type supports two scheduling modes:

- **requiredDuringSchedulingIgnoredDuringExecution**: Hard requirement; pods will not be scheduled if no matching node exists.
- **preferredDuringSchedulingIgnoredDuringExecution**: Soft preference; the scheduler tries to match but will schedule elsewhere if needed.

## Step 1: Label Your Nodes

Before setting affinity rules, label your nodes appropriately:

```bash
# Label nodes by zone

kubectl label --overwrite nodes node-1 topology.kubernetes.io/zone=us-east-1a
kubectl label --overwrite nodes node-2 topology.kubernetes.io/zone=us-east-1b
kubectl label --overwrite nodes node-3 topology.kubernetes.io/zone=us-east-1c
kubectl label --overwrite nodes node-4 topology.kubernetes.io/zone=us-east-1a
kubectl label --overwrite nodes node-5 topology.kubernetes.io/zone=us-east-1b
kubectl label --overwrite nodes node-6 topology.kubernetes.io/zone=us-east-1c

# Label nodes by hardware type
kubectl label --overwrite nodes node-1 hardware=standard
kubectl label --overwrite nodes node-2 hardware=high-memory
kubectl label --overwrite nodes node-4 hardware=gpu
kubectl label --overwrite nodes node-5 hardware=gpu
kubectl label --overwrite nodes node-6 hardware=standard

# Label nodes by environment
kubectl label --overwrite nodes node-1 environment=production
kubectl label --overwrite nodes node-2 environment=production
kubectl label --overwrite nodes node-3 environment=staging

# Label nodes by team
kubectl label --overwrite nodes node-1 team=data-engineering
kubectl label --overwrite nodes node-2 team=web-services
```

You can also label nodes through the Rancher UI:

1. Navigate to your cluster.
2. Go to **Nodes**.
3. Open the node's options menu and select **Edit**.
4. Add labels.
5. Click **Save**.

## Step 2: Configure Required Node Affinity

Set a hard node affinity rule using the Rancher UI:

1. Navigate to your cluster's **Workloads**.
2. Create or edit a deployment.
3. Scroll to the **Node Scheduling** section.
4. Configure required node affinity by adding your label match expressions.

Or configure it through YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: environment
                    operator: In
                    values:
                      - production
                  - key: hardware
                    operator: In
                    values:
                      - standard
                      - high-memory
      containers:
        - name: web
          image: nginx:1.25
          ports:
            - containerPort: 80
```

## Step 3: Configure Preferred Node Affinity

Set a soft preference for node scheduling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache-service
  template:
    metadata:
      labels:
        app: cache-service
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 80
              preference:
                matchExpressions:
                  - key: hardware
                    operator: In
                    values:
                      - high-memory
            - weight: 20
              preference:
                matchExpressions:
                  - key: topology.kubernetes.io/zone
                    operator: In
                    values:
                      - us-east-1a
      containers:
        - name: cache
          image: redis:7
```

The `weight` field (1-100) determines the priority of each preference. Higher weights mean stronger preferences.

## Step 4: Configure Pod Anti-Affinity

Spread pods across nodes to improve availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - api-service
              topologyKey: kubernetes.io/hostname
      containers:
        - name: api
          image: myapp/api:latest
          ports:
            - containerPort: 8080
```

This ensures no two `api-service` pods run on the same node.

## Step 5: Configure Pod Affinity

Co-locate pods that benefit from being on the same node:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: log-collector
spec:
  replicas: 3
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      affinity:
        podAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - api-service
              topologyKey: kubernetes.io/hostname
      containers:
        - name: collector
          image: fluentbit/fluent-bit:latest
```

This schedules `log-collector` pods on the same nodes as `api-service` pods.

## Step 6: Zone-Based Anti-Affinity

Prefer spreading pods across availability zones:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-replica
spec:
  replicas: 3
  selector:
    matchLabels:
      app: database-replica
  template:
    metadata:
      labels:
        app: database-replica
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - database-replica
                topologyKey: topology.kubernetes.io/zone
      containers:
        - name: db
          image: postgres:16
```

This prefers placing replicas in different zones. If you need hard zone-based pod anti-affinity, make sure your cluster admission configuration allows a `topologyKey` other than `kubernetes.io/hostname`.

## Step 7: Combine Affinity and Anti-Affinity

Use multiple affinity types together for precise scheduling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-worker
spec:
  replicas: 4
  selector:
    matchLabels:
      app: ml-worker
  template:
    metadata:
      labels:
        app: ml-worker
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: hardware
                    operator: In
                    values:
                      - gpu
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - ml-worker
                topologyKey: kubernetes.io/hostname
      containers:
        - name: worker
          image: myapp/ml-worker:latest
          resources:
            limits:
              nvidia.com/gpu: 1
```

This configuration requires GPU nodes and prefers spreading ML worker pods across different nodes.

## Step 8: Configure Affinity in Rancher UI

Use the Rancher UI for simpler affinity configurations:

1. Open your cluster in Rancher.
2. Navigate to **Workloads** and select or create a deployment.
3. In the workload form, open the **Node Scheduling** section.
4. Configure node selectors or advanced scheduling rules, depending on your Rancher version.
5. Add your affinity rules using the form fields, or edit the workload YAML directly for more complex rules.
6. Click **Save**.

## Step 9: Verify Affinity Rules

Check that pods are scheduled according to your affinity rules:

```bash
# Check pod placement
kubectl get pods -o wide -l app=api-service

# Verify node labels
kubectl get nodes --show-labels | grep -E "zone|hardware|environment"

# Check scheduling events
kubectl describe pod <pod-name> | grep -A 10 "Events:"

# Check if pods are pending due to affinity constraints
kubectl get pods --field-selector=status.phase=Pending
```

## Step 10: Troubleshoot Scheduling Issues

When pods are stuck in Pending due to affinity rules:

```bash
# Check why a pod is not being scheduled
kubectl describe pod <pending-pod-name>

# Look for events like:
# "0/6 nodes are available: 3 node(s) didn't match pod affinity/anti-affinity,
# 3 node(s) didn't match node affinity"

# List nodes with their labels
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
ZONE:.metadata.labels.topology\\.kubernetes\\.io/zone,\
HARDWARE:.metadata.labels.hardware,\
ENV:.metadata.labels.environment
```

Common solutions:

- Relax hard requirements to soft preferences.
- Add more nodes with the required labels.
- Verify that label keys and values match exactly.
- Use `NotIn` or `DoesNotExist` operators instead of `In` when excluding nodes.

## Best Practices

- **Start with preferred rules**: Use `preferredDuringSchedulingIgnoredDuringExecution` initially and switch to `requiredDuringSchedulingIgnoredDuringExecution` only when necessary.
- **Label nodes consistently**: Establish a labeling convention and automate label application through your cluster provisioning workflow or node pools.
- **Test in staging**: Before applying affinity rules to production workloads, test them in a staging environment.
- **Monitor scheduling latency**: Complex affinity rules can slow down scheduling. Monitor scheduler performance.
- **Document your strategy**: Maintain documentation of your affinity rules and the reasons behind them so that new team members can understand the scheduling logic.

## Conclusion

Affinity and anti-affinity rules in Rancher give you fine-grained control over where your workloads run. By combining node labels with affinity rules, you can optimize resource utilization, improve availability, and ensure workloads land on appropriate hardware. Start with simple rules and add complexity as your scheduling needs grow.
