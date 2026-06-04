# How to Configure Hierarchical Namespaces Using HNC for Delegated Administration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Namespace, HNC

Description: Learn how to implement hierarchical namespaces using the Hierarchical Namespace Controller (HNC) for delegated administration, policy inheritance, and organizational structure in Kubernetes clusters.

---

Hierarchical Namespace Controller (HNC) extends Kubernetes namespaces with parent-child relationships, enabling policy inheritance and delegated administration. This allows organizations to mirror their team structure in Kubernetes, with parent namespaces propagating policies, roles, and resources to child namespaces automatically.

This guide covers deploying and using HNC for hierarchical namespace management.

## Understanding Hierarchical Namespaces

HNC introduces several key concepts:

- Parent-child namespace relationships
- Automatic policy propagation from parent to children
- Subnamespace anchors for creating child namespaces
- Hierarchical resource quota enforcement
- Delegated namespace creation within a parent

This enables self-service namespace provisioning while maintaining centralized policy control.

## Installing HNC

Deploy HNC using kubectl:

```bash
# Install HNC

kubectl apply -f https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/download/v1.1.0/default.yaml

# Verify installation
kubectl get pods -n hnc-system

# Optional: enable beta hierarchical resource quotas
kubectl apply -f https://github.com/kubernetes-sigs/hierarchical-namespaces/releases/download/v1.1.0/hrq.yaml

# Install kubectl plugin
kubectl krew install hns
```

## Creating Hierarchical Namespace Structures

Create a root namespace for an organization:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: org-engineering
  labels:
    organization: engineering
---
apiVersion: hnc.x-k8s.io/v1alpha2
kind: HierarchyConfiguration
metadata:
  name: hierarchy
  namespace: org-engineering
spec:
  parent: ""  # Root namespace has no parent
```

Create child namespaces using subnamespace anchors:

```yaml
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: team-backend
  namespace: org-engineering
---
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: team-frontend
  namespace: org-engineering
---
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: team-data
  namespace: org-engineering
```

Create deeper hierarchies:

```yaml
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: backend-prod
  namespace: team-backend
---
apiVersion: hnc.x-k8s.io/v1alpha2
kind: SubnamespaceAnchor
metadata:
  name: backend-staging
  namespace: team-backend
```

## Configuring Policy Propagation

By default, HNC propagates RBAC Roles and RoleBindings. Configure any additional resource types before creating policies in parent namespaces that propagate to children:

```yaml
apiVersion: hnc.x-k8s.io/v1alpha2
kind: HNCConfiguration
metadata:
  name: config
spec:
  resources:
  - resource: limitranges
    mode: Propagate
  - group: networking.k8s.io
    resource: networkpolicies
    mode: Propagate
```

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: org-engineering
spec:
  limits:
  - type: Container
    default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "250m"
      memory: "256Mi"
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: org-engineering
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

These policies automatically propagate to all child namespaces.

## Implementing Delegated RBAC

Grant subnamespace creation rights:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: subnamespace-admin
  namespace: org-engineering
rules:
- apiGroups: ["hnc.x-k8s.io"]
  resources: ["subnamespaceanchors"]
  verbs: ["*"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: engineering-leads
  namespace: org-engineering
subjects:
- kind: Group
  name: engineering-leads
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: subnamespace-admin
  apiGroup: rbac.authorization.k8s.io
```

## Configuring Hierarchical Resource Quotas

Set hierarchical resource quotas at different levels:

```yaml
apiVersion: hnc.x-k8s.io/v1alpha2
kind: HierarchicalResourceQuota
metadata:
  name: org-quota
  namespace: org-engineering
spec:
  hard:
    requests.cpu: "200"
    requests.memory: 400Gi
    pods: "1000"
---
apiVersion: hnc.x-k8s.io/v1alpha2
kind: HierarchicalResourceQuota
metadata:
  name: team-quota
  namespace: team-backend
spec:
  hard:
    requests.cpu: "80"
    requests.memory: 160Gi
    pods: "400"
```

## Managing Exception Policies

Prevent specific resources from propagating:

```yaml
apiVersion: hnc.x-k8s.io/v1alpha2
kind: HNCConfiguration
metadata:
  name: config
spec:
  resources:
  - resource: secrets
    mode: Propagate
  - resource: configmaps
    mode: Propagate
  - resource: resourcequotas
    mode: Ignore  # Don't propagate quotas
```

## Viewing Hierarchy Structure

Use kubectl plugin to view hierarchies:

```bash
# View namespace tree
kubectl hns tree org-engineering

# View namespace config
kubectl hns describe org-engineering

# View the team-backend subtree
kubectl hns tree team-backend
```

## Implementing Self-Service Workflows

Allow teams to create their own namespaces:

```python
from kubernetes import client, config

def create_subnamespace(parent_namespace, subnamespace_name, requester):
    config.load_kube_config()
    custom_api = client.CustomObjectsApi()

    anchor = {
        "apiVersion": "hnc.x-k8s.io/v1alpha2",
        "kind": "SubnamespaceAnchor",
        "metadata": {
            "name": subnamespace_name,
            "annotations": {
                "requester": requester,
                "created-at": "2026-02-09"
            }
        }
    }

    custom_api.create_namespaced_custom_object(
        group="hnc.x-k8s.io",
        version="v1alpha2",
        namespace=parent_namespace,
        plural="subnamespaceanchors",
        body=anchor
    )

    print(f"Subnamespace {subnamespace_name} created under {parent_namespace}")

# Usage
create_subnamespace("team-backend", "backend-dev", "john@example.com")
```

## Monitoring Hierarchical Namespaces

Create alerts for hierarchy issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hnc-alerts
  namespace: monitoring
spec:
  groups:
  - name: hnc.rules
    interval: 30s
    rules:
    - alert: HNCPropagationFailed
      expr: hnc_namespace_conditions{Condition="ActivitiesHalted"} > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "HNC propagation failed"
        description: "One or more namespaces have HNC propagation issues"
```

## Best Practices

Follow these guidelines for HNC:

1. Design hierarchy to match organizational structure
2. Set policies at the highest appropriate level
3. Use subnamespace anchors for delegation
4. Monitor propagation status regularly
5. Test quota distribution across hierarchies
6. Document hierarchy decisions
7. Implement approval workflows for root namespaces
8. Regular audit of namespace relationships
9. Use labels to identify hierarchy levels
10. Plan for hierarchy refactoring

## Conclusion

Hierarchical Namespace Controller enables organizations to implement delegated administration while maintaining centralized policy control. By creating parent-child namespace relationships with automatic policy propagation, teams can self-service their namespace needs within guardrails set by platform teams.

Key capabilities include automatic policy inheritance, delegated namespace creation, hierarchical resource quotas, RBAC propagation, and organizational structure mapping. With HNC, you can build scalable multi-tenant platforms that empower teams while maintaining governance and security.
