# How to Configure Kubernetes Cluster Security Settings in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Security, RBAC, Container Security

Description: Learn how to configure security settings for a Kubernetes cluster managed through Portainer to restrict user capabilities.

## Overview

Portainer exposes cluster-level security settings that restrict what non-admin users can do within a Kubernetes environment. These settings act as guardrails on top of standard Kubernetes RBAC.

## Accessing Cluster Security Settings

1. In Portainer, select your Kubernetes environment.
2. Go to **Cluster > Setup** for environment guardrails such as load balancers, ingresses, and default namespace access.
3. Go to **Cluster > Security constraints** for workload-level pod restrictions.

## Available Security Settings

### Allow Users to Use External Load Balancer

This controls whether users can expose applications over an external load balancer from their cloud provider, which could incur unexpected cloud costs.

### Only Allow Admins to Deploy Ingresses

Restricts ingress creation to Portainer administrators, reducing the risk of users exposing applications through ingress resources.

### Restrict Access to the Default Namespace

Limits deployments in the `default` namespace to Portainer administrators, helping enforce namespace isolation.

### Restrict Secret Contents Access for Non-Admins (UI Only)

Prevents non-admin users from viewing and editing Kubernetes secrets in the Portainer UI. This does not block access through the Kubernetes API or CLI.

## Configuring Pod Security Standards

Portainer's **Cluster > Security constraints** page uses OPA Gatekeeper for workload-level constraints. Separately, Kubernetes v1.25+ removes PodSecurityPolicy and uses Pod Security Admission to enforce Pod Security Standards (PSS) via namespace labels:

```bash
# Apply the "restricted" security standard to a namespace

kubectl label --overwrite namespace my-restricted-namespace \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted

# Apply "baseline" policy (less strict)
kubectl label --overwrite namespace my-baseline-namespace \
  pod-security.kubernetes.io/enforce=baseline
```

## Configuring RBAC for Portainer Users

If Kubernetes RBAC is enabled, Portainer namespace access can build on standard Kubernetes roles and bindings. For example:

```yaml
# developer-role.yaml - Read-only access for developers
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: my-namespace
rules:
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: my-namespace
subjects:
  - kind: User
    name: developer@company.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
```

## Restricting Privileged Containers

Prevent privileged containers via Pod Security Admission or an OPA/Gatekeeper constraint. If you apply Gatekeeper directly, install the matching `ConstraintTemplate` before the `Constraint`:

```yaml
# OPA Gatekeeper constraint to block privileged containers
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPPrivilegedContainer
metadata:
  name: psp-privileged-container
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
```

## Auditing Security Settings

```bash
# Check what security-related admission webhooks are active
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations

# List cluster role bindings to audit access
kubectl get clusterrolebindings -o wide | grep -v "system:"
```

## Conclusion

Portainer's cluster security settings combined with Kubernetes RBAC give you a layered security model. Always apply the principle of least privilege - give users only the permissions they need for their role.
