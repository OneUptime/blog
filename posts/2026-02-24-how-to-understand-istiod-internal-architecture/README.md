# How to Understand Istiod Internal Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Architecture, Control Plane, Service Mesh

Description: A detailed look at the internal architecture of istiod including its major subsystems, how they interact, and how configuration flows from Kubernetes to Envoy proxies.

---

Istiod is the monolithic control plane binary for Istio. It consolidates what used to be separate components (Pilot, Citadel, Galley) into a single process. Understanding its internal architecture helps you debug issues, tune performance, and make informed decisions about scaling.

This is not a high-level overview. We are going into the actual subsystems and how they work.

## The Main Subsystems

Istiod has five major subsystems running inside a single Go binary:

1. **Config Controller**: Watches Kubernetes resources and converts them to Istio's internal model
2. **Service Discovery**: Tracks services, endpoints, and workloads across the mesh
3. **xDS Server**: Pushes configuration to Envoy proxies via the xDS protocol
4. **Certificate Authority**: Issues and rotates workload certificates for mTLS
5. **Injection Webhook**: Handles sidecar injection for new pods

Each of these runs as goroutines within the same process, sharing memory and communicating through internal channels.

## Config Controller

The Config Controller watches Kubernetes API server for Istio custom resources:

- VirtualService
- DestinationRule
- Gateway
- ServiceEntry
- Sidecar
- AuthorizationPolicy
- PeerAuthentication
- RequestAuthentication
- Telemetry
- WasmPlugin
- EnvoyFilter

When any of these resources change, the Config Controller converts them into Istio's internal configuration model and notifies the xDS server that a push is needed.

You can see the config the controller has loaded:

```bash
istioctl proxy-status
```

This shows which proxies are synced with the latest configuration and which are behind.

To see the actual configuration istiod has for a specific resource type:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/configz | jq '.[] | select(.type == "networking.istio.io/v1, Kind=VirtualService") | .name'
```

## Service Discovery

The Service Discovery subsystem watches Kubernetes Services and Endpoints (or EndpointSlices) to build a model of all services in the mesh. This model is used to generate Envoy cluster and endpoint configurations.

For each Kubernetes Service, istiod creates an internal Service object with:
- Host name (e.g., `reviews.default.svc.cluster.local`)
- Ports
- Associated endpoints with their IP addresses and health status
- Labels and annotations

The discovery subsystem also handles ServiceEntry resources, which allow you to add external services to the mesh model.

Check what istiod knows about services:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/edsz | jq '.[].cluster_name' | head -20
```

Check endpoint data:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/endpointz
```

## xDS Server

This is the core of istiod. The xDS (x Discovery Service) server implements the Envoy xDS protocol, which includes:

- **LDS (Listener Discovery Service)**: Configures what ports Envoy listens on and how traffic enters the proxy
- **RDS (Route Discovery Service)**: Configures HTTP routing rules (VirtualService rules become routes)
- **CDS (Cluster Discovery Service)**: Configures upstream clusters (services that Envoy can connect to)
- **EDS (Endpoint Discovery Service)**: Provides the actual IP addresses for each cluster
- **SDS (Secret Discovery Service)**: Distributes TLS certificates for mTLS

When a configuration change occurs (a VirtualService is updated, an endpoint changes, a new pod joins the mesh), istiod triggers an xDS push. The push process:

1. Detects which configuration has changed
2. Determines which proxies are affected
3. Generates the new xDS configuration for each affected proxy
4. Sends the configuration over the gRPC connection to each proxy

Check connected proxies and their xDS sync state:

```bash
istioctl proxy-status
```

Output example:

```text
NAME                          CLUSTER        CDS        LDS        EDS        RDS        ECDS
productpage-v1-abc123.default Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED     NOT SENT
reviews-v1-def456.default     Kubernetes     SYNCED     SYNCED     SYNCED     SYNCED     NOT SENT
```

`SYNCED` means the proxy has received the latest configuration. `STALE` means a push is pending or failed.

## Certificate Authority

The built-in CA (formerly Citadel) handles workload identity in the mesh. Every sidecar gets a SPIFFE identity certificate that is used for mTLS.

The process works like this:

1. When a sidecar starts, the pilot-agent process generates a CSR (Certificate Signing Request)
2. The CSR is sent to istiod over the SDS (Secret Discovery Service) connection
3. Istiod signs the certificate using its CA key
4. The signed certificate is sent back to the sidecar
5. Certificates are rotated automatically before expiration

Check CA status:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | grep citadel
```

Key metrics:
- `citadel_server_csr_count`: Total CSRs processed
- `citadel_server_success_cert_issuance_count`: Successful certificate issuances
- `citadel_server_csr_sign_error_count`: CSR signing errors

## Injection Webhook

The injection webhook is an HTTP handler within istiod that responds to Kubernetes MutatingAdmissionWebhook requests. When a pod is created in an injection-enabled namespace, the Kubernetes API server sends the pod spec to istiod's `/inject` endpoint.

Istiod then:
1. Reads the injection template from the `istio-sidecar-injector` ConfigMap
2. Renders the template with the pod's metadata and mesh configuration
3. Returns a JSON patch that adds the sidecar container, init container, and volumes

The webhook handler runs on port 443 (the webhook service port) and shares the same TLS certificate infrastructure as the rest of istiod.

## Internal Communication Flow

Here is how a typical configuration change flows through istiod:

1. You apply a VirtualService: `kubectl apply -f my-vs.yaml`
2. The Kubernetes API server stores the resource in etcd
3. Istiod's Config Controller receives a watch event
4. The Config Controller converts the VirtualService to the internal model
5. The Config Controller notifies the xDS server of the change
6. The xDS server debounces the notification (waits briefly for more changes to batch)
7. The xDS server generates new RDS (route) configuration for affected proxies
8. The new configuration is pushed to connected Envoy proxies over gRPC
9. Envoy applies the new routes

The total time from `kubectl apply` to Envoy applying the new config is typically 1-5 seconds for a healthy control plane.

## Debug Endpoints

Istiod exposes several debug endpoints on port 15014:

```bash
# List all debug endpoints
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug

# View the Envoy config for a specific proxy
kubectl exec -n istio-system deploy/istiod -- curl -s 'localhost:15014/debug/config_dump?proxyID=productpage-v1-abc123.default'

# View all xDS connections
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/connections

# View push status
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/push_status

# View sync status
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/syncz
```

These are invaluable for debugging. The `/debug/config_dump` endpoint shows you exactly what configuration istiod has generated for a specific proxy, which you can compare with what the proxy actually has.

## Resource Scaling Characteristics

Each subsystem has different scaling characteristics:

- **Config Controller**: Memory scales with the number of Istio custom resources. CPU spikes during batch changes.
- **Service Discovery**: Memory scales with the number of services and endpoints. In large clusters, endpoint watches can generate significant event volume.
- **xDS Server**: CPU and memory scale with the number of connected proxies and the size of the configuration. More proxies mean more push work.
- **Certificate Authority**: Scales with certificate rotation rate. Typically low overhead unless you have very short certificate TTLs.

For most deployments, the xDS server is the bottleneck. If you have 1000+ proxies, istiod spends most of its time generating and pushing xDS configuration.

Understanding these internals helps you make better decisions about istiod sizing, troubleshoot slow configuration propagation, and know where to look when things go wrong.
