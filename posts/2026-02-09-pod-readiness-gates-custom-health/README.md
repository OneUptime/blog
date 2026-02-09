# How to Use Pod Readiness Gates for Custom Health Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Advanced

Description: Learn how to implement Kubernetes Pod Readiness Gates for custom health conditions beyond standard readiness probes. Control pod readiness with external systems and custom validation logic.

---

Standard readiness probes check if a container is ready to serve traffic. But sometimes you need additional conditions before marking a pod ready. A pod might be healthy but shouldn't receive traffic until external validation completes, dependencies are confirmed, or custom business logic passes.

Pod Readiness Gates provide this capability. They let external controllers or operators set custom conditions that must be satisfied before a pod becomes ready. This gives you fine-grained control over traffic routing and service availability.

## Understanding Readiness Gates

Readiness Gates add custom conditions to the standard readiness check. A pod is ready only when both its readiness probes pass AND all readiness gate conditions are true.

The pod spec declares which readiness gates to check. External controllers watch pods and set the condition status. The kubelet combines probe results with gate conditions to determine final readiness.

This separation lets you implement complex readiness logic without modifying your application or readiness probes.

## Basic Readiness Gate Configuration

Define a readiness gate in your pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: readiness-gate-pod
spec:
  readinessGates:
  - conditionType: "example.com/feature-enabled"
  containers:
  - name: app
    image: nginx
    readinessProbe:
      httpGet:
        path: /health
        port: 80
```

The pod declares a readiness gate condition. The pod is not ready until:
1. The readiness probe succeeds
2. The "example.com/feature-enabled" condition is true

Check pod status:

```bash
kubectl get pod readiness-gate-pod -o yaml
```

You will see the condition in status:

```yaml
status:
  conditions:
  - type: example.com/feature-enabled
    status: "False"
    lastTransitionTime: "2026-02-09T10:15:30Z"
  - type: ContainersReady
    status: "True"
  - type: Ready
    status: "False"  # Not ready because gate condition is False
```

## Setting Readiness Gate Conditions

An external controller sets the condition. Here is a simple example using kubectl:

```bash
kubectl patch pod readiness-gate-pod --type=json -p='[
  {
    "op": "add",
    "path": "/status/conditions/-",
    "value": {
      "type": "example.com/feature-enabled",
      "status": "True",
      "lastTransitionTime": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
    }
  }
]' --subresource=status
```

After setting the condition to True, the pod becomes ready (assuming readiness probes also pass).

In practice, you would write a controller that watches pods and sets conditions automatically.

## Building a Readiness Gate Controller

Here is a simple controller in Python that sets readiness conditions:

```python
from kubernetes import client, config, watch
import time

# Load kubeconfig
config.load_kube_config()

v1 = client.CoreV1Api()

def set_readiness_condition(pod_name, namespace, condition_type, status):
    """Set a readiness gate condition on a pod"""
    pod = v1.read_namespaced_pod(pod_name, namespace)

    # Check if condition already exists
    conditions = pod.status.conditions or []
    condition_exists = False

    for i, cond in enumerate(conditions):
        if cond.type == condition_type:
            conditions[i].status = status
            conditions[i].last_transition_time = time.time()
            condition_exists = True
            break

    if not condition_exists:
        new_condition = client.V1PodCondition(
            type=condition_type,
            status=status,
            last_transition_time=time.time()
        )
        conditions.append(new_condition)

    # Update pod status
    pod.status.conditions = conditions

    try:
        v1.patch_namespaced_pod_status(pod_name, namespace, pod)
        print(f"Set {condition_type}={status} for pod {pod_name}")
    except Exception as e:
        print(f"Error updating pod: {e}")

def watch_pods():
    """Watch pods and set readiness conditions"""
    w = watch.Watch()

    for event in w.stream(v1.list_pod_for_all_namespaces):
        pod = event['object']
        event_type = event['type']

        # Check if pod has our readiness gate
        if not pod.spec.readiness_gates:
            continue

        for gate in pod.spec.readiness_gates:
            if gate.condition_type == "example.com/feature-enabled":
                # Custom logic to determine if condition should be true
                # For this example, set to True after 30 seconds
                pod_age = time.time() - pod.metadata.creation_timestamp.timestamp()

                if pod_age > 30:
                    set_readiness_condition(
                        pod.metadata.name,
                        pod.metadata.namespace,
                        "example.com/feature-enabled",
                        "True"
                    )

if __name__ == "__main__":
    print("Starting readiness gate controller")
    watch_pods()
```

Deploy this controller as a Deployment in your cluster.

## Use Case: Load Balancer Registration

Wait for external load balancer registration before marking pods ready:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lb-registered-pod
  labels:
    app: web
spec:
  readinessGates:
  - conditionType: "loadbalancer.example.com/registered"
  containers:
  - name: nginx
    image: nginx
    readinessProbe:
      httpGet:
        path: /
        port: 80
```

Controller logic:

```python
def check_lb_registration(pod):
    """Check if pod is registered with external load balancer"""
    pod_ip = pod.status.pod_ip
    lb_api = LoadBalancerAPI()

    # Query external LB API
    if lb_api.is_registered(pod_ip):
        set_readiness_condition(
            pod.metadata.name,
            pod.metadata.namespace,
            "loadbalancer.example.com/registered",
            "True"
        )
    else:
        # Register with LB
        lb_api.register(pod_ip)

        # Set condition to False until registration completes
        set_readiness_condition(
            pod.metadata.name,
            pod.metadata.namespace,
            "loadbalancer.example.com/registered",
            "False"
        )
```

Pods only receive Kubernetes service traffic after external LB registration succeeds.

## Use Case: Database Migration Completion

Wait for database migrations to complete before accepting traffic:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      readinessGates:
      - conditionType: "migrations.example.com/complete"
      containers:
      - name: api
        image: api:v2.0.0
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
```

Controller checks migration status:

```python
def check_migrations(pod):
    """Verify database migrations are complete"""
    db_connection = get_db_connection()

    # Check migration table
    latest_migration = db_connection.execute(
        "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1"
    ).fetchone()

    expected_version = get_expected_migration_version()

    if latest_migration and latest_migration[0] >= expected_version:
        set_readiness_condition(
            pod.metadata.name,
            pod.metadata.namespace,
            "migrations.example.com/complete",
            "True"
        )
    else:
        set_readiness_condition(
            pod.metadata.name,
            pod.metadata.namespace,
            "migrations.example.com/complete",
            "False"
        )
```

## Use Case: Feature Flag Validation

Control pod readiness based on feature flags:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: feature-gated-pod
  labels:
    version: "2.0"
spec:
  readinessGates:
  - conditionType: "features.example.com/enabled"
  containers:
  - name: app
    image: app:2.0
```

Controller checks feature flag service:

```python
def check_feature_flags(pod):
    """Check if required features are enabled"""
    version = pod.metadata.labels.get("version")
    feature_service = FeatureFlagService()

    # Check if features for this version are enabled
    features_enabled = feature_service.are_enabled_for_version(version)

    set_readiness_condition(
        pod.metadata.name,
        pod.metadata.namespace,
        "features.example.com/enabled",
        "True" if features_enabled else "False"
    )
```

This enables gradual rollout control based on feature flags.

## Multiple Readiness Gates

Pods can have multiple readiness gates that must all be satisfied:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-gate-pod
spec:
  readinessGates:
  - conditionType: "loadbalancer.example.com/registered"
  - conditionType: "cache.example.com/warmed"
  - conditionType: "auth.example.com/validated"
  containers:
  - name: app
    image: app:latest
    readinessProbe:
      httpGet:
        path: /health
        port: 8080
```

All three conditions plus the readiness probe must pass before the pod is ready.

## Integrating with Operators

Operators can use readiness gates for sophisticated lifecycle management:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stateful-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stateful
  template:
    metadata:
      labels:
        app: stateful
    spec:
      readinessGates:
      - conditionType: "stateful.example.com/synced"
      - conditionType: "stateful.example.com/leader-elected"
      containers:
      - name: app
        image: stateful-app:latest
```

Operator logic:

```python
class StatefulAppOperator:
    def reconcile_pod(self, pod):
        """Ensure pod meets stateful requirements"""

        # Check data synchronization
        if self.is_data_synced(pod):
            self.set_condition(pod, "stateful.example.com/synced", "True")
        else:
            self.set_condition(pod, "stateful.example.com/synced", "False")
            self.start_sync(pod)

        # Check leader election
        if self.is_leader(pod) or not self.requires_leader():
            self.set_condition(pod, "stateful.example.com/leader-elected", "True")
        else:
            self.set_condition(pod, "stateful.example.com/leader-elected", "False")
```

## Monitoring Readiness Gate Status

View readiness gate conditions:

```bash
kubectl get pod my-pod -o jsonpath='{.status.conditions[?(@.type=="example.com/feature-enabled")]}'
```

List all pods with specific readiness gate:

```bash
kubectl get pods -A -o json | jq -r '.items[] | select(.spec.readinessGates != null) | select(.spec.readinessGates[].conditionType == "example.com/feature-enabled") | .metadata.name'
```

Check which gates are blocking readiness:

```bash
kubectl get pod my-pod -o json | jq '.status.conditions[] | select(.status == "False") | .type'
```

Create Prometheus metrics for readiness gate status:

```python
from prometheus_client import Gauge

readiness_gate_status = Gauge(
    'pod_readiness_gate_status',
    'Status of pod readiness gates',
    ['pod', 'namespace', 'condition_type']
)

def update_metrics(pod):
    for condition in pod.status.conditions:
        if condition.type.startswith("example.com/"):
            status_value = 1 if condition.status == "True" else 0
            readiness_gate_status.labels(
                pod=pod.metadata.name,
                namespace=pod.metadata.namespace,
                condition_type=condition.type
            ).set(status_value)
```

## Troubleshooting Readiness Gates

Pod stuck in non-ready state:

```bash
# Check all conditions
kubectl describe pod my-pod

# Look for readiness gates in Conditions section
```

Identify which gate is blocking:

```bash
kubectl get pod my-pod -o jsonpath='{.status.conditions}' | jq '.[] | select(.status != "True")'
```

Check if controller is running:

```bash
kubectl get pods -n controller-namespace
kubectl logs -n controller-namespace controller-pod
```

Verify RBAC permissions for controller:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readiness-controller
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["patch", "update"]
```

## Best Practices

Use readiness gates for external dependencies that standard probes cannot check.

Implement controllers with proper error handling and retry logic.

Set reasonable timeouts. Do not leave pods in non-ready state indefinitely.

Document each readiness gate's purpose and the controller responsible for it.

Monitor readiness gate status and alert on gates that remain false for too long.

Use meaningful condition type names with domain prefixes (example.com/condition-name).

Test readiness gate logic thoroughly before deploying to production.

Ensure controllers are highly available. If the controller fails, pods cannot become ready.

Clean up condition status when pods are deleted to avoid stale state.

## Security Considerations

Limit RBAC permissions for controllers to only necessary operations:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: readiness-controller
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods/status"]
  verbs: ["patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
```

Validate condition changes to prevent unauthorized modifications.

Audit readiness gate changes:

```python
import logging

def set_readiness_condition_with_audit(pod_name, namespace, condition_type, status):
    logging.info(f"Setting {condition_type}={status} for {namespace}/{pod_name}")
    set_readiness_condition(pod_name, namespace, condition_type, status)
    # Send audit event
    send_audit_event("readiness_gate_changed", {
        "pod": pod_name,
        "namespace": namespace,
        "condition": condition_type,
        "status": status
    })
```

## Conclusion

Pod Readiness Gates extend standard readiness probes with custom conditions controlled by external logic. Use them to integrate external systems, validate complex requirements, and implement sophisticated readiness policies.

Build controllers that watch pods and set conditions based on custom business logic. Combine multiple readiness gates for comprehensive health checks. Monitor gate status and troubleshoot blocked pods effectively.

Master readiness gates to build Kubernetes applications with fine-grained control over pod readiness and traffic routing based on external dependencies and custom validation logic.
