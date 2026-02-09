# How to Configure Default Resource Quotas and Limit Ranges per Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource-Management, Best-Practices

Description: Learn how to configure default resource quotas and limit ranges for namespaces to prevent resource exhaustion, ensure fair resource allocation, and maintain cluster stability across multiple tenants.

---

Resource quotas and limit ranges are essential for maintaining cluster stability in multi-tenant environments. They prevent resource exhaustion, ensure fair allocation, and provide predictable behavior for workloads. Configuring appropriate defaults per namespace enables self-service while maintaining platform reliability.

This guide covers implementing comprehensive resource controls for Kubernetes namespaces.

## Understanding Resource Quotas vs Limit Ranges

Resource quotas control aggregate resource consumption across a namespace:
- Total CPU and memory requests/limits
- Number of objects (pods, services, PVCs)
- Storage capacity

Limit ranges define constraints for individual resources:
- Default and maximum values for containers and pods
- Minimum required resources
- Default requests applied when not specified

Together, they provide comprehensive resource governance.

## Configuring Comprehensive Resource Quotas

Create production-grade resource quotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: production
spec:
  hard:
    # CPU quotas
    requests.cpu: "100"
    limits.cpu: "200"

    # Memory quotas
    requests.memory: 200Gi
    limits.memory: 400Gi

    # Extended resources
    requests.nvidia.com/gpu: "4"

  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["high-priority", "medium-priority"]
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: production
spec:
  hard:
    # Storage quotas
    requests.storage: 2Ti
    persistentvolumeclaims: "100"

    # Storage class specific
    requests.storage.storageclass.storage.k8s.io/fast-ssd: 500Gi
    requests.storage.storageclass.storage.k8s.io/standard: 1.5Ti
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-count-quota
  namespace: production
spec:
  hard:
    # Workload objects
    pods: "500"
    replicationcontrollers: "50"
    deployments.apps: "100"
    statefulsets.apps: "30"
    daemonsets.apps: "10"
    jobs.batch: "200"
    cronjobs.batch: "50"

    # Service objects
    services: "50"
    services.loadbalancers: "10"
    services.nodeports: "20"

    # Configuration objects
    configmaps: "200"
    secrets: "200"

    # Network objects
    ingresses.networking.k8s.io: "50"
```

## Implementing Limit Ranges

Create comprehensive limit ranges:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: production
spec:
  limits:
  # Container level limits
  - type: Container
    max:
      cpu: "16"
      memory: 32Gi
      ephemeral-storage: 10Gi
    min:
      cpu: "100m"
      memory: 128Mi
      ephemeral-storage: 100Mi
    default:
      cpu: "1"
      memory: 1Gi
      ephemeral-storage: 1Gi
    defaultRequest:
      cpu: "500m"
      memory: 512Mi
      ephemeral-storage: 500Mi
    maxLimitRequestRatio:
      cpu: "4"
      memory: "4"

  # Pod level limits
  - type: Pod
    max:
      cpu: "32"
      memory: 64Gi
      ephemeral-storage: 20Gi
    min:
      cpu: "100m"
      memory: 128Mi

  # PVC limits
  - type: PersistentVolumeClaim
    max:
      storage: 500Gi
    min:
      storage: 1Gi
```

## Environment-Specific Configurations

Create different configs for different environments:

```yaml
# Development environment
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev-team-alpha
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    pods: "100"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev-team-alpha
spec:
  limits:
  - type: Container
    max:
      cpu: "4"
      memory: 8Gi
    default:
      cpu: "500m"
      memory: 512Mi
    defaultRequest:
      cpu: "250m"
      memory: 256Mi
---
# Staging environment
apiVersion: v1
kind: ResourceQuota
metadata:
  name: staging-quota
  namespace: staging-team-alpha
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 100Gi
    pods: "200"
---
# Production environment (more generous limits)
apiVersion: v1
kind: ResourceQuota
metadata:
  name: prod-quota
  namespace: prod-team-alpha
spec:
  hard:
    requests.cpu: "100"
    requests.memory: 200Gi
    pods: "500"
```

## Implementing Quota Automation

Automate quota creation for new namespaces:

```python
from kubernetes import client, config

def apply_default_quotas(namespace, environment):
    v1 = client.CoreV1Api()

    # Environment-based quota templates
    quota_templates = {
        "development": {
            "cpu": "20",
            "memory": "40Gi",
            "pods": "100",
            "storage": "100Gi"
        },
        "staging": {
            "cpu": "50",
            "memory": "100Gi",
            "pods": "200",
            "storage": "500Gi"
        },
        "production": {
            "cpu": "100",
            "memory": "200Gi",
            "pods": "500",
            "storage": "2Ti"
        }
    }

    limits_templates = {
        "development": {
            "max_cpu": "4",
            "max_memory": "8Gi",
            "default_cpu": "500m",
            "default_memory": "512Mi"
        },
        "staging": {
            "max_cpu": "8",
            "max_memory": "16Gi",
            "default_cpu": "1",
            "default_memory": "1Gi"
        },
        "production": {
            "max_cpu": "16",
            "max_memory": "32Gi",
            "default_cpu": "1",
            "default_memory": "1Gi"
        }
    }

    template = quota_templates.get(environment, quota_templates["development"])

    # Create resource quota
    quota = client.V1ResourceQuota(
        metadata=client.V1ObjectMeta(name="default-quota"),
        spec=client.V1ResourceQuotaSpec(
            hard={
                "requests.cpu": template["cpu"],
                "requests.memory": template["memory"],
                "pods": template["pods"],
                "requests.storage": template["storage"]
            }
        )
    )
    v1.create_namespaced_resource_quota(namespace, quota)

    # Create limit range
    limit_template = limits_templates.get(environment, limits_templates["development"])
    limit_range = client.V1LimitRange(
        metadata=client.V1ObjectMeta(name="default-limits"),
        spec=client.V1LimitRangeSpec(
            limits=[
                client.V1LimitRangeItem(
                    type="Container",
                    max={
                        "cpu": limit_template["max_cpu"],
                        "memory": limit_template["max_memory"]
                    },
                    default={
                        "cpu": limit_template["default_cpu"],
                        "memory": limit_template["default_memory"]
                    }
                )
            ]
        )
    )
    v1.create_namespaced_limit_range(namespace, limit_range)
```

## Monitoring Quota Usage

Create Prometheus rules for quota monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-alerts
  namespace: monitoring
spec:
  groups:
  - name: resource-quotas.rules
    interval: 30s
    rules:
    - alert: NamespaceQuotaExceeded
      expr: |
        (kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) > 0.9
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Namespace approaching quota limit"
        description: "{{ $labels.namespace }} is at {{ $value | humanizePercentage }} of {{ $labels.resource }} quota"

    - alert: NamespaceQuotaFull
      expr: |
        (kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) >= 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Namespace quota exhausted"
        description: "{{ $labels.namespace }} has exhausted {{ $labels.resource }} quota"
```

Query quota usage:

```promql
# Quota utilization percentage
(kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) * 100

# Namespaces over 80% quota
(kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) > 0.8

# Top 10 namespaces by CPU usage
topk(10, sum(kube_resourcequota{type="used", resource="requests.cpu"}) by (namespace))
```

## Handling Quota Requests

Implement quota increase requests:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: quota-increase-request
  namespace: dev-team-alpha
data:
  request.yaml: |
    namespace: dev-team-alpha
    current_cpu: "20"
    requested_cpu: "40"
    current_memory: "40Gi"
    requested_memory: "80Gi"
    justification: "Increased load testing requirements"
    duration: "2 weeks"
```

## Best Practices

Follow these guidelines for quotas and limits:

1. Set quotas for all namespaces
2. Use environment-specific templates
3. Configure both requests and limits quotas
4. Implement limit ranges to prevent unbounded requests
5. Monitor quota usage proactively
6. Document quota rationale
7. Review and adjust quotas quarterly
8. Automate quota creation for new namespaces
9. Implement self-service quota increase requests
10. Test quota enforcement before production deployment

## Conclusion

Properly configured resource quotas and limit ranges are fundamental to maintaining stable, multi-tenant Kubernetes clusters. By implementing environment-specific defaults, automated provisioning, and comprehensive monitoring, platform teams can ensure fair resource allocation while preventing cluster instability from resource exhaustion.

Key practices include setting appropriate quotas based on environment, implementing limit ranges for default values, automating quota creation, monitoring usage patterns, and providing self-service quota adjustment workflows. With these controls in place, organizations can confidently operate shared Kubernetes clusters at scale.
