# How to Create the Calico StagedNetworkPolicy Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, StagedNetworkPolicy, Kubernetes, Network Policy, Security, Staging

Description: Guide to creating Calico StagedNetworkPolicy resources for previewing namespace-scoped Calico network policy changes before enforcement.

---

## Introduction

The StagedNetworkPolicy resource in Calico Enterprise is the namespace-scoped equivalent of StagedGlobalNetworkPolicy. It allows you to stage Calico-native network policy changes within a specific namespace, preview their impact on traffic flows, and commit them only after validation. Unlike StagedKubernetesNetworkPolicy, it uses the full Calico policy syntax with features like action types, application layer policies, and service account selectors.

Creating a StagedNetworkPolicy follows the same patterns as creating a regular Calico NetworkPolicy, but with the addition of a stagedAction field that determines whether the policy is being added, modified, or removed. The staged policy does not affect live traffic until explicitly committed through the Calico Enterprise management plane.

This guide covers creating StagedNetworkPolicy resources for common use cases including microservice communication, database access control, and application layer filtering.

## Prerequisites

- Kubernetes cluster with Calico Enterprise installed
- `calicoctl` CLI installed and configured
- `kubectl` with namespace-level access
- Calico Enterprise Manager access for impact review
- Understanding of Calico NetworkPolicy syntax

## Creating a Basic StagedNetworkPolicy

Create a staged policy that controls ingress to a microservice within a namespace:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  stagedAction: Set
  order: 100
  selector: app == 'api-server'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == 'frontend'
      destination:
        ports:
          - 8080
```

Apply the staged policy:

```bash
calicoctl apply -f allow-frontend-to-api.yaml
```

## Creating a Database Access Policy

Stage a policy that restricts database access to authorized services only:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: database-access-control
  namespace: data
spec:
  stagedAction: Set
  order: 50
  selector: role == 'database'
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: has(db-access)
      destination:
        ports:
          - 5432
          - 3306
    - action: Deny
```

This policy allows ingress only from pods labeled with `db-access` and denies all other database connections. The explicit deny at the end ensures no fallthrough to other policies.

## Creating an Egress Policy with Service Accounts

Use Calico's service account selector for fine-grained egress control:

```yaml
apiVersion: projectcalico.org/v3
kind: StagedNetworkPolicy
metadata:
  name: sa-based-egress
  namespace: production
spec:
  stagedAction: Set
  order: 200
  selector: all()
  types:
    - Egress
  egress:
    - action: Allow
      source:
        serviceAccounts:
          names:
            - payment-processor
      destination:
        nets:
          - 203.0.113.0/24
        ports:
          - 443
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
```

```bash
calicoctl apply -f sa-based-egress.yaml
```

## Verification

List all staged network policies in the namespace:

```bash
calicoctl get stagednetworkpolicies -n production -o wide
```

Inspect the created policy:

```bash
calicoctl get stagednetworkpolicy allow-frontend-to-api -n production -o yaml
```

Confirm the stagedAction is `Set` and the policy rules are correct:

```bash
calicoctl get stagednetworkpolicy allow-frontend-to-api -n production -o yaml | grep stagedAction
```

Verify the selector matches intended workloads:

```bash
kubectl get pods -n production -l app=api-server
```

## Troubleshooting

If the policy fails to create, verify the Calico Enterprise CRDs are installed:

```bash
kubectl get crd | grep stagednetworkpolicies
```

If the selector syntax is invalid, remember that Calico uses its own selector syntax, not Kubernetes label selectors. The `==` operator is used for equality:

```bash
# Correct Calico selector syntax
selector: app == 'api-server' && version == 'v2'
```

If RBAC errors prevent creation, ensure your role includes the stagednetworkpolicies resource:

```bash
kubectl auth can-i create stagednetworkpolicies -n production
```

## Conclusion

Creating StagedNetworkPolicy resources provides a safe way to introduce namespace-scoped Calico network policies. The full Calico policy syntax gives you access to advanced features like service account selectors and ordered rule evaluation, while the staging mechanism ensures no traffic is affected until you commit the changes. Always review the traffic impact analysis before committing staged policies to production enforcement.
