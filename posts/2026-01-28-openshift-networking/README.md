# How to Configure OpenShift Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, Networking, Kubernetes, Routes, Load Balancing

Description: Learn how OpenShift networking works, how to expose services with Routes, and how to configure common network policies for production clusters.

---

OpenShift networking builds on Kubernetes but adds opinionated defaults that simplify application exposure. This guide walks through the core pieces and shows how to expose workloads safely and consistently.

## OpenShift Networking Basics

Key components you will touch most often:

- **Service**: Stable virtual IP that load balances to pods.
- **Route**: OpenShift-specific resource for external HTTP(S) access.
- **Ingress Controller**: The router that terminates TLS and forwards requests.
- **NetworkPolicy**: Controls pod-to-pod traffic.

## Expose an App Internally with a Service

Create a ClusterIP service for internal traffic:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
spec:
  selector:
    app: api
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Expose an App Externally with a Route

Routes map external hostnames to services. This example creates a TLS edge-terminated route.

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: api
spec:
  to:
    kind: Service
    name: api
  port:
    targetPort: http
  tls:
    termination: edge
```

If you need your app to handle TLS, use `passthrough` termination. If you need re-encryption, use `reencrypt` with a destination CA.

## Configure Path-Based Routing

Route paths let you share a host across services:

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: api-v1
spec:
  host: api.example.com
  path: /v1
  to:
    kind: Service
    name: api-v1
```

## NetworkPolicies for Pod Isolation

By default, all pods can talk to each other. Add policies to restrict traffic.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow-web
spec:
  podSelector:
    matchLabels:
      app: api
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: web
      ports:
        - protocol: TCP
          port: 8080
```

## Working with Ingress Controllers

OpenShift uses a default ingress controller in `openshift-ingress-operator`. You can create custom ingress controllers for:

- Internal-only traffic
- Dedicated domains
- Separate TLS certificates

This is useful for multi-tenant or regulated environments.

## Troubleshooting Tips

- **Route not reachable**: Check the router pods and DNS.
- **TLS errors**: Verify termination type and certificates.
- **NetworkPolicy blocks**: Temporarily add an allow rule and iterate.

Useful commands:

```bash
oc get routes
oc describe route api
oc get pods -n openshift-ingress
```

## Conclusion

OpenShift networking is straightforward once you know where to look. Use Services for internal traffic, Routes for external access, and NetworkPolicies to keep workloads isolated. For more complex setups, customize ingress controllers and route configurations.
