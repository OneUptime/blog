# How to Implement Multi-Tenancy with Namespace Isolation and Resource Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Tenancy, Security

Description: Learn how to implement secure multi-tenant Kubernetes environments using namespace isolation, resource quotas, network policies, and RBAC for complete tenant separation and resource control.

---

Multi-tenancy in Kubernetes allows multiple teams, applications, or customers to share a single cluster while maintaining isolation and security boundaries. Namespaces provide the foundational layer for multi-tenancy by creating logical partitions within a cluster. Combined with resource quotas, network policies, and RBAC, namespaces enable secure, isolated environments for different tenants.

This guide covers implementing production-grade multi-tenancy using namespace-based isolation.

## Understanding Multi-Tenancy Models

Kubernetes supports three multi-tenancy approaches:

- Soft multi-tenancy (trusted tenants, same organization)
- Hard multi-tenancy (untrusted tenants, external customers)
- Hybrid multi-tenancy (mix of trusted and untrusted tenants)

Namespace isolation works well for soft multi-tenancy. Hard multi-tenancy may require additional layers like virtual clusters or separate physical clusters.

## Creating Tenant Namespaces

Create namespaces with proper labeling for tenant identification:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme
  labels:
    tenant: acme
    environment: production
    cost-center: engineering
    managed-by: platform-team
  annotations:
    tenant-id: "acme-corp-001"
    contact-email: "admin@acme.com"
    created-date: "2026-02-09"
---
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-contoso
  labels:
    tenant: contoso
    environment: production
    cost-center: sales
    managed-by: platform-team
  annotations:
    tenant-id: "contoso-inc-002"
    contact-email: "admin@contoso.com"
    created-date: "2026-02-09"
```

## Implementing Resource Quotas

Create resource quotas to limit tenant resource consumption:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-acme
spec:
  hard:
    # Compute resources
    requests.cpu: "50"
    requests.memory: 100Gi
    limits.cpu: "100"
    limits.memory: 200Gi

    # Storage resources
    requests.storage: 500Gi
    persistentvolumeclaims: "50"

    # Object count limits
    pods: "200"
    services: "50"
    services.loadbalancers: "5"
    services.nodeports: "10"
    configmaps: "100"
    secrets: "100"
    replicationcontrollers: "20"
    deployments.apps: "30"
    statefulsets.apps: "10"
    jobs.batch: "50"
    cronjobs.batch: "20"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-limits
  namespace: tenant-acme
spec:
  limits:
  # Container limits
  - type: Container
    max:
      cpu: "8"
      memory: 16Gi
    min:
      cpu: "100m"
      memory: 128Mi
    default:
      cpu: "500m"
      memory: 512Mi
    defaultRequest:
      cpu: "250m"
      memory: 256Mi

  # Pod limits
  - type: Pod
    max:
      cpu: "16"
      memory: 32Gi

  # PVC limits
  - type: PersistentVolumeClaim
    max:
      storage: 100Gi
    min:
      storage: 1Gi
```

## Implementing RBAC for Tenant Isolation

Create role-based access controls for each tenant:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-admin
  namespace: tenant-acme
rules:
- apiGroups: ["", "apps", "batch", "extensions"]
  resources:
  - pods
  - pods/log
  - pods/exec
  - services
  - deployments
  - replicasets
  - statefulsets
  - daemonsets
  - jobs
  - cronjobs
  - configmaps
  - secrets
  - persistentvolumeclaims
  - serviceaccounts
  verbs: ["*"]
- apiGroups: ["networking.k8s.io"]
  resources:
  - networkpolicies
  - ingresses
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-admin-binding
  namespace: tenant-acme
subjects:
- kind: Group
  name: tenant-acme-admins
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-developer
  namespace: tenant-acme
rules:
- apiGroups: ["", "apps"]
  resources:
  - pods
  - pods/log
  - services
  - deployments
  - replicasets
  - configmaps
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources:
  - pods/exec
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-developer-binding
  namespace: tenant-acme
subjects:
- kind: Group
  name: tenant-acme-developers
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-developer
  apiGroup: rbac.authorization.k8s.io
```

## Implementing Network Policies

Create network policies to isolate tenant traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector: {}
  egress:
  - to:
    - podSelector: {}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: tenant-acme
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: kube-system
    ports:
    - protocol: UDP
      port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-traffic
  namespace: tenant-acme
spec:
  podSelector:
    matchLabels:
      expose: external
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
```

## Implementing Pod Security Standards

Apply pod security standards to each tenant namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Create a Pod Security Policy (if using older Kubernetes versions):

```yaml
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: tenant-restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  volumes:
  - configMap
  - emptyDir
  - projected
  - secret
  - downwardAPI
  - persistentVolumeClaim
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny
  readOnlyRootFilesystem: false
```

## Creating Service Accounts per Tenant

Create dedicated service accounts for tenant workloads:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tenant-app-sa
  namespace: tenant-acme
  annotations:
    tenant-id: "acme-corp-001"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-app-role
  namespace: tenant-acme
rules:
- apiGroups: [""]
  resources:
  - configmaps
  - secrets
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-app-binding
  namespace: tenant-acme
subjects:
- kind: ServiceAccount
  name: tenant-app-sa
  namespace: tenant-acme
roleRef:
  kind: Role
  name: tenant-app-role
  apiGroup: rbac.authorization.k8s.io
```

## Deploying Tenant Applications

Deploy applications with tenant-specific configurations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: tenant-acme
  labels:
    app: web-app
    tenant: acme
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
        tenant: acme
    spec:
      serviceAccountName: tenant-app-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: web
        image: nginx:1.25-alpine
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: cache
          mountPath: /var/cache/nginx
        - name: run
          mountPath: /var/run
      volumes:
      - name: cache
        emptyDir: {}
      - name: run
        emptyDir: {}
```

## Monitoring Tenant Resource Usage

Create monitoring for resource quota usage:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tenant-quota-alerts
  namespace: monitoring
spec:
  groups:
  - name: tenant-quotas.rules
    interval: 30s
    rules:
    - alert: TenantQuotaExceeded
      expr: |
        (
          kube_resourcequota{type="used"}
          /
          kube_resourcequota{type="hard"}
        ) > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Tenant approaching quota limit"
        description: "Tenant {{ $labels.namespace }} is at {{ $value | humanizePercentage }} of {{ $labels.resource }} quota"

    - alert: TenantPodCountHigh
      expr: |
        count(kube_pod_info{namespace=~"tenant-.*"}) by (namespace) > 180
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High pod count in tenant namespace"
        description: "Namespace {{ $labels.namespace }} has {{ $value }} pods"
```

Query tenant resource usage:

```promql
# CPU usage by tenant
sum(rate(container_cpu_usage_seconds_total{namespace=~"tenant-.*"}[5m])) by (namespace)

# Memory usage by tenant
sum(container_memory_working_set_bytes{namespace=~"tenant-.*"}) by (namespace)

# Quota utilization by tenant
(kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) * 100
```

## Implementing Tenant Onboarding Automation

Create a controller or script for automated tenant provisioning:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import yaml

def create_tenant_namespace(tenant_name, contact_email, resource_limits):
    config.load_kube_config()
    v1 = client.CoreV1Api()

    # Create namespace
    namespace = client.V1Namespace(
        metadata=client.V1ObjectMeta(
            name=f"tenant-{tenant_name}",
            labels={
                "tenant": tenant_name,
                "environment": "production",
                "managed-by": "platform-team"
            },
            annotations={
                "contact-email": contact_email,
                "created-date": "2026-02-09"
            }
        )
    )
    v1.create_namespace(namespace)

    # Create resource quota
    quota = client.V1ResourceQuota(
        metadata=client.V1ObjectMeta(name="tenant-quota"),
        spec=client.V1ResourceQuotaSpec(
            hard={
                "requests.cpu": resource_limits["cpu"],
                "requests.memory": resource_limits["memory"],
                "pods": resource_limits["pods"]
            }
        )
    )
    v1.create_namespaced_resource_quota(
        namespace=f"tenant-{tenant_name}",
        body=quota
    )

    # Create network policies
    networking_v1 = client.NetworkingV1Api()
    deny_all_policy = client.V1NetworkPolicy(
        metadata=client.V1ObjectMeta(name="deny-all-ingress"),
        spec=client.V1NetworkPolicySpec(
            pod_selector=client.V1LabelSelector(match_labels={}),
            policy_types=["Ingress"]
        )
    )
    networking_v1.create_namespaced_network_policy(
        namespace=f"tenant-{tenant_name}",
        body=deny_all_policy
    )

    print(f"Tenant {tenant_name} provisioned successfully")

if __name__ == "__main__":
    create_tenant_namespace(
        tenant_name="acme",
        contact_email="admin@acme.com",
        resource_limits={
            "cpu": "50",
            "memory": "100Gi",
            "pods": "200"
        }
    )
```

## Best Practices for Multi-Tenant Namespaces

Follow these practices for secure multi-tenancy:

1. Always apply resource quotas to prevent resource exhaustion
2. Use network policies to isolate tenant traffic
3. Implement RBAC with least privilege access
4. Apply pod security standards to all tenant namespaces
5. Use separate service accounts for each tenant
6. Monitor quota utilization and set alerts
7. Implement automated tenant provisioning
8. Regular audit namespace configurations
9. Use admission controllers for policy enforcement
10. Document tenant isolation guarantees

## Conclusion

Implementing multi-tenancy with namespace isolation provides a foundation for securely sharing Kubernetes clusters across multiple teams or customers. By combining namespaces with resource quotas, network policies, RBAC, and pod security standards, you can create strong isolation boundaries that prevent tenants from interfering with each other while maintaining operational efficiency.

Key components include properly labeled namespaces, comprehensive resource quotas, network policies for traffic isolation, RBAC for access control, pod security standards for workload restrictions, monitoring for quota utilization, and automated provisioning workflows. With these elements in place, you can build secure multi-tenant platforms that scale across hundreds of tenants.
