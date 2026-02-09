# How to Implement Cross-Namespace ServiceAccount Access with RBAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Configure Kubernetes RBAC to enable ServiceAccounts to access resources across namespaces while maintaining security boundaries and least privilege principles.

---

Kubernetes namespaces provide logical isolation, but sometimes workloads need to access resources in other namespaces. Implementing cross-namespace access with ServiceAccounts and RBAC requires careful configuration to maintain security while enabling necessary functionality.

## Understanding Cross-Namespace Access Patterns

By default, RBAC permissions are namespace-scoped. A Role in namespace A cannot grant access to resources in namespace B. This isolation is intentional and desirable for security, but several scenarios require cross-namespace access.

Monitoring systems need to read metrics from pods across all namespaces. CI/CD systems deploy to multiple namespaces. Service mesh control planes manage sidecars in application namespaces. Ingress controllers route traffic to services in different namespaces.

Cross-namespace access requires ClusterRoles and ClusterRoleBindings instead of namespace-scoped Roles. These grant permissions across namespace boundaries while still allowing fine-grained control over what resources can be accessed.

## Basic Cross-Namespace Read Access

Start with a ServiceAccount that reads pods across all namespaces:

```yaml
# cross-namespace-reader.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-monitor
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-reader-cluster
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-monitor-binding
subjects:
- kind: ServiceAccount
  name: cluster-monitor
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: pod-reader-cluster
  apiGroup: rbac.authorization.k8s.io
```

This ServiceAccount in the monitoring namespace can read pods everywhere:

```bash
kubectl apply -f cross-namespace-reader.yaml

# Test access
kubectl auth can-i list pods --all-namespaces \
  --as=system:serviceaccount:monitoring:cluster-monitor
```

The namespace listing permission helps the monitoring tool discover all namespaces to check.

## Restricting Cross-Namespace Access with Label Selectors

ClusterRoles grant broad permissions, but you might want to limit access to specific namespaces. While RBAC doesn't support namespace label selectors directly, you can implement this at the application level:

```yaml
# labeled-namespace-access.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: scoped-monitor
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: scoped-pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: scoped-monitor-binding
subjects:
- kind: ServiceAccount
  name: scoped-monitor
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: scoped-pod-reader
  apiGroup: rbac.authorization.k8s.io
```

The application filters namespaces by label:

```go
// namespace-filter.go
package main

import (
    "context"
    "fmt"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func listPodsInMonitoredNamespaces(clientset *kubernetes.Clientset) error {
    // List namespaces with the monitoring label
    namespaces, err := clientset.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{
        LabelSelector: "monitoring=enabled",
    })
    if err != nil {
        return err
    }

    // For each monitored namespace, list pods
    for _, ns := range namespaces.Items {
        pods, err := clientset.CoreV1().Pods(ns.Name).List(context.TODO(), metav1.ListOptions{})
        if err != nil {
            fmt.Printf("Error listing pods in %s: %v\n", ns.Name, err)
            continue
        }
        fmt.Printf("Namespace %s: %d pods\n", ns.Name, len(pods.Items))
    }

    return nil
}

func main() {
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    if err := listPodsInMonitoredNamespaces(clientset); err != nil {
        panic(err.Error())
    }
}
```

Mark namespaces for monitoring:

```bash
kubectl label namespace production monitoring=enabled
kubectl label namespace staging monitoring=enabled
```

This pattern combines RBAC permissions with application-level filtering for nuanced access control.

## Specific Resource Access Across Namespaces

Grant access to specific resource types across namespaces:

```yaml
# configmap-reader-cluster.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: config-reader
  namespace: tools
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: configmap-reader-cluster
rules:
# Read ConfigMaps in any namespace
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
# Need namespace read to discover them
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: config-reader-binding
subjects:
- kind: ServiceAccount
  name: config-reader
  namespace: tools
roleRef:
  kind: ClusterRole
  name: configmap-reader-cluster
  apiGroup: rbac.authorization.k8s.io
```

This ServiceAccount can read ConfigMaps everywhere but cannot access other resource types.

## Using RoleBindings with ClusterRoles

An interesting pattern combines ClusterRoles with RoleBindings to grant namespace-specific access using reusable role definitions:

```yaml
# reusable-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployment-manager
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
# Grant access only in production namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-production-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: cicd-deployer
  namespace: cicd
roleRef:
  kind: ClusterRole
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
---
# Grant access only in staging namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cicd-staging-binding
  namespace: staging
subjects:
- kind: ServiceAccount
  name: cicd-deployer
  namespace: cicd
roleRef:
  kind: ClusterRole
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

The cicd-deployer ServiceAccount can manage deployments in production and staging, but not in other namespaces. This reuses the ClusterRole definition while maintaining namespace boundaries.

## Multi-Tenant Access Patterns

In multi-tenant clusters, teams need access to their namespaces only:

```yaml
# tenant-access.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-admin
  namespace: team-a
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: tenant-admin
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
---
# Team A admin access to team-a-prod namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-prod-binding
  namespace: team-a-prod
subjects:
- kind: ServiceAccount
  name: team-a-admin
  namespace: team-a
roleRef:
  kind: ClusterRole
  name: tenant-admin
  apiGroup: rbac.authorization.k8s.io
---
# Team A admin access to team-a-staging namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-staging-binding
  namespace: team-a-staging
subjects:
- kind: ServiceAccount
  name: team-a-admin
  namespace: team-a
roleRef:
  kind: ClusterRole
  name: tenant-admin
  apiGroup: rbac.authorization.k8s.io
```

Team A's ServiceAccount has full admin rights in their production and staging namespaces, but no access to other teams' namespaces.

## Service Discovery Across Namespaces

Applications discovering services across namespaces need specific permissions:

```yaml
# service-discovery.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api-gateway
  namespace: ingress
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: service-discoverer
rules:
# Read services to discover endpoints
- apiGroups: [""]
  resources: ["services"]
  verbs: ["get", "list", "watch"]
# Read endpoints to get pod IPs
- apiGroups: [""]
  resources: ["endpoints"]
  verbs: ["get", "list", "watch"]
# Read namespaces
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: api-gateway-discovery
subjects:
- kind: ServiceAccount
  name: api-gateway
  namespace: ingress
roleRef:
  kind: ClusterRole
  name: service-discoverer
  apiGroup: rbac.authorization.k8s.io
```

This enables an ingress controller to discover and route to services in any namespace.

## Secret Access Across Namespaces

Secrets are sensitive. Grant cross-namespace secret access carefully:

```yaml
# cross-namespace-secrets.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cert-manager
  namespace: cert-manager
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cert-secret-manager
rules:
# Manage TLS secrets in any namespace
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cert-manager-secrets
subjects:
- kind: ServiceAccount
  name: cert-manager
  namespace: cert-manager
roleRef:
  kind: ClusterRole
  name: cert-secret-manager
  apiGroup: rbac.authorization.k8s.io
```

Cert-manager needs this to create TLS certificates in application namespaces. Document such broad permissions clearly.

## Implementing with Network Policies

Cross-namespace access often requires network policies too:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: production
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  ingress:
  # Allow monitoring namespace to access pods
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
```

RBAC controls API access, NetworkPolicies control network access. Both are needed for complete isolation control.

## Testing Cross-Namespace Access

Verify permissions work as expected:

```bash
# Test cluster-wide access
kubectl auth can-i list pods --all-namespaces \
  --as=system:serviceaccount:monitoring:cluster-monitor

# Test specific namespace access
kubectl auth can-i get deployments -n production \
  --as=system:serviceaccount:cicd:cicd-deployer

# Test denied access
kubectl auth can-i delete namespaces \
  --as=system:serviceaccount:monitoring:cluster-monitor
# Should return "no"

# List all permissions
kubectl auth can-i --list --all-namespaces \
  --as=system:serviceaccount:monitoring:cluster-monitor
```

## Security Considerations

Cross-namespace access increases risk. A compromised ServiceAccount with cluster-wide access can affect multiple namespaces. Balance functionality with security.

Prefer namespace-scoped permissions when possible. Use ClusterRoles only when truly necessary. Regularly audit ClusterRoleBindings for overly broad access. Document why each cross-namespace permission is needed.

Consider using admission controllers to prevent unauthorized cross-namespace access. OPA Gatekeeper can enforce policies like "only monitoring ServiceAccounts can have cluster-wide read access."

## Conclusion

Cross-namespace ServiceAccount access requires ClusterRoles and careful planning. Use ClusterRoleBindings for truly cluster-wide access, or combine ClusterRoles with namespace-scoped RoleBindings for selective cross-namespace permissions. Always follow least privilege - grant only the minimum permissions needed for workloads to function. Test permissions thoroughly and document the reasoning behind cross-namespace access grants. With proper RBAC configuration, you can enable necessary functionality while maintaining strong security boundaries.
