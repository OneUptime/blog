# How to Implement Prometheus Custom Resource State Metrics for CRD Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Custom Resources

Description: Monitor Kubernetes Custom Resource Definitions with kube-state-metrics custom resource state metrics, enabling observability for operators and custom controllers.

---

Kubernetes Custom Resource Definitions extend the Kubernetes API with domain-specific resources. While kube-state-metrics provides excellent coverage for built-in Kubernetes resources, it doesn't automatically expose metrics for your custom resources. That's where custom resource state metrics come in.

This guide shows you how to configure kube-state-metrics to expose metrics from your CRDs, enabling comprehensive observability for operators and custom controllers.

## Understanding Custom Resource State Metrics

Custom resource state metrics allow kube-state-metrics to generate Prometheus metrics from any CRD by specifying which fields to expose and how to transform them into metrics. You define the metric structure using a configuration file that maps CRD fields to metric labels and values.

This approach gives you the same level of observability for custom resources that you have for native Kubernetes resources like pods and deployments.

## Installing kube-state-metrics with Custom Resource Support

Deploy kube-state-metrics with custom resource state enabled:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-state-metrics
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kube-state-metrics
  template:
    metadata:
      labels:
        app: kube-state-metrics
    spec:
      serviceAccountName: kube-state-metrics
      containers:
      - name: kube-state-metrics
        image: registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.10.1
        args:
          - --custom-resource-state-config-file=/config/custom-resource-state.yaml
          - --custom-resource-state-only=false
        ports:
        - containerPort: 8080
          name: http-metrics
        volumeMounts:
        - name: config
          mountPath: /config
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: kube-state-metrics-config
```

The `--custom-resource-state-config-file` flag points to your configuration that defines which CRDs to monitor.

## Basic Custom Resource State Configuration

Create a configuration that exposes metrics from a simple CRD:

```yaml
# custom-resource-state.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-state-metrics-config
  namespace: monitoring
data:
  custom-resource-state.yaml: |
    spec:
      resources:
        - groupVersionKind:
            group: apps.example.com
            version: v1
            kind: Application
          metrics:
            - name: application_info
              help: "Information about Application custom resource"
              each:
                type: Info
                info:
                  labelsFromPath:
                    namespace: [metadata, namespace]
                    name: [metadata, name]
                    version: [spec, version]
                    replicas: [spec, replicas]

            - name: application_replicas
              help: "Desired replica count for Application"
              each:
                type: Gauge
                gauge:
                  path: [spec, replicas]
                  labelsFromPath:
                    namespace: [metadata, namespace]
                    name: [metadata, name]
```

This configuration creates two metrics for an Application CRD:
- `kube_application_info`: An info metric with labels
- `kube_application_replicas`: A gauge metric with the replica count

## Example CRD to Monitor

Here's the Application CRD we're monitoring:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.apps.example.com
spec:
  group: apps.example.com
  names:
    kind: Application
    plural: applications
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                version:
                  type: string
                replicas:
                  type: integer
                enabled:
                  type: boolean
            status:
              type: object
              properties:
                phase:
                  type: string
                readyReplicas:
                  type: integer
---
apiVersion: apps.example.com/v1
kind: Application
metadata:
  name: frontend
  namespace: production
spec:
  version: "2.1.0"
  replicas: 3
  enabled: true
status:
  phase: Running
  readyReplicas: 3
```

## Advanced Metric Types

Expose different metric types from your CRDs:

```yaml
spec:
  resources:
    - groupVersionKind:
        group: apps.example.com
        version: v1
        kind: Application
      metrics:
        # Gauge metric from spec field
        - name: application_spec_replicas
          help: "Desired replica count"
          each:
            type: Gauge
            gauge:
              path: [spec, replicas]

        # Gauge metric from status field
        - name: application_status_ready_replicas
          help: "Number of ready replicas"
          each:
            type: Gauge
            gauge:
              path: [status, readyReplicas]

        # StateSet metric for phase
        - name: application_status_phase
          help: "Current phase of application"
          each:
            type: StateSet
            stateSet:
              path: [status, phase]
              list:
                - Pending
                - Running
                - Failed
                - Succeeded
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]

        # Info metric with multiple labels
        - name: application_info
          help: "Information about application"
          each:
            type: Info
            info:
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]
                version: [spec, version]
                uid: [metadata, uid]
```

## Monitoring CRD Status Conditions

Many operators use status conditions to report health. Expose these as metrics:

```yaml
spec:
  resources:
    - groupVersionKind:
        group: apps.example.com
        version: v1
        kind: Application
      metrics:
        - name: application_status_condition
          help: "Application status conditions"
          each:
            type: Gauge
            gauge:
              path: [status, conditions]
              valueFrom: [status]
              labelsFromPath:
                type: [type]
                namespace: [metadata, namespace]
                name: [metadata, name]
          commonLabels:
            custom_resource: application
```

For a CRD with conditions like this:

```yaml
status:
  conditions:
    - type: Ready
      status: "True"
      lastTransitionTime: "2026-02-09T10:00:00Z"
    - type: Degraded
      status: "False"
      lastTransitionTime: "2026-02-09T09:00:00Z"
```

This generates metrics showing each condition's status.

## Using Label Selectors and Field Selectors

Filter which custom resources get monitored:

```yaml
spec:
  resources:
    - groupVersionKind:
        group: apps.example.com
        version: v1
        kind: Application
      # Only monitor resources with this label
      labelsFromPath:
        - [metadata, labels, monitor]
      # Only monitor in these namespaces
      namespaces:
        - production
        - staging
      metrics:
        - name: application_replicas
          help: "Replica count for monitored applications"
          each:
            type: Gauge
            gauge:
              path: [spec, replicas]
```

## Creating Metrics from Nested Fields

Access deeply nested fields in your CRDs:

```yaml
spec:
  resources:
    - groupVersionKind:
        group: apps.example.com
        version: v1
        kind: Application
      metrics:
        - name: application_resource_requests_cpu
          help: "CPU resource requests"
          each:
            type: Gauge
            gauge:
              # Navigate nested structure
              path: [spec, resources, requests, cpu]
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]

        - name: application_resource_limits_memory
          help: "Memory resource limits"
          each:
            type: Gauge
            gauge:
              path: [spec, resources, limits, memory]
              # Convert memory strings to bytes
              valueFrom: [spec, resources, limits, memory]
```

## Monitoring Multiple CRDs

Configure metrics for multiple custom resources:

```yaml
spec:
  resources:
    # Monitor Application CRD
    - groupVersionKind:
        group: apps.example.com
        version: v1
        kind: Application
      metrics:
        - name: application_info
          # ... metrics config

    # Monitor Database CRD
    - groupVersionKind:
        group: databases.example.com
        version: v1
        kind: Database
      metrics:
        - name: database_info
          help: "Database information"
          each:
            type: Info
            info:
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]
                engine: [spec, engine]
                version: [spec, version]

        - name: database_size_bytes
          help: "Database size in bytes"
          each:
            type: Gauge
            gauge:
              path: [status, sizeBytes]

    # Monitor Queue CRD
    - groupVersionKind:
        group: queues.example.com
        version: v1
        kind: Queue
      metrics:
        - name: queue_depth
          help: "Number of messages in queue"
          each:
            type: Gauge
            gauge:
              path: [status, depth]

        - name: queue_consumer_count
          help: "Number of active consumers"
          each:
            type: Gauge
            gauge:
              path: [status, consumers]
```

## Adding Common Labels to All Metrics

Apply labels to all metrics from a CRD:

```yaml
spec:
  resources:
    - groupVersionKind:
        group: apps.example.com
        version: v1
        kind: Application
      # These labels added to all metrics from this CRD
      commonLabels:
        custom_resource_group: apps.example.com
        custom_resource_kind: Application
      metrics:
        - name: application_replicas
          each:
            type: Gauge
            gauge:
              path: [spec, replicas]
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]
```

Resulting metrics will include the common labels automatically.

## RBAC Configuration for Custom Resources

Grant kube-state-metrics permission to read your CRDs:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-state-metrics
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-state-metrics-custom
rules:
  # Permission to read custom resources
  - apiGroups:
      - apps.example.com
    resources:
      - applications
    verbs:
      - list
      - watch

  - apiGroups:
      - databases.example.com
    resources:
      - databases
    verbs:
      - list
      - watch

  # Add more custom resource permissions as needed
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-state-metrics-custom
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-state-metrics-custom
subjects:
  - kind: ServiceAccount
    name: kube-state-metrics
    namespace: monitoring
```

## Querying Custom Resource Metrics

Use the generated metrics in Prometheus queries:

```promql
# Get application replica counts
kube_application_replicas{namespace="production"}

# Compare desired vs ready replicas
kube_application_spec_replicas - kube_application_status_ready_replicas

# Count applications by version
count by (version) (kube_application_info)

# Alert on missing replicas
ALERT ApplicationReplicasMissing
  IF kube_application_spec_replicas - kube_application_status_ready_replicas > 0
  FOR 5m
  LABELS { severity = "warning" }
  ANNOTATIONS {
    summary = "Application {{ $labels.name }} is missing replicas",
    description = "{{ $labels.name }} wants {{ $value }} more replicas"
  }

# Monitor CRD status conditions
kube_application_status_condition{type="Ready",status="True"} == 0
```

## Debugging Custom Resource State Configuration

Test your configuration:

```bash
# Check kube-state-metrics logs
kubectl logs -n monitoring deployment/kube-state-metrics

# Verify metrics are exposed
kubectl port-forward -n monitoring deployment/kube-state-metrics 8080:8080
curl http://localhost:8080/metrics | grep application

# Test with a sample CR
kubectl apply -f - <<EOF
apiVersion: apps.example.com/v1
kind: Application
metadata:
  name: test-app
  namespace: default
spec:
  version: "1.0.0"
  replicas: 2
EOF

# Check if metrics appear
curl http://localhost:8080/metrics | grep "test-app"
```

## Performance Considerations

Monitor large numbers of CRDs efficiently:

```yaml
# Limit to specific namespaces
spec:
  resources:
    - groupVersionKind:
        group: apps.example.com
        version: v1
        kind: Application
      namespaces:
        - production
        - staging

# Use label selectors to filter
      labelSelector:
        matchLabels:
          monitor: "true"

# Disable metrics you don't need
# Only include essential fields in labelsFromPath
```

## Real-World Example: Monitoring Argo CD Applications

Monitor Argo CD Application CRDs:

```yaml
spec:
  resources:
    - groupVersionKind:
        group: argoproj.io
        version: v1alpha1
        kind: Application
      metrics:
        - name: argocd_application_info
          help: "Information about Argo CD application"
          each:
            type: Info
            info:
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]
                project: [spec, project]
                destination_namespace: [spec, destination, namespace]
                destination_server: [spec, destination, server]

        - name: argocd_application_sync_status
          help: "Sync status of Argo CD application"
          each:
            type: StateSet
            stateSet:
              path: [status, sync, status]
              list:
                - Synced
                - OutOfSync
                - Unknown
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]

        - name: argocd_application_health_status
          help: "Health status of Argo CD application"
          each:
            type: StateSet
            stateSet:
              path: [status, health, status]
              list:
                - Healthy
                - Progressing
                - Degraded
                - Suspended
                - Missing
                - Unknown
              labelsFromPath:
                namespace: [metadata, namespace]
                name: [metadata, name]
```

## Conclusion

Custom resource state metrics bridge the observability gap for Kubernetes operators and custom controllers. By configuring kube-state-metrics to expose metrics from your CRDs, you gain the same level of visibility into custom resources that you have for native Kubernetes objects.

Start with basic info and gauge metrics, then expand to cover status conditions and complex nested fields as your monitoring needs grow. Remember to grant appropriate RBAC permissions and test your configuration thoroughly before deploying to production.
