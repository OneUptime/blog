# How to Configure DaemonSet Update Strategies with RollingUpdate and OnDelete

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DaemonSets, Update Strategies, Rolling Updates, Deployment

Description: Master Kubernetes DaemonSet update strategies including RollingUpdate and OnDelete patterns for safe, controlled updates of node-level agents and services.

---

Updating DaemonSets requires careful strategy to avoid service disruption across your cluster. Kubernetes provides two update strategies: RollingUpdate for automated updates with control parameters, and OnDelete for manual, node-by-node updates. This guide explores both approaches and demonstrates how to implement safe DaemonSet updates in production environments.

## Understanding DaemonSet Update Strategies

When you update a DaemonSet template, Kubernetes must replace pods on every node. The update strategy determines how this rollout occurs. RollingUpdate automatically replaces pods with configurable pacing. OnDelete requires manual pod deletion, giving you complete control over update timing.

The choice between strategies depends on your requirements. RollingUpdate works well for stateless agents where automation is desired. OnDelete suits scenarios requiring manual verification at each step, such as storage drivers or critical network components.

## Configuring RollingUpdate Strategy

RollingUpdate is the default strategy. Configure it with MaxUnavailable to control rollout speed:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-collector
  namespace: logging
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  selector:
    matchLabels:
      app: log-collector
  template:
    metadata:
      labels:
        app: log-collector
    spec:
      containers:
      - name: fluentd
        image: fluent/fluentd:v1.16-1
        env:
        - name: FLUENT_UID
          value: "0"
        resources:
          limits:
            memory: 500Mi
            cpu: 500m
          requests:
            memory: 200Mi
            cpu: 100m
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
```

The `maxUnavailable: 1` setting ensures only one pod updates at a time, minimizing risk. For faster updates on large clusters, increase this value:

```yaml
updateStrategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 3  # Update 3 nodes simultaneously
```

You can also use percentages:

```yaml
updateStrategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 10%  # Update 10% of nodes at once
```

## Implementing OnDelete Strategy

OnDelete provides manual control over updates. Pods only update when you delete them:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: storage-driver
  namespace: storage-system
spec:
  updateStrategy:
    type: OnDelete
  selector:
    matchLabels:
      app: storage-driver
  template:
    metadata:
      labels:
        app: storage-driver
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: driver
        image: storage-driver:v2.0
        securityContext:
          privileged: true
        volumeMounts:
        - name: host-root
          mountPath: /host
        - name: dev
          mountPath: /dev
      volumes:
      - name: host-root
        hostPath:
          path: /
      - name: dev
        hostPath:
          path: /dev
```

After updating the DaemonSet spec, manually delete pods to trigger updates:

```bash
# List DaemonSet pods
kubectl get pods -l app=storage-driver -o wide

# Update one node at a time
kubectl delete pod storage-driver-abc123 -n storage-system

# Wait for new pod to become ready
kubectl wait --for=condition=ready pod \
    -l app=storage-driver \
    --field-selector spec.nodeName=node-1 \
    -n storage-system

# Verify storage functionality before proceeding
# Then delete next pod
kubectl delete pod storage-driver-def456 -n storage-system
```

## Creating Progressive Rollout Script

Automate OnDelete updates with a controlled script:

```bash
#!/bin/bash
# progressive-update.sh

NAMESPACE="storage-system"
DAEMONSET="storage-driver"
WAIT_SECONDS=60

# Get all pods
PODS=$(kubectl get pods -n $NAMESPACE -l app=$DAEMONSET -o name)

for POD in $PODS; do
    NODE=$(kubectl get $POD -n $NAMESPACE -o jsonpath='{.spec.nodeName}')
    echo "Updating pod $POD on node $NODE"

    # Delete pod
    kubectl delete $POD -n $NAMESPACE

    # Wait for new pod to be ready
    echo "Waiting for new pod on $NODE to be ready..."
    kubectl wait --for=condition=ready pod \
        -l app=$DAEMONSET \
        --field-selector spec.nodeName=$NODE \
        -n $NAMESPACE \
        --timeout=300s

    if [ $? -ne 0 ]; then
        echo "ERROR: Pod on $NODE failed to become ready"
        exit 1
    fi

    # Run health check
    echo "Running health check on $NODE..."
    NEW_POD=$(kubectl get pod -n $NAMESPACE -l app=$DAEMONSET \
        --field-selector spec.nodeName=$NODE \
        -o name)

    kubectl exec $NEW_POD -n $NAMESPACE -- /health-check.sh

    if [ $? -ne 0 ]; then
        echo "ERROR: Health check failed on $NODE"
        exit 1
    fi

    echo "Successfully updated $NODE"
    echo "Waiting $WAIT_SECONDS seconds before next node..."
    sleep $WAIT_SECONDS
done

echo "All nodes updated successfully"
```

## Implementing Canary Updates

Test updates on a subset of nodes first:

```yaml
# Create canary DaemonSet for specific nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent-canary
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-agent
      version: canary
  template:
    metadata:
      labels:
        app: monitoring-agent
        version: canary
    spec:
      nodeSelector:
        canary: "true"
      containers:
      - name: agent
        image: monitoring-agent:v2.0-canary
        ports:
        - containerPort: 9090
        resources:
          limits:
            memory: 256Mi
            cpu: 200m
          requests:
            memory: 128Mi
            cpu: 100m
---
# Original DaemonSet continues on non-canary nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: monitoring-agent
      version: stable
  template:
    metadata:
      labels:
        app: monitoring-agent
        version: stable
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: canary
                operator: DoesNotExist
      containers:
      - name: agent
        image: monitoring-agent:v1.9-stable
        ports:
        - containerPort: 9090
```

Label canary nodes:

```bash
# Mark nodes for canary testing
kubectl label node node-1 canary=true
kubectl label node node-2 canary=true

# Monitor canary performance
kubectl top pods -l version=canary -n monitoring

# If successful, update main DaemonSet and remove canary
kubectl delete daemonset monitoring-agent-canary -n monitoring
kubectl label node node-1 canary-
kubectl label node node-2 canary-
```

## Handling Update Failures

Implement rollback procedures for failed updates:

```bash
#!/bin/bash
# rollback-daemonset.sh

NAMESPACE=$1
DAEMONSET=$2

# Get current revision
CURRENT_REVISION=$(kubectl get daemonset $DAEMONSET -n $NAMESPACE \
    -o jsonpath='{.metadata.annotations.deprecated\.daemonset\.template\.generation}')

echo "Current revision: $CURRENT_REVISION"

# View rollout history
kubectl rollout history daemonset/$DAEMONSET -n $NAMESPACE

# Rollback to previous revision
echo "Rolling back to previous revision..."
kubectl rollout undo daemonset/$DAEMONSET -n $NAMESPACE

# Wait for rollback to complete
kubectl rollout status daemonset/$DAEMONSET -n $NAMESPACE

echo "Rollback completed"
```

Monitor rollout status:

```bash
# Check rollout status
kubectl rollout status daemonset/log-collector -n logging

# View rollout history
kubectl rollout history daemonset/log-collector -n logging

# Pause rollout
kubectl rollout pause daemonset/log-collector -n logging

# Resume rollout
kubectl rollout resume daemonset/log-collector -n logging
```

## Setting Update Readiness Gates

Use readiness probes to control update progression:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-agent
  namespace: kube-system
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  selector:
    matchLabels:
      app: network-agent
  template:
    metadata:
      labels:
        app: network-agent
    spec:
      containers:
      - name: agent
        image: network-agent:v2.0
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3
          successThreshold: 2
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 5
        resources:
          limits:
            memory: 200Mi
            cpu: 200m
          requests:
            memory: 100Mi
            cpu: 100m
```

The update only progresses to the next node after the readiness probe succeeds.

## Implementing Pre-Update Validation

Create admission webhook for update validation:

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func validateDaemonSetUpdate(ar admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    // Parse old and new DaemonSet
    oldDS := &appsv1.DaemonSet{}
    newDS := &appsv1.DaemonSet{}

    if err := json.Unmarshal(ar.Request.OldObject.Raw, oldDS); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    if err := json.Unmarshal(ar.Request.Object.Raw, newDS); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    // Validate image tag is not 'latest'
    for _, container := range newDS.Spec.Template.Spec.Containers {
        if container.Image == "" || container.Image[len(container.Image)-7:] == ":latest" {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: "DaemonSet must use specific image tags, not :latest",
                },
            }
        }
    }

    // Validate resource limits are set
    for _, container := range newDS.Spec.Template.Spec.Containers {
        if container.Resources.Limits == nil {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: fmt.Sprintf("Container %s must have resource limits", container.Name),
                },
            }
        }
    }

    // Validate maxUnavailable is safe
    if newDS.Spec.UpdateStrategy.Type == appsv1.RollingUpdateDaemonSetStrategyType {
        maxUnavailable := newDS.Spec.UpdateStrategy.RollingUpdate.MaxUnavailable
        if maxUnavailable != nil && maxUnavailable.IntValue() > 5 {
            return &admissionv1.AdmissionResponse{
                Allowed: false,
                Result: &metav1.Status{
                    Message: "maxUnavailable cannot exceed 5 for safety",
                },
            }
        }
    }

    return &admissionv1.AdmissionResponse{
        Allowed: true,
    }
}
```

## Monitoring Update Progress

Track update metrics with Prometheus:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: daemonset-update-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: daemonset-updates
      rules:
      - alert: DaemonSetUpdateStalled
        expr: |
          (kube_daemonset_status_updated_number_scheduled /
           kube_daemonset_status_desired_number_scheduled) < 1
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "DaemonSet {{ $labels.daemonset }} update stalled"

      - alert: DaemonSetUpdateFailing
        expr: |
          kube_daemonset_status_number_unavailable > 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "DaemonSet {{ $labels.daemonset }} has unavailable pods"
```

Create update dashboard:

```bash
# Watch update progress
watch 'kubectl get daemonset -A | grep -v "DESIRED.*READY.*UP-TO-DATE"'

# Detailed status
kubectl describe daemonset log-collector -n logging | grep -A 10 Events
```

## Best Practices

Test updates in non-production environments first. DaemonSet updates affect every node, amplifying the impact of bugs.

Set conservative maxUnavailable values initially. Start with 1 and increase after validating update behavior.

Implement comprehensive health checks. Readiness probes should verify actual functionality, not just process existence.

Monitor resource usage during updates. New versions may have different resource requirements affecting node capacity.

Document rollback procedures. When updates fail at 2 AM, clear documentation saves critical time.

Use OnDelete for critical infrastructure components. Manual control prevents cascading failures in foundational services.

## Conclusion

Choosing the right DaemonSet update strategy balances automation with safety. RollingUpdate works well for most scenarios, providing automated updates with configurable pacing. OnDelete gives complete control for critical components where manual verification is essential. By understanding both strategies and implementing proper monitoring, you can safely update node-level services without disrupting cluster operations.

Implement appropriate update strategies to maintain service reliability while keeping DaemonSet workloads current.
