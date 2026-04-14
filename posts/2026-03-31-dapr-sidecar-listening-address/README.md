# How to Configure Dapr Sidecar Listening Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Networking, Kubernetes, Configuration

Description: Configure the network interface and ports the Dapr sidecar listens on to control API accessibility, enable dual-stack networking, or restrict access to localhost only.

---

In standalone mode, the Dapr sidecar listens on all network interfaces (`0.0.0.0`) on its HTTP (3500) and gRPC (50001) ports. In Kubernetes, the default listening address is `[::1],127.0.0.1` (localhost only). You may want to change the listening address to expand or restrict access, change the default ports, or configure dual-stack networking.

## Default Listening Behavior

When running in standalone mode, daprd binds to all interfaces by default:
- HTTP API: `0.0.0.0:3500`
- gRPC API: `0.0.0.0:50001`
- Internal gRPC (sidecar-to-sidecar): `0.0.0.0:50002`
- Public HTTP (health and metadata): `0.0.0.0:3501`

In Kubernetes, the default listening address is `[::1],127.0.0.1`, so the sidecar only accepts connections from localhost. To expose the sidecar on all interfaces in Kubernetes, you must explicitly set the listening address.

## Changing the HTTP and gRPC Ports

If your application's ports conflict with Dapr's defaults, change the gRPC port via annotation and the HTTP port via the `--dapr-http-port` CLI flag (there is no Kubernetes annotation for the HTTP port):

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "api-service"
  dapr.io/grpc-port: "50101"
```

The Dapr sidecar injector sets the `DAPR_HTTP_PORT` and `DAPR_GRPC_PORT` environment variables automatically, so your application can discover the correct ports at runtime:

```javascript
const DAPR_PORT = process.env.DAPR_HTTP_PORT || 3500;
const response = await fetch(`http://localhost:${DAPR_PORT}/v1.0/state/statestore/my-key`);
```

## Restricting to Localhost

In Kubernetes, the sidecar already listens on localhost by default. For standalone mode, you can restrict to localhost explicitly:

```yaml
annotations:
  dapr.io/sidecar-listen-addresses: "127.0.0.1"
```

With this setting, only processes within the same pod can reach the Dapr HTTP and gRPC APIs directly.

## Enabling IPv6 or Dual-Stack

To listen on all interfaces with both IPv4 and IPv6 (dual-stack):

```yaml
annotations:
  dapr.io/sidecar-listen-addresses: "0.0.0.0,[::]"
```

This binds to all IPv4 and IPv6 interfaces, making the sidecar accessible beyond localhost.

## Internal vs. Public Ports

Dapr uses different ports for internal and external communication:

```bash
# Check which ports daprd is listening on
kubectl exec my-pod -c daprd -- ss -tlnp
```

With default Kubernetes settings, the output shows localhost binding:

```text
State  Recv-Q  Send-Q  Local Address:Port
LISTEN 0       128     127.0.0.1:3500
LISTEN 0       128     127.0.0.1:3501
LISTEN 0       128     127.0.0.1:50001
LISTEN 0       128     127.0.0.1:50002
LISTEN 0       128     [::1]:3500
LISTEN 0       128     [::1]:3501
LISTEN 0       128     [::1]:50001
LISTEN 0       128     [::1]:50002
```

## App-to-Sidecar Port

Your application calls the sidecar on port 3500 (HTTP) or 50001 (gRPC). These are always on localhost from the application's perspective since they share a pod network namespace.

```python
import requests
resp = requests.get("http://localhost:3500/v1.0/state/statestore/order-123")
```

## Summary

Configuring the Dapr sidecar listening address lets you control API accessibility, avoid port conflicts with your application, and support dual-stack IPv6 networking. In Kubernetes, the sidecar already defaults to localhost, providing a secure baseline. In standalone mode, you may want to explicitly restrict to localhost. Combined with mTLS, this provides a strong security boundary.
