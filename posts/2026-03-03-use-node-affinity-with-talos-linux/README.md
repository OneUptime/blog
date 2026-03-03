# How to Use Node Affinity with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Node Affinity, Pod Scheduling, Infrastructure

Description: Learn how to use node affinity rules in Talos Linux to control pod placement across your Kubernetes cluster nodes effectively.

---

When you run workloads on Kubernetes, you often need fine-grained control over where your pods land. Maybe you have GPU nodes that should only run machine learning workloads, or you want your database pods to stick to nodes with SSD storage. This is where node affinity comes in, and if you are running Talos Linux as your Kubernetes OS, the process is straightforward but has a few nuances worth understanding.

Talos Linux is an immutable, API-driven operating system designed specifically for Kubernetes. Since you cannot SSH into Talos nodes or run arbitrary commands on them, everything from node labels to system configuration is handled through the Talos API or Kubernetes itself. This makes node affinity particularly important because it is one of your primary tools for directing traffic and workloads in a controlled way.

## Understanding Node Affinity

Node affinity is a set of rules that tells the Kubernetes scheduler which nodes are eligible to host a particular pod. It is similar to nodeSelector but far more expressive. There are two types of node affinity:

- **requiredDuringSchedulingIgnoredDuringExecution** - The scheduler will not place the pod on a node unless the rule is met. This is a hard requirement.
- **preferredDuringSchedulingIgnoredDuringExecution** - The scheduler will try to place the pod on a matching node, but if none is available, it will schedule the pod elsewhere. This is a soft preference.

Both types use label selectors to match against node labels. The key to making node affinity work is having the right labels on your nodes.

## Labeling Nodes in Talos Linux

In Talos Linux, you can add labels to nodes through the machine configuration. This is the preferred approach because it ensures labels persist across reboots and upgrades. Here is how you add node labels in your Talos machine config:

```yaml
# talos-machine-config-patch.yaml
# Add custom labels to the node through machine config
machine:
  nodeLabels:
    node-role.kubernetes.io/gpu: "true"
    disktype: ssd
    environment: production
```

Apply this patch to your node using talosctl:

```bash
# Apply the machine config patch to a specific node
talosctl apply-config --nodes 192.168.1.10 --patch @talos-machine-config-patch.yaml
```

You can also label nodes directly through kubectl, though these labels will not persist through a Talos upgrade unless they are in the machine config:

```bash
# Label a node using kubectl (non-persistent through upgrades)
kubectl label nodes talos-worker-1 disktype=ssd

# Verify the label was applied
kubectl get nodes --show-labels | grep disktype
```

## Using Required Node Affinity

Let us say you have a PostgreSQL database that must run on nodes with SSD storage. You would set up a required node affinity rule like this:

```yaml
# postgres-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: database
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      affinity:
        nodeAffinity:
          # Hard requirement - pod will not schedule without this
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: disktype
                operator: In
                values:
                - ssd
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

The operators you can use in matchExpressions include In, NotIn, Exists, DoesNotExist, Gt, and Lt. This gives you flexible matching. For example, if you want a pod to avoid GPU nodes:

```yaml
# Schedule on any node that is NOT a GPU node
nodeSelectorTerms:
- matchExpressions:
  - key: node-role.kubernetes.io/gpu
    operator: DoesNotExist
```

## Using Preferred Node Affinity

Sometimes you want to express a preference rather than a hard requirement. Preferred affinity rules include a weight between 1 and 100. The scheduler scores each node based on how well it matches your preferences, and higher weights carry more influence.

```yaml
# web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
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
          # Soft preference - scheduler will try but not guarantee
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 80
            preference:
              matchExpressions:
              - key: environment
                operator: In
                values:
                - production
          - weight: 20
            preference:
              matchExpressions:
              - key: zone
                operator: In
                values:
                - us-east-1a
      containers:
      - name: web
        image: nginx:latest
        ports:
        - containerPort: 80
```

In this example, the scheduler strongly prefers production nodes (weight 80) and has a lighter preference for nodes in us-east-1a (weight 20). If no production nodes are available, the pods will still schedule on whatever nodes have room.

## Combining Required and Preferred Affinity

You can combine both types of affinity in a single pod spec. This is useful when you have a hard requirement plus a softer preference:

```yaml
# combined-affinity-example.yaml
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          # Must be an SSD node
          - key: disktype
            operator: In
            values:
            - ssd
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 50
        preference:
          matchExpressions:
          # Prefer nodes in zone A, but zone B SSDs are fine too
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - zone-a
```

## Talos-Specific Considerations

There are a few things to keep in mind when working with node affinity on Talos Linux.

First, Talos automatically applies certain labels to nodes based on their role. Control plane nodes get the `node-role.kubernetes.io/control-plane` label. You can use this to keep workloads off control plane nodes or direct specific monitoring tools to them.

Second, since Talos is immutable, any labels you apply through kubectl may disappear after a node upgrade or reset. Always put important labels in your machine configuration to ensure they survive lifecycle events.

Third, if you are running a mixed cluster with different hardware profiles, use the machine config to tag each node type at provisioning time. This way, your affinity rules work from the moment the cluster is up.

```yaml
# Example: Talos machine config for a high-memory worker node
machine:
  nodeLabels:
    hardware-profile: high-memory
    memory-tier: "64gb"
    node-role.kubernetes.io/worker: ""
```

## Debugging Node Affinity

If a pod is stuck in Pending state, it might be because no nodes match your affinity rules. Check the pod events to find out:

```bash
# Check why a pod is not scheduling
kubectl describe pod <pod-name> | grep -A 10 Events

# List all nodes with their labels to verify matching
kubectl get nodes --show-labels

# Check which nodes would match a specific label
kubectl get nodes -l disktype=ssd
```

A common mistake is using labels that do not exist on any node, or misspelling a label key. Always verify your node labels before deploying workloads with strict affinity rules.

## Wrapping Up

Node affinity on Talos Linux works just like any other Kubernetes cluster, with the important addition that you should declare your node labels in the Talos machine configuration for persistence. Use required affinity when you absolutely need a pod on a specific type of node, and preferred affinity when you want to influence placement without blocking scheduling entirely. The combination of Talos Linux's declarative configuration and Kubernetes node affinity gives you reliable, repeatable control over workload placement across your cluster.
