# How to Use Descheduler RemoveDuplicates Strategy to Rebalance Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Descheduler, Pod Management

Description: Learn how to use the Descheduler RemoveDuplicates strategy to eliminate duplicate pods on the same node and achieve better pod distribution across your Kubernetes cluster.

---

When you deploy applications in Kubernetes, the scheduler places pods on nodes based on available resources and constraints. However, over time, you might end up with multiple replicas of the same deployment running on the same node. This creates a single point of failure and defeats the purpose of running multiple replicas for high availability.

The Descheduler RemoveDuplicates strategy solves this problem by identifying and evicting duplicate pods from nodes, giving the scheduler a chance to place replacement pods on different nodes when cluster constraints allow it.

## Understanding the RemoveDuplicates Strategy

The RemoveDuplicates strategy identifies pods that belong to the same controller (ReplicaSet, ReplicationController, StatefulSet, or Job) running on the same node and have at least one matching container image. Pods created by Deployments are included because they are owned by ReplicaSets. When it finds duplicates, it evicts the excess pods, keeping only one pod per controller per node when possible.

This strategy is particularly useful when:
- Nodes have been added or removed from the cluster
- Pods were initially scheduled during cluster scaling events
- You want to ensure high availability by spreading replicas across nodes
- Resource distribution is uneven after cluster changes

## Installing the Descheduler

First, you need to install the Descheduler in your cluster. You can deploy it using Helm or apply the manifests directly.

```yaml
# descheduler-rbac.yaml

apiVersion: v1
kind: ServiceAccount
metadata:
  name: descheduler-sa
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: descheduler-cluster-role
rules:
- apiGroups: ["events.k8s.io"]
  resources: ["events"]
  verbs: ["create", "update"]
- apiGroups: [""]
  resources: ["nodes"]
  verbs: ["get", "watch", "list"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "watch", "list"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list", "delete"]
- apiGroups: [""]
  resources: ["pods/eviction"]
  verbs: ["create"]
- apiGroups: ["scheduling.k8s.io"]
  resources: ["priorityclasses"]
  verbs: ["get", "watch", "list"]
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  verbs: ["create"]
- apiGroups: ["coordination.k8s.io"]
  resources: ["leases"]
  resourceNames: ["descheduler"]
  verbs: ["get", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: descheduler-cluster-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: descheduler-cluster-role
subjects:
- kind: ServiceAccount
  name: descheduler-sa
  namespace: kube-system
```

## Configuring RemoveDuplicates Strategy

Create a ConfigMap with the RemoveDuplicates strategy configuration:

```yaml
# descheduler-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: "descheduler/v1alpha2"
    kind: "DeschedulerPolicy"
    profiles:
      - name: default
        pluginConfig:
        - name: "DefaultEvictor"
          args:
            # Check that pods can fit on another node before eviction
            nodeFit: true
        - name: "RemoveDuplicates"
          args:
            # Namespaces to include (empty means all)
            namespaces:
              include: []
            # Optional: exclude specific namespaces
            # namespaces:
            #   exclude: ["kube-system"]
        plugins:
          balance:
            enabled:
              - "RemoveDuplicates"
```

## Deploying the Descheduler as a CronJob

The Descheduler typically runs as a CronJob to periodically check and rebalance pods:

```yaml
# descheduler-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: descheduler
  namespace: kube-system
spec:
  # Run every 30 minutes
  schedule: "*/30 * * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          name: descheduler
          labels:
            app: descheduler
        spec:
          serviceAccountName: descheduler-sa
          restartPolicy: Never
          containers:
          - name: descheduler
            image: registry.k8s.io/descheduler/descheduler:v0.28.1
            command:
            - /bin/descheduler
            args:
            - --policy-config-file=/policy/policy.yaml
            - --v=3
            volumeMounts:
            - name: policy-volume
              mountPath: /policy
          volumes:
          - name: policy-volume
            configMap:
              name: descheduler-policy
```

## Advanced Configuration Options

You can fine-tune RemoveDuplicates with namespace filtering and combine it with DefaultEvictor filters:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: descheduler-policy-advanced
  namespace: kube-system
data:
  policy.yaml: |
    apiVersion: "descheduler/v1alpha2"
    kind: "DeschedulerPolicy"
    profiles:
      - name: production
        pluginConfig:
        - name: "DefaultEvictor"
          args:
            # Label selector to filter pods
            labelSelector:
              matchLabels:
                app.kubernetes.io/component: backend
            # Exclude certain pods from eviction
            priorityThreshold:
              value: 10000
              # Only evict pods with priority less than 10000
            nodeFit: true
            # Ensure pods can be rescheduled before evicting
        - name: "RemoveDuplicates"
          args:
            namespaces:
              include: ["production", "staging"]
        plugins:
          balance:
            enabled:
              - "RemoveDuplicates"
```

## Testing the RemoveDuplicates Strategy

Let's create a test deployment that will have duplicate pods:

```yaml
# test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
  namespace: default
spec:
  replicas: 6
  selector:
    matchLabels:
      app: nginx-test
  template:
    metadata:
      labels:
        app: nginx-test
    spec:
      # Initially, we'll force all pods to one node for testing
      nodeSelector:
        kubernetes.io/hostname: worker-node-1
      containers:
      - name: nginx
        image: nginx:1.21
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

After deploying this, you'll see all 6 pods on one node:

```bash
kubectl get pods -o wide | grep nginx-test
```

If you remove the nodeSelector from this Deployment and apply the updated manifest, Kubernetes creates a new ReplicaSet because the Deployment's pod template changed:

```yaml
# test-deployment-updated.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-test
  namespace: default
spec:
  replicas: 6
  selector:
    matchLabels:
      app: nginx-test
  template:
    metadata:
      labels:
        app: nginx-test
    spec:
      # NodeSelector removed
      containers:
      - name: nginx
        image: nginx:1.21
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

For this specific manifest change, the Deployment rollout replaces the old pods. In a real descheduler test, start from an existing ReplicaSet that already has duplicate pods on a node after a node failure, cluster scale event, or previous scheduling constraint; the Descheduler can then evict the duplicates without changing the workload template.

## Monitoring Descheduler Activity

Check the Descheduler logs to see what it's doing:

```bash
# Get the most recent descheduler job
kubectl logs -n kube-system -l app=descheduler --tail=100
```

You should see output like:

```text
I0209 10:30:15.123456 1 removeDuplicates.go:89] Processing namespace default
I0209 10:30:15.234567 1 removeDuplicates.go:112] Found 5 duplicate pods for deployment nginx-test on node worker-node-1
I0209 10:30:15.345678 1 evictions.go:160] Evicted pod nginx-test-7d8f9c5b-xyz12
I0209 10:30:15.456789 1 evictions.go:160] Evicted pod nginx-test-7d8f9c5b-abc34
```

## Combining with Pod Topology Spread Constraints

For even better distribution, combine RemoveDuplicates with Pod Topology Spread Constraints:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-optimized
spec:
  replicas: 6
  selector:
    matchLabels:
      app: nginx-optimized
  template:
    metadata:
      labels:
        app: nginx-optimized
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: nginx-optimized
      containers:
      - name: nginx
        image: nginx:1.21
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

This ensures new pods are spread evenly, while the Descheduler handles existing imbalances.

## Running Descheduler as a Deployment

Instead of a CronJob, you can run the Descheduler continuously:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: descheduler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: descheduler
  template:
    metadata:
      labels:
        app: descheduler
    spec:
      serviceAccountName: descheduler-sa
      containers:
      - name: descheduler
        image: registry.k8s.io/descheduler/descheduler:v0.28.1
        command:
        - /bin/descheduler
        args:
        - --policy-config-file=/policy/policy.yaml
        - --descheduling-interval=5m
        - --v=3
        volumeMounts:
        - name: policy-volume
          mountPath: /policy
      volumes:
      - name: policy-volume
        configMap:
          name: descheduler-policy
```

## Best Practices

When using the RemoveDuplicates strategy, follow these guidelines:

1. Start with longer intervals (every 30-60 minutes) to avoid excessive pod churn
2. Use PodDisruptionBudgets to prevent service disruptions during evictions
3. Set appropriate priority thresholds to protect critical workloads
4. Monitor eviction events to ensure the strategy is working as expected
5. Combine with other descheduler strategies for comprehensive cluster optimization
6. Test in non-production environments first to understand the impact

The RemoveDuplicates strategy is a powerful tool for maintaining high availability and even resource distribution in your Kubernetes cluster. By automatically identifying and evicting duplicate pods, it helps your applications remain resilient to node failures while making better use of your cluster resources.
