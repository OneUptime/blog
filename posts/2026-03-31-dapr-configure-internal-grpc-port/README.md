# How to Configure Dapr Internal gRPC Port

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, gRPC, Port, Sidecar, Configuration

Description: Configure the Dapr internal gRPC port used for sidecar-to-sidecar and sidecar-to-control-plane communication in Kubernetes deployments.

---

## What Is the Dapr Internal gRPC Port?

Dapr uses two distinct gRPC ports. The public gRPC API port (50001) is used by your application to call the Dapr sidecar. The internal gRPC port (50002) is used for sidecar-to-sidecar communication - when one Dapr sidecar needs to invoke a method on another microservice's sidecar, such as during service invocation and actor placement.

## Configuring the Internal gRPC Port

Set the internal gRPC port via the deployment annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "notification-service"
        dapr.io/internal-grpc-port: "50002"
    spec:
      containers:
      - name: notification-service
        image: notification-service:latest
```

## When to Change the Internal gRPC Port

The default internal port (50002) should be changed if:
- Your application binds to port 50002
- You're running multiple Dapr-enabled processes in the same network namespace
- Your firewall rules require explicit port documentation

```yaml
# Change to 50102 for a non-standard setup
dapr.io/internal-grpc-port: "50102"
```

## Service Invocation Flow via Internal gRPC

When Service A calls Service B, the path is:

1. App A calls Dapr sidecar A on gRPC port 50001
2. Dapr sidecar A looks up Service B's sidecar via mDNS or Kubernetes DNS
3. Dapr sidecar A connects to Dapr sidecar B on internal gRPC port 50002
4. Dapr sidecar B forwards the request to App B on app-port

Understanding this helps you write correct network policies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dapr-internal
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/part-of: dapr-mesh
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/part-of: dapr-mesh
    ports:
    - protocol: TCP
      port: 50002
  egress:
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/part-of: dapr-mesh
    ports:
    - protocol: TCP
      port: 50002
```

## mTLS on the Internal gRPC Port

Dapr automatically applies mTLS to all internal gRPC connections when mTLS is enabled (default in Kubernetes mode):

```yaml
# Check mTLS is enabled in Dapr Configuration
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

Verify mTLS is functioning:

```bash
# Check Dapr sentry logs for certificate issuance
kubectl logs -n dapr-system -l app=dapr-sentry --tail=50

# Check that internal connections use TLS
kubectl exec POD_NAME -c daprd -- \
  openssl s_client -connect OTHER_POD_IP:50002 -brief
```

## Debugging Internal gRPC Issues

```bash
# Check internal gRPC port is listening
kubectl exec POD_NAME -c daprd -- ss -tlnp | grep 50002

# Check Dapr placement table (actor service discovery)
kubectl logs -n dapr-system -l app=dapr-placement-server --tail=100 | grep "added"

# View daprd logs filtered for internal gRPC activity
# To enable debug logging, set the annotation dapr.io/log-level: "debug" and redeploy
kubectl logs POD_NAME -c daprd | grep "internal"
```

## Summary

The Dapr internal gRPC port is the backbone of sidecar-to-sidecar communication, enabling service invocation and actor placement without your application code being aware of the underlying network topology. Configuring this port explicitly through annotations and writing appropriate network policies ensures your Dapr mesh operates securely and predictably in multi-tenant Kubernetes environments.
