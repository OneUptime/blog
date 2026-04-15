# How to Secure Dapr Dashboard Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Dashboard, Kubernetes, Access Control

Description: Learn how to secure the Dapr Dashboard with authentication, network restrictions, and ingress controls to prevent unauthorized access to your cluster's observability UI.

---

## Overview

The Dapr Dashboard provides a web UI to view components, configurations, applications, and logs in your Dapr-enabled cluster. By default it runs without authentication, making it essential to restrict access in production environments. This post covers how to secure the dashboard with ingress authentication, network policies, and proper RBAC.

## Default Dashboard Installation

Since Dapr 1.11, the Dapr Dashboard is installed via its own Helm chart, separate from the core Dapr runtime:

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr-dashboard dapr/dapr-dashboard --namespace dapr-system
```

By default, the dashboard is only reachable via `kubectl port-forward`:

```bash
kubectl port-forward svc/dapr-dashboard 8080:8080 -n dapr-system
```

This is the recommended way to access the dashboard in production since it requires an authenticated `kubectl` session.

## Exposing the Dashboard via Ingress with Authentication

If you need to expose the dashboard to a team without direct cluster access, use an Ingress with authentication middleware. With NGINX Ingress and OAuth2 Proxy:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dapr-dashboard
  namespace: dapr-system
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "http://oauth2-proxy.auth.svc.cluster.local/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.example.com/oauth2/start?rd=$escaped_request_uri"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-Auth-Request-User,X-Auth-Request-Email"
spec:
  ingressClassName: nginx
  rules:
  - host: dapr-dashboard.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dapr-dashboard
            port:
              number: 8080
  tls:
  - hosts:
    - dapr-dashboard.example.com
    secretName: dapr-dashboard-tls
```

## Restricting Dashboard Access with NetworkPolicy

Allow only specific pods (such as the OAuth2 proxy or bastion) to reach the dashboard service:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-dapr-dashboard
  namespace: dapr-system
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: dapr-dashboard
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: auth
      podSelector:
        matchLabels:
          app: oauth2-proxy
    ports:
    - protocol: TCP
      port: 8080
```

## Limiting Dashboard RBAC Permissions

The Dapr Dashboard service account needs read access to Dapr resources. Scope its permissions:

```bash
kubectl get clusterrolebinding | grep dashboard
kubectl describe clusterrole dapr-dashboard
```

If the dashboard ClusterRole is too permissive, replace it with a narrower Role scoped to specific namespaces:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-dashboard-reader
  namespace: default
rules:
- apiGroups: ["dapr.io"]
  resources: ["components", "configurations", "subscriptions"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list"]
```

## Disabling the Dashboard in Production

If your team does not need the web UI, simply do not install the `dapr-dashboard` Helm chart. If it is already installed, remove it:

```bash
helm uninstall dapr-dashboard --namespace dapr-system
```

## Summary

Securing the Dapr Dashboard requires restricting network access to the service, adding authentication via an OAuth2 proxy or ingress annotations, and auditing the dashboard service account's RBAC permissions. In high-security environments, disable the dashboard and rely on `kubectl port-forward` gated by kubeconfig access controls.
