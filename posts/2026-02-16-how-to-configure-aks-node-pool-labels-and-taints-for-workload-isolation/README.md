# How to Configure AKS Node Pool Labels and Taints for Workload Isolation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Node Pools, Taints, Labels, Workload Isolation, Scheduling

Description: Learn how to use AKS node pool labels and taints to isolate workloads, dedicate nodes to specific teams, and optimize resource allocation across your cluster.

---

On a shared AKS cluster, you do not want your batch processing jobs running on the same nodes as your latency-sensitive API servers. You do not want a team's dev workloads consuming GPU nodes meant for machine learning. And you definitely do not want random pods landing on nodes that were provisioned for a specific purpose. Node pool labels and taints give you the control to ensure workloads land exactly where they belong.

Labels are like tags - they help you target nodes for scheduling. Taints are like repellents - they push pods away from nodes unless the pod explicitly tolerates the taint. Together, they form a robust workload isolation strategy.

## Understanding the Difference

**Labels** with **nodeSelector** or **nodeAffinity**: "I want to run on nodes with this label." The pod expresses a preference or requirement for certain nodes.

**Taints** with **tolerations**: "Only pods that tolerate this taint can run here." The node rejects pods that do not have the matching toleration.

The crucial difference is direction. Labels attract pods to nodes. Taints repel pods from nodes. For true isolation, you typically use both together.

## Adding Labels to Node Pools

When you create or update a node pool on AKS, you can attach labels that apply to every node in that pool.

```bash
# Create a node pool with labels
az aks nodepool add \
  --resource-group myRG \
  --cluster-name myAKS \
  --name apipool \
  --node-count 3 \
  --node-vm-size Standard_D4s_v5 \
  --labels workload=api team=backend environment=production

# Add labels to an existing node pool
az aks nodepool update \
  --resource-group myRG \
  --cluster-name myAKS \
  --name gpupool \
  --labels workload=ml team=data gpu=true

# Verify the labels on nodes
kubectl get nodes --show-labels | grep "workload="
```

These labels persist across node restarts and scale operations. Any new node added to the pool automatically gets the same labels.

## Scheduling Pods with Node Selectors

The simplest way to target labeled nodes is with `nodeSelector`.

```yaml
# api-deployment.yaml
# Deploy API pods specifically on nodes labeled for API workloads
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      # Simple node selector - pod only runs on matching nodes
      nodeSelector:
        workload: api
        team: backend
      containers:
        - name: api
          image: myacr.azurecr.io/api:v2.1
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
```

## Advanced Scheduling with Node Affinity

Node affinity provides more flexible matching than nodeSelector. You can express preferences (soft requirements) in addition to hard requirements.

```yaml
# ml-training-job.yaml
# Use node affinity for flexible GPU scheduling
apiVersion: batch/v1
kind: Job
metadata:
  name: ml-training
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          # Hard requirement - must have a GPU
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: gpu
                    operator: In
                    values:
                      - "true"
          # Soft preference - prefer nodes with specific GPU type
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: gpu-type
                    operator: In
                    values:
                      - a100
            - weight: 50
              preference:
                matchExpressions:
                  - key: gpu-type
                    operator: In
                    values:
                      - v100
      containers:
        - name: trainer
          image: myacr.azurecr.io/ml-trainer:latest
          resources:
            limits:
              nvidia.com/gpu: 1
      restartPolicy: Never
```

The required affinity ensures the job only runs on GPU nodes. The preferred affinity tries to place it on A100 nodes first, then V100 nodes, but does not fail if neither is available.

## Adding Taints to Node Pools

Taints actively prevent pods from scheduling on nodes unless they explicitly tolerate the taint. This is the enforcement mechanism that keeps unwanted workloads off dedicated nodes.

```bash
# Create a node pool with taints
az aks nodepool add \
  --resource-group myRG \
  --cluster-name myAKS \
  --name gpupool \
  --node-count 2 \
  --node-vm-size Standard_NC6s_v3 \
  --node-taints gpu=true:NoSchedule \
  --labels workload=ml gpu=true

# Add taints to an existing node pool
az aks nodepool update \
  --resource-group myRG \
  --cluster-name myAKS \
  --name batchpool \
  --node-taints dedicated=batch:NoSchedule

# Verify taints on nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints
```

There are three taint effects.

- **NoSchedule**: New pods without the toleration will not be scheduled on the node. Existing pods are not affected.
- **PreferNoSchedule**: Kubernetes tries to avoid scheduling pods without the toleration, but does not guarantee it.
- **NoExecute**: Existing pods without the toleration are evicted from the node.

## Configuring Pod Tolerations

For a pod to run on a tainted node, it needs a matching toleration.

```yaml
# gpu-workload.yaml
# Pod that tolerates the GPU taint and targets GPU nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gpu-inference
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gpu-inference
  template:
    metadata:
      labels:
        app: gpu-inference
    spec:
      # Tolerate the GPU taint
      tolerations:
        - key: "gpu"
          operator: "Equal"
          value: "true"
          effect: "NoSchedule"
      # Also use nodeSelector to ensure we land on GPU nodes
      nodeSelector:
        gpu: "true"
      containers:
        - name: inference
          image: myacr.azurecr.io/ml-inference:v1
          resources:
            limits:
              nvidia.com/gpu: 1
            requests:
              cpu: 1
              memory: 4Gi
```

Notice that we use both a toleration (to be allowed on the tainted node) and a nodeSelector (to ensure we target the right node). The toleration alone is not enough - it just means the pod is allowed on the node, not that it will definitely be scheduled there.

## Practical Isolation Patterns

### Pattern 1: Team Isolation

Each team gets their own node pool with labels and taints.

```bash
# Create node pools for each team
az aks nodepool add --resource-group myRG --cluster-name myAKS \
  --name teamalpha --node-count 3 --node-vm-size Standard_D4s_v5 \
  --labels team=alpha --node-taints team=alpha:NoSchedule

az aks nodepool add --resource-group myRG --cluster-name myAKS \
  --name teambeta --node-count 3 --node-vm-size Standard_D4s_v5 \
  --labels team=beta --node-taints team=beta:NoSchedule
```

Each team adds tolerations to their deployments.

```yaml
# team-alpha-deployment.yaml
# Team Alpha's deployment with toleration for their dedicated nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alpha-service
  namespace: team-alpha
spec:
  replicas: 3
  selector:
    matchLabels:
      app: alpha-service
  template:
    metadata:
      labels:
        app: alpha-service
    spec:
      tolerations:
        - key: "team"
          operator: "Equal"
          value: "alpha"
          effect: "NoSchedule"
      nodeSelector:
        team: alpha
      containers:
        - name: service
          image: myacr.azurecr.io/alpha-service:latest
```

### Pattern 2: Environment Isolation

Separate production and staging workloads onto different nodes.

```bash
# Production node pool - no taints needed if it is the default
az aks nodepool add --resource-group myRG --cluster-name myAKS \
  --name prodpool --node-count 5 --node-vm-size Standard_D8s_v5 \
  --labels environment=production

# Staging node pool - tainted to prevent production workloads from landing here
az aks nodepool add --resource-group myRG --cluster-name myAKS \
  --name stagingpool --node-count 2 --node-vm-size Standard_D4s_v5 \
  --labels environment=staging --node-taints environment=staging:NoSchedule
```

### Pattern 3: Workload-Type Isolation

Separate compute-intensive, memory-intensive, and general workloads.

```bash
# General purpose pool (default, no taints)
# Already exists as the system node pool

# Compute-intensive pool
az aks nodepool add --resource-group myRG --cluster-name myAKS \
  --name computepool --node-count 4 --node-vm-size Standard_F16s_v2 \
  --labels workload-type=compute --node-taints workload-type=compute:NoSchedule

# Memory-intensive pool
az aks nodepool add --resource-group myRG --cluster-name myAKS \
  --name memorypool --node-count 3 --node-vm-size Standard_E16s_v5 \
  --labels workload-type=memory --node-taints workload-type=memory:NoSchedule
```

## Removing Taints

If you need to remove taints from a node pool.

```bash
# Remove all taints from a node pool
az aks nodepool update \
  --resource-group myRG \
  --cluster-name myAKS \
  --name gpupool \
  --node-taints ""
```

## Verifying Scheduling Behavior

After setting up labels and taints, verify that pods are landing on the correct nodes.

```bash
# Check where pods are running
kubectl get pods -o wide -n team-alpha

# Verify node labels and taints
kubectl describe node <node-name> | grep -A 5 "Labels\|Taints"

# Check for unschedulable pods (wrong tolerations or missing labels)
kubectl get pods --field-selector=status.phase=Pending
kubectl describe pod <pending-pod-name> | grep -A 10 "Events"
```

## Wrapping Up

Node pool labels and taints are the building blocks of workload isolation on AKS. Labels guide pods to the right nodes, and taints enforce the boundary by rejecting pods that do not belong. Use them together for maximum control - labels as the targeting mechanism and taints as the enforcement mechanism. Start with simple patterns like team or environment isolation, and evolve to more specific patterns as your cluster grows. The investment in proper node pool configuration pays off in predictable performance, clear resource boundaries, and fewer "why is this pod running on that node" mysteries.
