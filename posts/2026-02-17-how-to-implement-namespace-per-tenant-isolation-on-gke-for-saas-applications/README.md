# How to Implement Namespace-Per-Tenant Isolation on GKE for SaaS Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Multi-Tenancy, Kubernetes, SaaS, Google Cloud

Description: Step-by-step guide to implementing namespace-per-tenant isolation on Google Kubernetes Engine for building scalable and secure multi-tenant SaaS applications.

---

If you are running a SaaS application on Google Kubernetes Engine and you need to isolate tenants without the overhead of separate clusters or projects, the namespace-per-tenant pattern is your best bet. It gives you a solid middle ground between full project isolation and shared-everything architectures.

In this post, I will show you how to set up namespace-per-tenant isolation on GKE with proper network policies, resource quotas, RBAC, and monitoring. This is the pattern I recommend for SaaS applications with tens to hundreds of tenants.

## Why Namespace-Per-Tenant?

Kubernetes namespaces were designed for exactly this kind of isolation. Each namespace provides:

- A logical boundary for resources
- A scope for RBAC policies
- A target for network policies
- A unit for resource quotas and limit ranges

Compared to cluster-per-tenant, you save significantly on infrastructure costs because you share the underlying node pool. Compared to shared namespaces, you get much better isolation and simpler access control.

## Prerequisites

You need a GKE cluster with the right features enabled. Here is how to create one that supports multi-tenancy well.

```bash
# Create a GKE cluster with features needed for multi-tenant isolation
gcloud container clusters create multi-tenant-cluster \
  --region us-central1 \
  --num-nodes 3 \
  --enable-network-policy \
  --enable-ip-alias \
  --workload-pool=PROJECT_ID.svc.id.goog \
  --enable-shielded-nodes \
  --enable-dataplane-v2 \
  --logging=SYSTEM,WORKLOAD \
  --monitoring=SYSTEM,WORKLOAD
```

The key flags here are `--enable-network-policy` (or `--enable-dataplane-v2` which includes it) for network isolation and `--workload-pool` for Workload Identity, which lets you assign GCP service accounts to Kubernetes service accounts per namespace.

## Step 1: Create Tenant Namespaces

Start with a template for tenant namespaces. I use a Helm chart for this, but here is the raw YAML for clarity.

```yaml
# tenant-namespace.yaml - Base namespace configuration for a tenant
apiVersion: v1
kind: Namespace
metadata:
  name: tenant-acme-corp
  labels:
    # Labels are critical for network policies and monitoring
    tenant-id: "acme-corp"
    environment: "production"
    managed-by: "tenant-controller"
  annotations:
    tenant-name: "Acme Corporation"
    tenant-tier: "enterprise"
```

## Step 2: Apply Resource Quotas

Without resource quotas, one tenant could consume all the cluster resources and starve every other tenant. Define quotas based on the tenant's subscription tier.

```yaml
# resource-quota.yaml - Limit resources per tenant namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
  namespace: tenant-acme-corp
spec:
  hard:
    # CPU and memory limits
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"
    # Object count limits to prevent resource sprawl
    pods: "50"
    services: "10"
    configmaps: "20"
    secrets: "20"
    persistentvolumeclaims: "10"
---
# limit-range.yaml - Default resource limits for pods in this namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: tenant-limits
  namespace: tenant-acme-corp
spec:
  limits:
    - type: Container
      # Set defaults so pods without resource specs get reasonable limits
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "2"
        memory: "4Gi"
```

## Step 3: Configure Network Policies

This is the most important part. Without network policies, pods in one tenant namespace can freely communicate with pods in another tenant namespace. You need to lock this down.

```yaml
# network-policy.yaml - Deny all traffic by default, then allow what is needed
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  # No ingress rules means all ingress is denied
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    # Only allow traffic from pods in the same namespace
    - from:
        - podSelector: {}
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-controller
  namespace: tenant-acme-corp
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    # Allow traffic from the ingress controller namespace
    - from:
        - namespaceSelector:
            matchLabels:
              app: ingress-controller
```

The pattern here is deny-all first, then selectively allow. This ensures that any new pods deployed into the namespace are isolated by default.

## Step 4: Set Up RBAC

Each tenant should only be able to see and manage resources in their own namespace. Use RoleBindings scoped to the tenant namespace.

```yaml
# rbac.yaml - Tenant-scoped role and binding
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tenant-developer
  namespace: tenant-acme-corp
rules:
  # Allow managing deployments, pods, and services
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "secrets"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tenant-developer-binding
  namespace: tenant-acme-corp
subjects:
  - kind: Group
    name: "tenant-acme-corp-developers"
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: tenant-developer
  apiGroup: rbac.authorization.k8s.io
```

## Step 5: Configure Workload Identity Per Tenant

Each tenant namespace should have its own GCP service account with only the permissions that tenant needs. Workload Identity makes this clean.

```bash
# Create a GCP service account for the tenant
gcloud iam service-accounts create tenant-acme-corp \
  --display-name="Acme Corp Tenant SA"

# Grant the Kubernetes service account permission to impersonate the GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  tenant-acme-corp@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[tenant-acme-corp/default]"
```

Then annotate the Kubernetes service account.

```yaml
# service-account.yaml - Link Kubernetes SA to GCP SA
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: tenant-acme-corp
  annotations:
    # This annotation tells GKE which GCP SA to use
    iam.gke.io/gcp-service-account: tenant-acme-corp@PROJECT_ID.iam.gserviceaccount.com
```

## Step 6: Automate Tenant Provisioning

Manually creating all these resources for each tenant does not scale. Build a tenant controller that automates the process.

```python
# tenant_controller.py - Simplified tenant provisioning logic
from kubernetes import client, config

def create_tenant_namespace(tenant_id, tenant_name, tier):
    """Create all resources needed for a new tenant."""
    config.load_incluster_config()
    v1 = client.CoreV1Api()
    apps_v1 = client.AppsV1Api()
    networking_v1 = client.NetworkingV1Api()
    rbac_v1 = client.RbacAuthorizationV1Api()

    namespace_name = f"tenant-{tenant_id}"

    # Define resource quotas based on tier
    tier_quotas = {
        "starter": {"cpu": "2", "memory": "4Gi", "pods": "20"},
        "professional": {"cpu": "8", "memory": "16Gi", "pods": "50"},
        "enterprise": {"cpu": "32", "memory": "64Gi", "pods": "200"},
    }

    quota = tier_quotas.get(tier, tier_quotas["starter"])

    # Create the namespace
    namespace = client.V1Namespace(
        metadata=client.V1ObjectMeta(
            name=namespace_name,
            labels={
                "tenant-id": tenant_id,
                "tenant-tier": tier,
                "managed-by": "tenant-controller",
            },
        )
    )
    v1.create_namespace(body=namespace)
    print(f"Created namespace: {namespace_name}")

    # Create resource quota
    resource_quota = client.V1ResourceQuota(
        metadata=client.V1ObjectMeta(name="tenant-quota"),
        spec=client.V1ResourceQuotaSpec(
            hard={
                "requests.cpu": quota["cpu"],
                "requests.memory": quota["memory"],
                "pods": quota["pods"],
            }
        ),
    )
    v1.create_namespaced_resource_quota(
        namespace=namespace_name, body=resource_quota
    )
    print(f"Applied resource quota for {namespace_name}")
```

## Step 7: Set Up Per-Tenant Monitoring

Use GKE metrics with namespace labels to build tenant-specific dashboards. You can filter Cloud Monitoring metrics by the `namespace` label.

```yaml
# prometheus-rules.yaml - Alerting rules per tenant
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tenant-alerts
  namespace: monitoring
spec:
  groups:
    - name: tenant-resource-usage
      rules:
        - alert: TenantHighCPUUsage
          expr: |
            sum(rate(container_cpu_usage_seconds_total{namespace=~"tenant-.*"}[5m])) by (namespace)
            / on(namespace) group_left()
            kube_resourcequota{resource="requests.cpu", type="hard", namespace=~"tenant-.*"}
            > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Tenant {{ $labels.namespace }} is using over 80% of CPU quota"
```

## Security Considerations

A few things to keep in mind:

- Always enable Pod Security Standards at the namespace level to prevent privilege escalation
- Consider using GKE Sandbox (gVisor) for untrusted tenant workloads
- Rotate secrets and credentials per tenant independently
- Audit network policy effectiveness regularly using tools like netpol-viewer

## Wrapping Up

The namespace-per-tenant pattern on GKE is a proven approach for SaaS multi-tenancy. It balances isolation with operational efficiency. The critical ingredients are network policies for traffic isolation, resource quotas for fair resource sharing, RBAC for access control, and Workload Identity for GCP service isolation. Automate everything through a tenant controller, and you will have a scalable foundation for your SaaS platform.
