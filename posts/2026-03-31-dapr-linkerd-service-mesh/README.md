# How to Run Dapr Alongside Linkerd Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Linkerd, Service Mesh, Kubernetes, mTLS

Description: Learn how to run Dapr sidecars alongside Linkerd proxies, configure mTLS coordination, and avoid port conflicts.

---

Dapr and Linkerd can coexist in the same Kubernetes cluster and even the same pod. Both inject sidecar proxies, so you need to coordinate their behavior to avoid conflicts and double-encryption. This guide covers the setup and configuration required for a working Dapr-Linkerd deployment.

## Install Linkerd

```bash
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
linkerd check
```

## Install Dapr

```bash
helm repo add dapr https://dapr.github.io/helm-charts/
helm install dapr dapr/dapr -n dapr-system --create-namespace
```

## Inject Both Sidecars

Annotate your namespace or deployment to inject both proxies:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  annotations:
    linkerd.io/inject: enabled
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
```

When both are injected, the pod will have three containers: your app, the Dapr sidecar (`daprd`), and the Linkerd proxy (`linkerd-proxy`).

## Configure Dapr to Skip Linkerd Proxy for Internal Traffic

By default, Dapr's sidecar-to-sidecar traffic bypasses Linkerd because it uses the pod IP directly. To ensure Dapr traffic also flows through Linkerd for observability:

```yaml
annotations:
  dapr.io/config: "dapr-config"
```

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  tracing:
    samplingRate: "1"
```

## Disable Dapr mTLS When Linkerd Handles It

If Linkerd is already providing mTLS between services, you can disable Dapr's mTLS to avoid double-encryption overhead:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
spec:
  mtls:
    enabled: false
```

Dapr mTLS is a global setting controlled by the Sentry certificate authority. Disable it cluster-wide by updating the system-level Dapr configuration or by setting `global.mtls.enabled=false` during Helm install/upgrade.

## Handle Port Conflicts

Linkerd reserves ports 4140 (outbound), 4143 (inbound), 4190 (control), and 4191 (admin). Dapr uses ports 3500 (HTTP) and 50001 (gRPC). Verify there are no conflicts:

```bash
kubectl exec <pod> -c linkerd-proxy -- env | grep LINKERD
kubectl exec <pod> -c daprd -- env | grep DAPR
```

If your app port conflicts with Linkerd's reserved ports, change it via annotation:

```yaml
annotations:
  dapr.io/app-port: "8080"
  config.linkerd.io/skip-inbound-ports: "3500,50001"
```

## Verify the Setup

Check that both proxies are running:

```bash
kubectl get pods -l app=order-service -o jsonpath='{.items[0].spec.containers[*].name}'
# Expected: order-service daprd linkerd-proxy
```

Test service invocation through Dapr:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/health
```

Verify Linkerd sees the traffic:

```bash
linkerd viz stat deploy/order-service
```

## Summary

Running Dapr alongside Linkerd requires injecting both sidecars and coordinating mTLS to avoid double-encryption. Disable Dapr mTLS when Linkerd handles encryption at the network layer. Use Linkerd's port skip annotations to prevent proxy conflicts, and verify both sidecars are running correctly before testing service communication.
