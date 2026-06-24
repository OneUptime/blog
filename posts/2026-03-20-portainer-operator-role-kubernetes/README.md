# How to Use the Operator Role in Portainer for Kubernetes - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Operator, RBAC, Access Control

Description: Configure and use the Operator role in Portainer for Kubernetes environments to allow application deployment without infrastructure management access.

## Introduction

In Portainer Business Edition, the Operator role provides environment-wide operational control in Kubernetes environments. It provides a middle ground between the Standard User and Environment administrator roles - operators can manage existing application resources, but they cannot create or delete resources or modify cluster-level infrastructure settings. This guide covers the Operator role's capabilities and configuration.

## Operator vs. Standard User vs. Environment Administrator in Kubernetes

| Capability | Helpdesk | Standard User | Operator | Environment administrator |
|-----------|---------|--------------|---------|---------------------------|
| View workloads | ✓ | ✓ | ✓ | ✓ |
| Scale deployments | ✗ | ✓ | ✓ | ✓ |
| Deploy applications | ✗ | ✓ | ✗ | ✓ |
| Restart pods | ✗ | ✓ | ✓ | ✓ |
| Delete namespaces | ✗ | ✗ | ✗ | ✓ |
| Create namespaces | ✗ | ✗ | ✗ | ✓ |
| Manage storage classes | ✗ | ✗ | ✗ | ✓ |
| Manage cluster nodes | ✗ | ✗ | ✗ | ✓ |

## What Operators Can Do

In assigned Kubernetes environments, operators can:

- **View**: Existing workloads, services, ConfigMaps, and Secrets across the environment
- **Manage**: Scale replicas, update images, restart deployments, and re-deploy existing applications
- **Troubleshoot**: Access pod logs, exec into containers
- **Operate**: Start and stop existing resources without changing cluster-wide infrastructure

## What Operators Cannot Do

- Create or delete applications, namespaces, or other resources
- Modify ClusterRoles or ClusterRoleBindings
- Manage storage classes, persistent volumes, or cluster nodes
- Change environment access settings or Portainer administration settings
- Access environments not assigned to them

## Assigning the Operator Role to a Team

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Assign team 3 (developers) to Kubernetes environment 5 with Operator role

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/endpoints/5 \
  -d '{
    "TeamAccessPolicies": {
      "3": {"RoleId": 5}
    }
  }'
# RoleId 5 = Operator role
```

## Namespace Access and the Operator Role

The Operator role is cluster-wide within an assigned Kubernetes environment. If you need operator-style access limited to selected namespaces, use the **Namespace Operator** role instead. Users or teams with cluster-wide roles such as **Operator** cannot be assigned to individual namespaces.

### Step 1: Ensure Kubernetes RBAC Is Enabled

Namespace access control in Portainer requires Kubernetes RBAC to be enabled and working for the environment.

### Step 2: Assign Namespaces to Teams

```bash
# Assign namespace access from the Portainer UI.
# Navigate to: Environments → [K8s Env] → Namespaces → [Namespace] → Manage access
#
# Only users or teams that already have access to the environment can be granted
# namespace access, and they keep their existing environment role within that namespace.
```

## Typical Kubernetes Team Structure

```text
Organization Kubernetes Access Design:

Platform Team → Environment administrator role → All environments
DevOps Team   → Operator role                  → Production environment
Dev Team      → Standard User role             → Development + Staging environments
QA Team       → Read-only User role            → Testing environment
Support Team  → Helpdesk role                  → All environments (read-only)
```

## Using the Operator Role in Practice

As an Operator, when managing an existing application:

1. Navigate to the assigned Kubernetes environment
2. Go to **Applications** → find the application
3. Update the image, restart the workload, or adjust the replica count
4. Click **Update**

Scale a deployment:
1. Navigate to **Applications** → find the deployment
2. Click the deployment name
3. Update the **Replicas** count
4. Click **Update**

## Conclusion

The Operator role is ideal for teams that need operational control over existing Kubernetes workloads while the platform team maintains control over cluster infrastructure and resource creation. For namespace-scoped self-service deployments, use Portainer namespace access control with roles such as Standard User or Namespace Operator instead of the environment-wide Operator role.
