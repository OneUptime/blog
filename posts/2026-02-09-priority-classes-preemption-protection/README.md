# How to Configure Kubernetes Priority Classes for Production Workload Preemption Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Priority, Scheduling

Description: Learn how to configure Kubernetes Priority Classes to protect critical production workloads from preemption while enabling efficient resource utilization for batch jobs.

---

Kubernetes Priority Classes determine which pods get scheduled first and which pods can be evicted when cluster resources are scarce. Without proper priority configuration, critical production services can be preempted by lower-priority batch jobs, causing outages. This guide shows you how to configure priority classes to protect production workloads while maintaining cluster efficiency.

## Understanding Priority and Preemption

Priority classes assign numeric values to pods. When the scheduler cannot find resources for a high-priority pod, it may preempt (evict) lower-priority pods to make room. The default priority is zero.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: system-critical
value: 1000000000  # Very high priority for system components
globalDefault: false
description: "Reserved for critical system components"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-high
value: 100000
globalDefault: false
description: "Critical production services that must not be preempted"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-medium
value: 10000
globalDefault: false
description: "Standard production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-low
value: 1000
globalDefault: false
description: "Production workloads that can tolerate occasional preemption"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: batch-jobs
value: 100
globalDefault: true  # Default for workloads without explicit priority
description: "Batch processing and non-critical workloads"
```

This hierarchy ensures critical services always get resources first while batch jobs fill unused capacity.

## Protecting Critical Services from Preemption

Apply high priority classes to production services that cannot tolerate interruption.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
        tier: critical
    spec:
      priorityClassName: production-high
      containers:
      - name: payment-api
        image: payment-service:v1.2.3
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1
            memory: 2Gi
        ports:
        - containerPort: 8080
          name: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-facing-api
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: user-api
  template:
    metadata:
      labels:
        app: user-api
        tier: high
    spec:
      priorityClassName: production-high
      containers:
      - name: api
        image: user-api:v2.1.0
        resources:
          requests:
            cpu: 300m
            memory: 512Mi
          limits:
            cpu: 1
            memory: 1Gi
```

Pods with `production-high` priority will never be preempted by lower-priority workloads, ensuring service availability.

## Implementing Non-Preempting Priority Classes

Some workloads need scheduling priority but should not preempt existing pods.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: data-processing-important
value: 50000
preemptionPolicy: Never  # Will not preempt other pods
globalDefault: false
description: "Important data processing that needs priority but won't evict others"
---
apiVersion: batch/v1
kind: Job
metadata:
  name: daily-report-generation
  namespace: analytics
spec:
  template:
    metadata:
      labels:
        app: report-generator
    spec:
      priorityClassName: data-processing-important
      restartPolicy: OnFailure
      containers:
      - name: report-gen
        image: report-generator:latest
        resources:
          requests:
            cpu: 2
            memory: 4Gi
          limits:
            cpu: 4
            memory: 8Gi
        command:
        - /app/generate-reports
        - --date=$(date +%Y-%m-%d)
```

This job gets preferential scheduling over low-priority workloads but will not evict running pods, preventing disruption.

## Configuring Batch Workloads for Preemption Tolerance

Design batch jobs to handle preemption gracefully through checkpointing and state management.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-ingestion-batch
  namespace: batch-processing
spec:
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: data-ingestion
        priority: low
    spec:
      priorityClassName: batch-jobs  # Low priority, can be preempted
      restartPolicy: OnFailure
      containers:
      - name: ingestion-worker
        image: data-ingestion:v1.0.0
        env:
        - name: CHECKPOINT_INTERVAL
          value: "300"  # Save progress every 5 minutes
        - name: CHECKPOINT_PATH
          value: "/data/checkpoints"
        - name: RESUME_FROM_CHECKPOINT
          value: "true"
        resources:
          requests:
            cpu: 1
            memory: 2Gi
          limits:
            cpu: 2
            memory: 4Gi
        volumeMounts:
        - name: checkpoint-storage
          mountPath: /data/checkpoints
      volumes:
      - name: checkpoint-storage
        persistentVolumeClaim:
          claimName: batch-checkpoints
```

When this job is preempted, it can resume from the last checkpoint rather than starting over, minimizing wasted work.

## Setting Up Priority-Based Resource Quotas

Prevent abuse of high-priority classes by limiting which namespaces can use them.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-high-priority-quota
  namespace: production
spec:
  hard:
    pods: "100"
    requests.cpu: "50"
    requests.memory: 100Gi
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
  namespace: batch-processing
spec:
  hard:
    pods: "500"
    requests.cpu: "200"
    requests.memory: 400Gi
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["batch-jobs"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: production-high-priority-user
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["create"]
  resourceNames: ["production-high"]  # Only specific service accounts can use this
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: payment-service-priority
  namespace: production
subjects:
- kind: ServiceAccount
  name: payment-service-sa
  namespace: production
roleRef:
  kind: Role
  name: production-high-priority-user
  apiGroup: rbac.authorization.k8s.io
```

These quotas ensure high-priority classes are only used by authorized workloads in appropriate namespaces.

## Monitoring Preemption Events

Track preemption events to understand their impact and tune priority settings accordingly.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: preemption-monitoring
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: priority_preemption
      interval: 30s
      rules:
      # Alert on production pod preemption
      - alert: ProductionPodPreempted
        expr: |
          increase(kube_pod_status_reason{reason="Preempted",namespace="production"}[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Production pod was preempted"
          description: "Pod {{ $labels.pod }} in production namespace was preempted"

      # Track preemption rate
      - alert: HighPreemptionRate
        expr: |
          rate(kube_pod_status_reason{reason="Preempted"}[10m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High pod preemption rate detected"
          description: "Cluster experiencing {{ $value }} preemptions per second"

      # Monitor priority class usage
      - alert: UnauthorizedHighPriority
        expr: |
          count by (namespace) (
            kube_pod_spec_priority_class_name{priority_class="production-high"}
          ) and on(namespace)
          kube_namespace_labels{label_environment!="production"}
        labels:
          severity: warning
        annotations:
          summary: "High priority class used outside production"
          description: "Namespace {{ $labels.namespace }} using production-high priority"
```

These alerts provide visibility into preemption patterns and unauthorized priority class usage.

## Implementing Gradual Priority Migration

When introducing priority classes to existing clusters, migrate workloads gradually to avoid disruption.

```bash
#!/bin/bash
# Script to gradually migrate deployments to priority classes

NAMESPACE="production"
PRIORITY_CLASS="production-medium"

# Get all deployments
DEPLOYMENTS=$(kubectl get deployments -n $NAMESPACE -o name)

for DEPLOYMENT in $DEPLOYMENTS; do
  CURRENT_PRIORITY=$(kubectl get $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.template.spec.priorityClassName}')

  if [ -z "$CURRENT_PRIORITY" ]; then
    echo "Migrating $DEPLOYMENT to priority class $PRIORITY_CLASS"

    # Patch deployment with priority class
    kubectl patch $DEPLOYMENT -n $NAMESPACE --type='strategic' -p '{
      "spec": {
        "template": {
          "spec": {
            "priorityClassName": "'$PRIORITY_CLASS'"
          }
        }
      }
    }'

    # Wait for rollout to complete
    kubectl rollout status $DEPLOYMENT -n $NAMESPACE

    # Monitor for issues before continuing
    sleep 60

    # Check pod status
    READY_PODS=$(kubectl get $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    DESIRED_PODS=$(kubectl get $DEPLOYMENT -n $NAMESPACE -o jsonpath='{.spec.replicas}')

    if [ "$READY_PODS" != "$DESIRED_PODS" ]; then
      echo "WARNING: $DEPLOYMENT not fully ready after priority class migration"
      # Rollback if issues occur
      kubectl rollout undo $DEPLOYMENT -n $NAMESPACE
    else
      echo "Successfully migrated $DEPLOYMENT"
    fi
  else
    echo "$DEPLOYMENT already has priority class: $CURRENT_PRIORITY"
  fi
done
```

This script adds priority classes incrementally with validation at each step.

## Handling Priority Class Conflicts

Define clear policies for resolving priority conflicts between teams and workloads.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: priority-class-policy
  namespace: kube-system
data:
  policy.yaml: |
    # Priority Class Assignment Guidelines

    production-high (100000):
      - User-facing APIs with SLAs
      - Payment and transaction processing
      - Real-time communication services
      - Maximum 20% of cluster capacity

    production-medium (10000):
      - Backend services
      - Caching layers
      - Standard microservices
      - Maximum 40% of cluster capacity

    production-low (1000):
      - Internal tools
      - Admin interfaces
      - Non-critical services
      - Maximum 20% of cluster capacity

    batch-jobs (100):
      - Data processing
      - Report generation
      - ML training (non-time-critical)
      - Can use all remaining capacity

    # Approval Process
    # - production-high requires VP-level approval
    # - production-medium requires team lead approval
    # - production-low and batch-jobs are self-service
```

Document and enforce these policies through RBAC and admission controllers.

## Conclusion

Kubernetes Priority Classes are essential for protecting critical production workloads from resource contention and preemption. Create a clear priority hierarchy with system-critical at the top, multiple production tiers in the middle, and batch jobs at the bottom. Use the preemptionPolicy field to prevent important workloads from evicting others while still giving them scheduling priority. Implement resource quotas and RBAC to control priority class usage and prevent abuse. Monitor preemption events to validate your priority configuration. Design batch workloads to handle preemption gracefully through checkpointing. Migrate existing workloads gradually to priority classes to avoid disruption. With proper priority configuration, you can maximize cluster utilization while ensuring critical services always have the resources they need.
