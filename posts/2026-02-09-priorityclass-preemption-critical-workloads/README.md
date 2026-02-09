# How to Configure PriorityClass and Preemption for Critical System Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, PriorityClass

Description: Master the configuration of PriorityClass and preemption in Kubernetes to ensure critical workloads always get the resources they need, even in resource-constrained clusters.

---

When your Kubernetes cluster runs out of resources, not all workloads are equally important. System-critical services like monitoring agents, security scanners, or core infrastructure components should take precedence over lower-priority batch jobs or experimental workloads.

PriorityClass allows you to define the relative importance of pods, and preemption enables the scheduler to evict lower-priority pods to make room for critical workloads when resources are scarce.

## Understanding PriorityClass

PriorityClass is a cluster-wide resource that assigns a priority value to pods. Higher values indicate higher priority. When the scheduler cannot place a pod due to resource constraints, it can evict lower-priority pods to make room.

The priority value is an integer, typically ranging from 0 to 1,000,000,000. Kubernetes reserves values above 1,000,000,000 for system-critical pods that should never be preempted.

## Creating Basic PriorityClasses

Let's create a priority hierarchy for different workload types:

```yaml
# priority-classes.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: system-critical
value: 1000000000  # Very high priority
globalDefault: false
description: "Reserved for critical system components that must always run"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-high
value: 100000
globalDefault: false
description: "High priority production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-medium
value: 50000
globalDefault: false
description: "Medium priority production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-low
value: 10000
globalDefault: true  # This will be the default for pods without priorityClassName
description: "Low priority production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-jobs
value: 1000
globalDefault: false
description: "Best-effort batch processing jobs"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: development
value: 100
globalDefault: false
description: "Development and testing workloads"
```

Apply these PriorityClasses:

```bash
kubectl apply -f priority-classes.yaml

# Verify they were created
kubectl get priorityclasses
```

## Assigning PriorityClass to Critical Workloads

Here's how to use PriorityClass for critical infrastructure components:

```yaml
# monitoring-agent.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-monitoring-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-agent
  template:
    metadata:
      labels:
        app: monitoring-agent
    spec:
      # Assign system-critical priority
      priorityClassName: system-critical
      containers:
      - name: agent
        image: monitoring-agent:v1.0
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
        volumeMounts:
        - name: host-metrics
          mountPath: /host
          readOnly: true
      volumes:
      - name: host-metrics
        hostPath:
          path: /proc
          type: Directory
```

## Production Application with High Priority

Critical production services should have high priority:

```yaml
# api-server.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      # High priority for customer-facing API
      priorityClassName: production-high
      containers:
      - name: api
        image: api-server:v2.1
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 2Gi
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Lower Priority Batch Jobs

Batch jobs that can tolerate interruption should have lower priority:

```yaml
# batch-processor.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processing-job
  namespace: batch
spec:
  parallelism: 10
  completions: 100
  template:
    metadata:
      labels:
        app: data-processor
    spec:
      # Low priority - can be preempted
      priorityClassName: batch-jobs
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: data-processor:v1.5
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        env:
        - name: BATCH_SIZE
          value: "1000"
        - name: CHECKPOINT_ENABLED
          value: "true"
```

## Understanding Preemption Behavior

When preemption occurs, the scheduler:

1. Identifies pods that can be evicted (lower priority than the pending pod)
2. Chooses victims that minimize the number of preempted pods
3. Sends a graceful termination signal (SIGTERM)
4. Waits for the graceful termination period
5. Schedules the high-priority pod once space is available

## Viewing Preemption Events

Monitor preemption activity:

```bash
# Watch for preemption events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep Preempt

# Detailed event information
kubectl get events --all-namespaces -o json | \
  jq '.items[] | select(.reason=="Preempted") | {namespace: .involvedObject.namespace, pod: .involvedObject.name, message: .message}'
```

## Testing Preemption

Create a test scenario to see preemption in action:

```yaml
# resource-hog.yaml - Fill up the cluster first
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-hog
spec:
  replicas: 20
  selector:
    matchLabels:
      app: resource-hog
  template:
    metadata:
      labels:
        app: resource-hog
    spec:
      priorityClassName: development  # Low priority
      containers:
      - name: hogger
        image: nginx:1.21
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
```

Deploy the low-priority workload, then deploy a high-priority pod:

```yaml
# critical-service.yaml
apiVersion: v1
kind: Pod
metadata:
  name: critical-service
spec:
  priorityClassName: production-high
  containers:
  - name: service
    image: nginx:1.21
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
```

Watch what happens:

```bash
# Deploy low-priority workload first
kubectl apply -f resource-hog.yaml

# Wait for pods to be running
kubectl wait --for=condition=ready pod -l app=resource-hog --timeout=120s

# Now deploy the critical service
kubectl apply -f critical-service.yaml

# Watch preemption in real-time
kubectl get events --watch | grep -i preempt
```

## Advanced PriorityClass Configuration

Create a PriorityClass with preemption disabled:

```yaml
# non-preempting-priority.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-no-preempt
value: 75000
preemptionPolicy: Never  # This priority class will not preempt other pods
globalDefault: false
description: "High priority but won't cause preemption"
```

This is useful for important workloads that should be scheduled with high priority but shouldn't disrupt running pods.

## Protecting Pods from Preemption

Use PodDisruptionBudgets to limit how many pods can be preempted:

```yaml
# pdb-protection.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-server-pdb
  namespace: production
spec:
  minAvailable: 3  # Always keep at least 3 API server pods
  selector:
    matchLabels:
      app: api-server
```

Even if lower-priority pods exist, the scheduler won't preempt them if it would violate the PDB.

## Quota and Priority

Combine PriorityClass with ResourceQuotas for fine-grained control:

```yaml
# priority-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-high-quota
  namespace: production
spec:
  hard:
    requests.cpu: "100"
    requests.memory: "200Gi"
    persistentvolumeclaims: "50"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["production-high"]
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: batch-jobs-quota
  namespace: batch
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["batch-jobs", "development"]
```

## StatefulSet with Priority

StatefulSets benefit from priority to ensure critical stateful workloads aren't preempted:

```yaml
# database-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: production
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      priorityClassName: production-high
      containers:
      - name: postgres
        image: postgres:14
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

## Monitoring Priority and Preemption

Create a monitoring dashboard to track priority-related metrics:

```bash
# Count pods by priority class
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | .spec.priorityClassName // "default"' | \
  sort | uniq -c

# Find pending pods with their priority
kubectl get pods --all-namespaces --field-selector=status.phase=Pending -o json | \
  jq -r '.items[] | {namespace: .metadata.namespace, name: .metadata.name, priority: .spec.priority, priorityClass: .spec.priorityClassName}'

# Check recent preemption events
kubectl get events --all-namespaces --field-selector reason=Preempted --sort-by='.lastTimestamp'
```

## Prometheus Metrics for Priority

Export custom metrics to track preemption:

```yaml
# priority-metrics-exporter.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: metrics-script
  namespace: monitoring
data:
  export-metrics.sh: |
    #!/bin/bash
    while true; do
      # Count preemption events in the last hour
      preemptions=$(kubectl get events --all-namespaces \
        --field-selector reason=Preempted \
        -o json | jq '[.items[] | select(.lastTimestamp > (now - 3600 | todate))] | length')

      echo "priority_preemptions_total $preemptions" > /metrics/preemptions.prom
      sleep 60
    done
```

## Best Practices

1. **Use System-Critical Sparingly**: Reserve very high priorities (>1,000,000,000) only for essential system components
2. **Establish Clear Tiers**: Define 3-5 priority levels that map to your organizational needs
3. **Document Priority Policies**: Create clear guidelines for which workloads get which priority
4. **Protect with PDBs**: Use PodDisruptionBudgets to prevent excessive preemption of important workloads
5. **Monitor Preemption**: Track preemption events to ensure the system is working as intended
6. **Test Under Load**: Simulate resource pressure to validate priority behavior
7. **Default to Low Priority**: Make the default priority low so teams must explicitly request higher priority
8. **Consider Costs**: Higher-priority pods consume resources first, affecting cluster utilization

## Troubleshooting Priority Issues

If high-priority pods aren't being scheduled:

```bash
# Check if PriorityClass exists
kubectl get priorityclass production-high

# Verify pod has correct priority assigned
kubectl get pod critical-service -o jsonpath='{.spec.priority}'

# Look for scheduler events
kubectl describe pod critical-service | grep -A 10 Events

# Check if preemption is happening
kubectl get events --all-namespaces | grep -i preempt

# Verify node resources
kubectl top nodes
```

If preemption isn't working as expected:

```bash
# Check scheduler configuration
kubectl get configmap -n kube-system kube-scheduler -o yaml

# Verify no PDBs are blocking preemption
kubectl get pdb --all-namespaces

# Check if pods have appropriate resource requests
kubectl get pods --all-namespaces -o json | \
  jq '.items[] | {name: .metadata.name, requests: .spec.containers[].resources.requests}'
```

PriorityClass and preemption are essential tools for managing resource-constrained Kubernetes clusters. By properly configuring priorities, you ensure that critical workloads always get the resources they need while less important workloads gracefully yield when necessary.

