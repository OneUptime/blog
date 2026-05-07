# How to Use Projects for Multi-Tenancy in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Project, Multi-Tenancy, Namespace, RBAC, Security

Description: A practical guide to implementing multi-tenancy in Rancher using projects for access isolation, resource control, and workload separation.

Multi-tenancy in Kubernetes means running workloads for multiple teams, applications, or customers on shared cluster infrastructure while keeping them isolated from each other. Rancher projects provide the tools to implement effective multi-tenancy without dedicated clusters for each tenant. This guide shows how to design and implement a multi-tenant architecture using Rancher projects.

## Prerequisites

- Rancher v2.7+ with administrator or cluster owner access
- A cluster with sufficient resources for multiple tenants
- An external authentication provider
- A clear definition of your tenants (teams, business units, or customers)

## Understanding Multi-Tenancy Levels

Multi-tenancy can be implemented at different levels of isolation:

- **Soft multi-tenancy**: Tenants are internal teams who trust each other. Isolation prevents accidental interference.
- **Hard multi-tenancy**: Tenants are external customers or untrusted entities. Isolation must prevent deliberate interference.

Rancher projects work well for soft multi-tenancy. For hard multi-tenancy with untrusted tenants, consider dedicated clusters per tenant.

## Step 1: Design the Tenant Structure

Map your tenants to Rancher projects:

```plaintext
Shared Cluster
├── Project: tenant-alpha
│   ├── Namespace: alpha-frontend
│   ├── Namespace: alpha-backend
│   └── Namespace: alpha-data
├── Project: tenant-beta
│   ├── Namespace: beta-app
│   └── Namespace: beta-api
├── Project: tenant-gamma
│   ├── Namespace: gamma-services
│   └── Namespace: gamma-workers
└── Project: shared-platform
    ├── Namespace: monitoring
    ├── Namespace: logging
    └── Namespace: ingress
```

Each tenant gets their own project with dedicated namespaces.

## Step 2: Create Tenant Projects

Create a project for each tenant with isolation and quotas:

```bash
#!/bin/bash
# create-tenant.sh

# Run this script with kubectl pointed at the Rancher management cluster.
TENANT_NAME=$1
CLUSTER_ID="c-m-xxxxx"
CPU_QUOTA=${2:-"8000m"}
MEM_QUOTA=${3:-"16Gi"}
POD_QUOTA=${4:-"100"}

cat <<EOF | kubectl create -f -
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  generateName: p-
  namespace: ${CLUSTER_ID}
spec:
  displayName: tenant-${TENANT_NAME}
  description: "Tenant project for ${TENANT_NAME}"
  clusterName: ${CLUSTER_ID}
  resourceQuota:
    limit:
      pods: "${POD_QUOTA}"
      requestsCpu: "${CPU_QUOTA}"
      requestsMemory: "${MEM_QUOTA}"
      limitsCpu: "$((${CPU_QUOTA%m} * 2))m"
      limitsMemory: "$((${MEM_QUOTA%Gi} * 2))Gi"
  namespaceDefaultResourceQuota:
    limit:
      pods: "$((${POD_QUOTA} / 2))"
      requestsCpu: "$((${CPU_QUOTA%m} / 2))m"
      requestsMemory: "$((${MEM_QUOTA%Gi} / 2))Gi"
EOF

echo "Tenant project created for: ${TENANT_NAME}"
```

Usage:

```bash
./create-tenant.sh alpha 16000m 32Gi 200
./create-tenant.sh beta 8000m 16Gi 100
./create-tenant.sh gamma 8000m 16Gi 100
```

## Step 3: Configure RBAC Per Tenant

Each tenant should only see their own project. Assign roles accordingly:

```hcl
# Terraform example for tenant RBAC
# Example assumes data.rancher2_principal.* lookups use type = "group".

resource "rancher2_project_role_template_binding" "alpha_owner" {
  name               = "alpha-owner"
  project_id         = rancher2_project.tenant_alpha.id
  role_template_id   = "project-owner"
  group_principal_id = data.rancher2_principal.alpha_leads.id
}

resource "rancher2_project_role_template_binding" "alpha_members" {
  name               = "alpha-members"
  project_id         = rancher2_project.tenant_alpha.id
  role_template_id   = "project-member"
  group_principal_id = data.rancher2_principal.alpha_team.id
}

resource "rancher2_project_role_template_binding" "beta_owner" {
  name               = "beta-owner"
  project_id         = rancher2_project.tenant_beta.id
  role_template_id   = "project-owner"
  group_principal_id = data.rancher2_principal.beta_leads.id
}

resource "rancher2_project_role_template_binding" "beta_members" {
  name               = "beta-members"
  project_id         = rancher2_project.tenant_beta.id
  role_template_id   = "project-member"
  group_principal_id = data.rancher2_principal.beta_team.id
}
```

## Step 4: Enable Network Isolation Between Tenants

Prevent network communication between tenant projects:

Project Network Isolation is a cluster-level Rancher setting, not a field on individual `Project` objects. Enable the **Project Network Isolation** option when creating or editing the cluster. For imported clusters, Rancher requires Kubernetes `NetworkPolicy` support to be enabled on the cluster before you turn on Project Network Isolation.

Alternatively, or for finer-grained control, create explicit NetworkPolicy resources:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: alpha-frontend
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from namespaces for the same tenant
    - from:
        - namespaceSelector:
            matchLabels:
              tenant: "alpha"
    # Allow traffic from shared services namespaces
    - from:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: In
                values:
                  - monitoring
                  - logging
                  - ingress
  egress:
    # Allow traffic to namespaces for the same tenant
    - to:
        - namespaceSelector:
            matchLabels:
              tenant: "alpha"
    # Allow traffic to shared services namespaces
    - to:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: In
                values:
                  - monitoring
                  - logging
                  - ingress
    # Allow DNS resolution
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
    # Allow external traffic
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
```

## Step 5: Set Resource Quotas Per Tenant

Ensure fair resource distribution:

```yaml
# Resource allocation plan
# Total cluster: 64 CPU, 256Gi Memory
# System overhead: 8 CPU, 32Gi (reserved)
# Available for tenants: 56 CPU, 224Gi

# Tenant Alpha (40%): 22 CPU, 90Gi
# Tenant Beta (30%): 17 CPU, 67Gi
# Tenant Gamma (20%): 11 CPU, 45Gi
# Buffer (10%): 6 CPU, 22Gi
```

Apply these quotas to each tenant project as shown in Step 2.

## Step 6: Configure Shared Services

Create a shared services project for cross-cutting infrastructure:

```yaml
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  generateName: p-
  namespace: c-m-xxxxx
spec:
  displayName: shared-platform
  description: "Shared infrastructure services accessible by all tenants"
  clusterName: c-m-xxxxx
  resourceQuota:
    limit:
      pods: "100"
      requestsCpu: "8000m"
      requestsMemory: "32Gi"
```

Deploy shared services like monitoring, logging, and ingress controllers in this project. Configure NetworkPolicies to allow tenant namespaces to access shared services.

## Step 7: Implement Tenant Onboarding Automation

Automate the process of creating new tenants:

```bash
#!/bin/bash
# onboard-tenant.sh

TENANT=$1
MGMT_CONTEXT=${MGMT_CONTEXT:-"rancher-management"}
DOWNSTREAM_CONTEXT=${DOWNSTREAM_CONTEXT:-"shared-cluster"}
CLUSTER_ID="c-m-xxxxx"
CPU=$2
MEMORY=$3

echo "=== Onboarding tenant: $TENANT ==="

# 1. Create the project on the Rancher management cluster
echo "Creating project..."
PROJECT_NAME=$(kubectl --context "${MGMT_CONTEXT}" create -f - -o jsonpath='{.metadata.name}' <<EOF
apiVersion: management.cattle.io/v3
kind: Project
metadata:
  generateName: p-
  namespace: ${CLUSTER_ID}
spec:
  displayName: tenant-${TENANT}
  clusterName: ${CLUSTER_ID}
  resourceQuota:
    limit:
      pods: "100"
      requestsCpu: "${CPU}"
      requestsMemory: "${MEMORY}"
  namespaceDefaultResourceQuota:
    limit:
      pods: "50"
      requestsCpu: "$((${CPU%m} / 2))m"
      requestsMemory: "$((${MEMORY%Gi} / 2))Gi"
EOF
)

echo "Project created: $PROJECT_NAME"

# 2. Create default namespaces
for env in production staging; do
  echo "Creating namespace: ${TENANT}-${env}"
  kubectl --context "${DOWNSTREAM_CONTEXT}" apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${TENANT}-${env}
  annotations:
    field.cattle.io/projectId: "${CLUSTER_ID}:${PROJECT_NAME}"
  labels:
    tenant: "${TENANT}"
    environment: "${env}"
EOF
done

# 3. Apply network isolation
echo "Applying network isolation..."
for ns in ${TENANT}-production ${TENANT}-staging; do
  kubectl --context "${DOWNSTREAM_CONTEXT}" apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: ${ns}
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              tenant: "${TENANT}"
    - from:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: In
                values: ["monitoring", "logging", "ingress"]
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              tenant: "${TENANT}"
    - to:
        - namespaceSelector:
            matchExpressions:
              - key: kubernetes.io/metadata.name
                operator: In
                values: ["monitoring", "logging", "ingress"]
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - {protocol: UDP, port: 53}
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except: [10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16]
EOF
done

# 4. Apply LimitRange defaults
echo "Applying default resource limits..."
for ns in ${TENANT}-production ${TENANT}-staging; do
  kubectl --context "${DOWNSTREAM_CONTEXT}" apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: ${ns}
spec:
  limits:
    - type: Container
      default: {cpu: "500m", memory: "512Mi"}
      defaultRequest: {cpu: "100m", memory: "128Mi"}
      max: {cpu: "4", memory: "8Gi"}
EOF
done

echo "=== Tenant $TENANT onboarded successfully ==="
```

## Step 8: Monitor Tenant Resource Usage

Track per-tenant resource consumption:

```bash
#!/bin/bash
# tenant-usage-report.sh

echo "=== Tenant Resource Usage Report ==="
echo "Date: $(date)"

for tenant in $(kubectl get namespaces -l tenant -o jsonpath='{.items[*].metadata.labels.tenant}' | tr ' ' '\n' | sort -u); do
  echo ""
  echo "--- Tenant: $tenant ---"

  total_cpu=0
  total_mem=0

  for ns in $(kubectl get namespaces -l tenant=$tenant -o jsonpath='{.items[*].metadata.name}'); do
    cpu=$(kubectl top pods -n $ns --no-headers 2>/dev/null | awk '{sum += $2} END {print sum+0}')
    mem=$(kubectl top pods -n $ns --no-headers 2>/dev/null | awk '{sum += $3} END {print sum+0}')
    echo "  $ns: CPU=${cpu}m, Memory=${mem}Mi"
    total_cpu=$((total_cpu + cpu))
    total_mem=$((total_mem + mem))
  done

  echo "  TOTAL: CPU=${total_cpu}m, Memory=${total_mem}Mi"
done
```

## Best Practices

- **One project per tenant**: Map each tenant to exactly one Rancher project for clear isolation boundaries.
- **Enforce network isolation**: Always enable network isolation between tenant projects.
- **Set resource quotas**: Every tenant must have quotas to prevent resource monopolization.
- **Use labels consistently**: Label namespaces with tenant identifiers for easy filtering and policy application.
- **Automate onboarding**: Script the tenant creation process to ensure consistency.
- **Monitor per tenant**: Track resource usage per tenant for billing, capacity planning, and fair use enforcement.
- **Separate shared services**: Keep monitoring, logging, and ingress in a dedicated project accessible by all tenants.
- **Audit regularly**: Review tenant access and resource usage quarterly.

## Conclusion

Rancher projects provide an effective foundation for multi-tenancy in Kubernetes. By creating isolated projects with dedicated RBAC, network policies, and resource quotas, you can safely share cluster infrastructure among multiple teams or customers. Automate tenant onboarding for consistency, monitor resource usage per tenant, and maintain shared services in a dedicated project. This approach balances resource efficiency with the isolation guarantees that multi-tenancy requires.
