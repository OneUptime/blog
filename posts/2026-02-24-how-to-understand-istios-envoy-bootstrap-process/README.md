# How to Understand Istio's Envoy Bootstrap Process

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Bootstrap, Sidecar, Kubernetes

Description: A detailed walkthrough of how the Envoy sidecar proxy bootstraps inside an Istio mesh pod, from init container to full xDS connectivity.

---

Every Envoy sidecar in your Istio mesh goes through a bootstrap process before it is ready to handle traffic. Understanding this process helps you debug startup issues, slow pod readiness, and connectivity problems that happen during the first few seconds of a pod's life.

## The Bootstrap Sequence

When a pod with Istio sidecar injection starts, the following happens in order:

1. Init container (istio-init) runs and sets up iptables rules
2. Application container and istio-proxy container start
3. Pilot-agent generates the Envoy bootstrap configuration
4. Pilot-agent starts Envoy with the bootstrap config
5. Envoy connects to istiod using the bootstrap config
6. Istiod sends the full mesh configuration via xDS
7. Envoy applies the configuration and starts serving traffic
8. The readiness probe passes

Each step has to complete before the next one works. If any step fails, the pod either stays in init or the sidecar reports not ready.

## Step 1: The Init Container

The `istio-init` container runs before any other container in the pod. Its job is to set up iptables rules that redirect all inbound and outbound traffic through the Envoy sidecar:

```bash
# See the init container definition
kubectl get pod my-app-xyz -o jsonpath='{.spec.initContainers[0]}' | python3 -m json.tool
```

The init container runs the `istio-iptables` command:

```bash
istio-iptables -p 15001 -z 15006 -u 1337 -m REDIRECT -i '*' -x '' -b '*' -d 15090,15021,15020
```

What these flags mean:
- `-p 15001` - Redirect outbound traffic to port 15001
- `-z 15006` - Redirect inbound traffic to port 15006
- `-u 1337` - UID of the istio-proxy user (traffic from this UID is not redirected)
- `-m REDIRECT` - Use REDIRECT mode
- `-b '*'` - Redirect traffic for all inbound ports
- `-d 15090,15021,15020` - Exclude these ports from redirection (Envoy admin/health/stats ports)

The init container needs `NET_ADMIN` and `NET_RAW` capabilities to modify iptables:

```yaml
securityContext:
  capabilities:
    add:
    - NET_ADMIN
    - NET_RAW
```

## Step 2: Pilot-Agent Starts

The istio-proxy container runs `pilot-agent`, not Envoy directly. Pilot-agent is a Go binary that:

1. Generates the Envoy bootstrap configuration
2. Starts and manages the Envoy process
3. Handles certificate management via SDS
4. Provides health checking endpoints
5. Manages graceful shutdown

```bash
# See the istio-proxy container command
kubectl get pod my-app-xyz -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].args}' | python3 -m json.tool
```

```json
["proxy", "sidecar", "--domain", "default.svc.cluster.local", "--proxyLogLevel=warning", "--proxyComponentLogLevel=misc:error", "--log_output_level=default:info"]
```

## Step 3: Bootstrap Configuration Generation

Pilot-agent generates a JSON bootstrap configuration file at `/etc/istio/proxy/envoy-rev.json`. This file tells Envoy:

- Where to find the control plane (istiod address)
- What its identity is (node ID, cluster name)
- How to authenticate with istiod
- Static listeners for the admin interface
- Logging configuration

You can view this file:

```bash
kubectl exec deploy/my-app -c istio-proxy -- cat /etc/istio/proxy/envoy-rev.json | python3 -m json.tool | head -40
```

Key sections in the bootstrap config:

```json
{
  "node": {
    "id": "sidecar~10.244.1.5~my-app-xyz.default~default.svc.cluster.local",
    "cluster": "my-app.default",
    "metadata": {
      "ISTIO_VERSION": "1.20.0",
      "MESH_ID": "cluster.local",
      "CLUSTER_ID": "Kubernetes",
      "NAMESPACE": "default",
      "APP_CONTAINERS": "my-app"
    }
  },
  "dynamic_resources": {
    "ads_config": {
      "api_type": "GRPC",
      "transport_api_version": "V3",
      "grpc_services": [
        {
          "envoy_grpc": {
            "cluster_name": "xds-grpc"
          }
        }
      ]
    }
  }
}
```

The `node.id` follows the format: `sidecar~<pod-ip>~<pod-name>.<namespace>~<namespace>.svc.cluster.local`. This is how istiod identifies each connected proxy.

## Step 4: Envoy Starts

Pilot-agent launches the Envoy binary with the generated bootstrap config. At this point, Envoy only has the static bootstrap configuration - it does not know about any services in the mesh yet.

```bash
# Check the Envoy process
kubectl exec deploy/my-app -c istio-proxy -- ps aux | grep envoy
```

## Step 5: xDS Connection

Envoy uses the `xds-grpc` cluster from the bootstrap config to connect to istiod. The cluster is defined statically in the bootstrap:

```json
{
  "static_resources": {
    "clusters": [
      {
        "name": "xds-grpc",
        "type": "STRICT_DNS",
        "load_assignment": {
          "cluster_name": "xds-grpc",
          "endpoints": [
            {
              "lb_endpoints": [
                {
                  "endpoint": {
                    "address": {
                      "socket_address": {
                        "address": "istiod.istio-system.svc",
                        "port_value": 15012
                      }
                    }
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

The connection to istiod on port 15012 is secured with TLS. The initial TLS bootstrap uses the Kubernetes service account token mounted in the pod.

## Step 6: Configuration Delivery

Once connected, istiod pushes the full configuration to the sidecar:

1. CDS (Cluster Discovery Service) - All upstream service definitions
2. EDS (Endpoint Discovery Service) - Pod IPs for each cluster
3. LDS (Listener Discovery Service) - What ports to listen on
4. RDS (Route Discovery Service) - HTTP routing rules

The sidecar logs show when configuration is received:

```bash
kubectl logs deploy/my-app -c istio-proxy | head -20
```

You will see lines like:

```text
info  cache  generated new workload certificate
info  ads    ADS: new]connection for node:sidecar~10.244.1.5~my-app-xyz.default~default.svc.cluster.local
info  ads    CDS: PUSH
info  ads    EDS: PUSH
info  ads    LDS: PUSH
info  ads    RDS: PUSH
```

## Step 7: Readiness

Once the configuration is received and applied, the sidecar's readiness probe passes. The readiness endpoint is at:

```bash
# Health check endpoint
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15021/healthz/ready
```

Pilot-agent checks that Envoy is running and has received at least one configuration update before reporting ready. This prevents the pod from receiving traffic before the sidecar knows about the mesh.

## Startup Timing

On a healthy cluster, the full bootstrap process takes about 2-5 seconds. Here is a rough breakdown:

- Init container (iptables setup): 1-2 seconds
- Pilot-agent startup and bootstrap generation: < 1 second
- Envoy startup: < 1 second
- xDS connection and initial config push: 1-3 seconds

If startup is taking longer, check:

```bash
# Init container logs
kubectl logs my-app-xyz -c istio-init

# Sidecar startup logs
kubectl logs my-app-xyz -c istio-proxy | head -30
```

## Common Bootstrap Problems

### Sidecar Not Starting

If the istio-proxy container is in CrashLoopBackOff:

```bash
kubectl logs my-app-xyz -c istio-proxy --previous
```

Common causes:
- Cannot resolve istiod DNS (CoreDNS issues)
- Cannot connect to istiod port 15012 (NetworkPolicy blocking)
- Invalid bootstrap config (usually from annotation misconfiguration)

### Slow Startup

If the sidecar takes more than 10 seconds to become ready:

```bash
# Check if the xDS connection is established
kubectl logs my-app-xyz -c istio-proxy | grep -i "connected\|error\|timeout"
```

Possible causes:
- Istiod is overloaded and slow to push configuration
- Large mesh with many services (initial push is large)
- DNS resolution delay for istiod

### Application Starting Before Sidecar

By default, the application container can start before the sidecar is ready, which means initial requests might fail. Use the `holdApplicationUntilProxyStarts` option:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Or per-pod with an annotation:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

This adds a postStart hook that blocks the application container until the sidecar is ready.

The bootstrap process is the foundation of everything the sidecar does. Every routing rule, security policy, and telemetry feature depends on the sidecar successfully bootstrapping and receiving its configuration from istiod. When pods take too long to start or fail to connect, the bootstrap sequence is the first place to investigate.
