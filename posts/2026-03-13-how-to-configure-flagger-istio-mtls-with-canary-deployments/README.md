# How to Configure Flagger Istio mTLS with Canary Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flagger, istio, mtls, canary, kubernetes, progressive delivery, security, service mesh

Description: Learn how to configure mutual TLS with Flagger and Istio canary deployments to ensure encrypted traffic during progressive delivery.

---

## Introduction

Mutual TLS (mTLS) encrypts service-to-service communication and verifies the identity of both parties in a connection. When running canary deployments with Flagger on Istio, mTLS must be properly configured to ensure that traffic between the Istio proxy and your services is encrypted, including traffic to both the primary and canary workloads.

Istio can enforce mTLS at the mesh level, namespace level, or workload level. Flagger needs to align its DestinationRule configuration with the mTLS mode in use, or traffic routing between primary and canary will fail due to TLS handshake errors.

This guide covers how to configure mTLS for Flagger canary deployments, common pitfalls, and how to verify that encryption is working correctly.

## Prerequisites

- A running Kubernetes cluster with Istio installed
- Flagger installed with `meshProvider=istio`
- kubectl access to your cluster
- Basic understanding of Istio mTLS concepts

## Understanding Istio mTLS Modes

Istio supports several mTLS modes through PeerAuthentication policies:

- `PERMISSIVE`: Accepts both plaintext and mTLS traffic (default)
- `STRICT`: Only accepts mTLS traffic
- `DISABLE`: Accepts only plaintext traffic

The mode is set through PeerAuthentication resources:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

This sets strict mTLS across the entire mesh.

## Configuring Flagger with Mesh-Wide Strict mTLS

When Istio is configured with mesh-wide strict mTLS, Flagger's DestinationRule must specify `ISTIO_MUTUAL` as the TLS mode. Configure this through the Canary resource's service spec:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
    gateways:
      - my-gateway.istio-system.svc.cluster.local
    hosts:
      - my-app.example.com
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

The `ISTIO_MUTUAL` mode tells the Envoy proxy to use Istio's automatically provisioned certificates for mTLS. This is the recommended mode when Istio manages certificates through its built-in CA.

## Namespace-Level mTLS

You can enable strict mTLS per namespace instead of mesh-wide:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

The Canary configuration remains the same. Flagger's DestinationRule with `ISTIO_MUTUAL` works with both mesh-wide and namespace-level mTLS.

## Handling the PERMISSIVE to STRICT Migration

When migrating from PERMISSIVE to STRICT mTLS, there is a transition period where both modes coexist. During this period, ensure your Flagger Canary resources have the correct TLS configuration before switching to STRICT:

1. First, update all Canary resources to include `tls.mode: ISTIO_MUTUAL`:

```yaml
  service:
    port: 80
    targetPort: 8080
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
```

2. Verify that canary deployments work correctly in PERMISSIVE mode with the updated configuration.

3. Then switch to STRICT mode:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

This order prevents disruption to in-progress canary deployments.

## Configuring mTLS for Load Tester Communication

The Flagger load tester must also participate in mTLS. Ensure the load tester namespace has Istio sidecar injection enabled:

```bash
kubectl label namespace test istio-injection=enabled
kubectl -n test rollout restart deploy flagger-loadtester
```

Without the Istio sidecar, the load tester cannot communicate with services using strict mTLS, and webhook calls will fail.

## Verifying mTLS is Active

Check that mTLS is active for traffic to your canary workload:

```bash
istioctl x describe pod <canary-pod-name> -n default
```

This shows the mTLS configuration for the pod, including whether connections are encrypted.

You can also check the DestinationRule that Flagger created:

```bash
kubectl get destinationrule my-app -n default -o yaml
```

Verify that the `trafficPolicy.tls.mode` is set to `ISTIO_MUTUAL`.

## Excluding Ports from mTLS

If your application has ports that should not use mTLS (for example, a metrics port scraped by Prometheus outside the mesh), exclude them at the PeerAuthentication level:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: my-app
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: DISABLE
```

This keeps port 9090 in plaintext mode while enforcing mTLS on all other ports. Flagger's traffic routing occurs on the service port, which remains encrypted.

## Common Issues and Troubleshooting

### Connection Reset Errors

If you see `upstream connect error or disconnect/reset before headers` in the Istio proxy logs during canary analysis, the most common cause is a mTLS mismatch. Verify that:

- The DestinationRule TLS mode matches the PeerAuthentication mode
- Both primary and canary pods have Istio sidecars injected
- The load tester has an Istio sidecar if strict mTLS is enabled

### Certificate Not Ready

During canary initialization, the new canary pod needs a valid Istio certificate. If Flagger starts sending traffic before the certificate is provisioned, requests fail. Increase the Canary's `skipAnalysis` or add a pre-rollout webhook that waits for readiness:

```yaml
    webhooks:
      - name: wait-for-mtls
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "sleep 10 && curl -sf http://my-app-canary.default:80/healthz"
```

The brief sleep allows time for certificate provisioning.

## Complete Example with Strict mTLS

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
    gateways:
      - my-gateway.istio-system.svc.cluster.local
      - mesh
    hosts:
      - my-app.example.com
    trafficPolicy:
      tls:
        mode: ISTIO_MUTUAL
      connectionPool:
        http:
          http2MaxRequests: 500
      outlierDetection:
        consecutive5xxErrors: 5
        interval: 10s
        baseEjectionTime: 30s
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
```

## Conclusion

Configuring mTLS for Flagger canary deployments on Istio requires aligning the DestinationRule TLS mode with the mesh or namespace PeerAuthentication policy. Use `ISTIO_MUTUAL` in the Canary's traffic policy to leverage Istio-managed certificates. Ensure all components involved in canary analysis, including the load tester, have Istio sidecars injected. When migrating from PERMISSIVE to STRICT mTLS, update Canary resources first, verify they work, then switch the PeerAuthentication mode to avoid disrupting in-progress deployments.
