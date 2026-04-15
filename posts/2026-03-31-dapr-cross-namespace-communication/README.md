# How to Configure Dapr for Cross-Namespace Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Namespace, Service Invocation, Networking

Description: Learn how to enable Dapr service invocation across Kubernetes namespaces using namespace-qualified app IDs and RBAC configuration.

---

## Cross-Namespace Communication in Dapr

By default, Dapr service invocation routes calls within the same Kubernetes namespace. For architectures where services are spread across namespaces (team-based, environment-based, or domain-based namespacing), you need namespace-qualified app IDs.

## The Namespace-Qualified App ID Syntax

Dapr supports cross-namespace invocation using the format `{appId}.{namespace}`:

```python
from dapr.clients import DaprClient
import json

def get_user_profile(user_id: str) -> dict:
    with DaprClient() as client:
        # Call user-service in the 'identity' namespace from 'orders' namespace
        response = client.invoke_method(
            app_id="user-service.identity",
            method_name=f"users/{user_id}",
            http_verb="GET"
        )
        return json.loads(response.data)
```

Using the HTTP API directly:

```bash
curl http://localhost:3500/v1.0/invoke/user-service.identity/method/users/123
```

## RBAC for Cross-Namespace Access

Create a ClusterRoleBinding that allows Dapr to query pods across namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dapr-cross-namespace
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["dapr.io"]
  resources: ["components", "configurations", "subscriptions"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dapr-cross-namespace-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dapr-cross-namespace
subjects:
- kind: ServiceAccount
  name: dapr-operator
  namespace: dapr-system
```

## Enabling Cross-Namespace in Dapr Configuration

Ensure the Dapr system configuration allows namespace-qualified resolution:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-system
  namespace: dapr-system
spec:
  nameResolution:
    component: "kubernetes"
    configuration:
      template: "{{.ID}}-dapr.{{.Namespace}}.svc.cluster.local:{{.Port}}"
```

## Namespaced Component Sharing

Share a component (such as a message broker) across namespaces using `scopes`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: shared-pubsub
  namespace: shared-infra
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-master.shared-infra:6379"
scopes:
- orders-service
- inventory-service
- notification-service
```

## Network Policy for Cross-Namespace Traffic

Allow Dapr sidecar ports across namespaces. First, label the source namespaces that run Dapr-enabled workloads:

```bash
kubectl label namespace identity dapr-enabled=true
kubectl label namespace orders dapr-enabled=true
```

Then create the NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-cross-namespace
  namespace: orders
spec:
  podSelector: {}
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          dapr-enabled: "true"
    ports:
    - protocol: TCP
      port: 50001
    - protocol: TCP
      port: 3500
```

## Verifying Cross-Namespace Calls

Test from within a pod in the `orders` namespace:

```bash
kubectl exec -n orders deploy/order-service -c order-service -- \
  curl http://localhost:3500/v1.0/invoke/user-service.identity/method/health
```

## Summary

Dapr enables cross-namespace service invocation with namespace-qualified app IDs in the format `{appId}.{namespace}`, requiring no code changes beyond updating the target app ID string. RBAC ClusterRoleBindings grant Dapr the API access needed to discover pods across namespace boundaries. Network policies must explicitly allow traffic on Dapr ports (50001 and 3500) between namespaces to prevent silent drops.
