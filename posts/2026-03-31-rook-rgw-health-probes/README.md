# How to Set Up Health Probes for RGW in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Kubernetes, Observability

Description: Learn how to configure liveness and readiness health probes for Rook RGW gateway pods to enable proper traffic routing and automatic pod recovery.

---

## Why Health Probes Matter for RGW

Kubernetes uses liveness and readiness probes to determine whether a pod is healthy and ready to serve traffic:

- **Liveness probe**: Restarts a pod if it becomes unresponsive. However, for RGW, Rook uses a simple TCP socket liveness check rather than an HTTP-based probe, since restarting RGW due to HTTP-level unresponsiveness can cause more harm than good.
- **Readiness probe**: Removes a pod from the service endpoints when it is not ready. During startup or high load, RGW may not be able to serve S3 requests immediately.
- **Startup probe**: Prevents liveness and readiness probes from running until the pod has finished initializing. RGW may take time to start, and startup probes avoid premature restarts.

Without health probes, a starting or overloaded RGW pod continues receiving traffic, causing request timeouts for clients.

## Default Probe Configuration

Rook configures basic health probes for RGW by default. You can customize these through the `CephObjectStore` CRD's `gateway.healthCheck` section:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
    healthCheck:
      startupProbe:
        disabled: false
      readinessProbe:
        disabled: false
```

The `gateway.healthCheck` section controls the startup and readiness probes for the RGW pods. Rook does not expose a configurable liveness probe for RGW in the CRD - it internally uses a TCP socket liveness check, since restarting RGW via an HTTP-based liveness probe could cause more harm than good when RGW is temporarily overloaded.

## Customizing Startup and Readiness Probes

Override the probe settings in the `gateway.healthCheck` section of the CephObjectStore spec:

```yaml
gateway:
  healthCheck:
    startupProbe:
      disabled: false
      probe:
        initialDelaySeconds: 5
        periodSeconds: 10
        failureThreshold: 3
    readinessProbe:
      disabled: false
      probe:
        initialDelaySeconds: 10
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3
        successThreshold: 3
```

Rook automatically configures the probe handler as an `exec` probe that runs an internal script using `curl` to check the RGW endpoint. You only need to customize the timing parameters shown above. Note that the CRD does not expose a `livenessProbe` for RGW - Rook internally uses a TCP socket liveness check, and restarting RGW via an HTTP-based liveness probe could cause cascading failures when all RGW instances are under load.

## Understanding the RGW Health Endpoint

Rook's probe script sends an HTTP request to the RGW endpoint and evaluates the response code. The probe logic treats the following as healthy:

- **200–399**: Standard success responses.
- **503**: RGW rate-limiting, not a true error.
- **500**: For the readiness probe only, treated as healthy (with a warning) to avoid cascading failures. For the startup probe, 500 is a failure.

All other response codes cause the probe to fail. You can test the endpoint manually:

```bash
# Test the RGW health endpoint manually
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://rook-ceph-rgw-my-store.rook-ceph.svc:80/
```

A response in the `200–399` range confirms RGW is alive. `000` indicates a connection failure.

## Disabling Probes for Debugging

If you need to keep a misbehaving pod running for diagnostics:

```yaml
gateway:
  healthCheck:
    startupProbe:
      disabled: true
    readinessProbe:
      disabled: true
```

Remember to re-enable probes after debugging.

## Monitoring Probe Results

Watch probe events on RGW pods:

```bash
kubectl -n rook-ceph describe pod -l app=rook-ceph-rgw | grep -A5 "Liveness\|Readiness\|Startup"
```

If probes are failing repeatedly:

```bash
kubectl -n rook-ceph get events --field-selector reason=Unhealthy | grep rgw
```

## Checking Object Store Health via Rook

Rook also exposes object store health through the CRD status:

```bash
kubectl -n rook-ceph get cephobjectstore my-store -o jsonpath='{.status}'
```

The `.status.conditions` array shows the reconciliation status of the object store (e.g., Progressing, Ready, Deleting).

## Summary

Health probes for RGW in Rook are configured through the `gateway.healthCheck.startupProbe` and `gateway.healthCheck.readinessProbe` fields in the CephObjectStore CRD. Rook does not expose a configurable liveness probe for RGW in the CRD - it internally uses a TCP socket liveness check. The startup probe ensures the pod initializes correctly, while the readiness probe removes not-ready pods from service rotation. Rook automatically configures an `exec`-based probe handler that uses `curl` to check the RGW endpoint. Tune `initialDelaySeconds` and `periodSeconds` to match your environment's startup behavior.
