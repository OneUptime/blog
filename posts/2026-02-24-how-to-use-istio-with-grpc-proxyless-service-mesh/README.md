# How to Use Istio with gRPC Proxyless Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GRPC, Proxyless, XDS, Kubernetes, Service Mesh

Description: How to use gRPC proxyless service mesh with Istio to get service mesh features without the sidecar proxy overhead for gRPC services.

---

Istio's sidecar proxy model works well for most services, but gRPC applications have an alternative. gRPC has native support for the xDS protocol, which is the same protocol that Envoy uses to receive configuration from the Istio control plane. This means gRPC applications can talk directly to istiod and get service discovery, load balancing, and routing without needing a sidecar proxy at all.

This is called "proxyless gRPC" or "proxyless service mesh," and it eliminates the latency overhead and resource consumption of the sidecar for gRPC workloads.

## How Proxyless gRPC Works

In the standard Istio model:
- Your gRPC app sends a request
- The sidecar proxy intercepts it
- The sidecar handles service discovery, load balancing, and routing
- The sidecar forwards the request to the destination's sidecar
- The destination's sidecar forwards it to the application

In proxyless mode:
- Your gRPC app connects to istiod via xDS
- istiod sends service discovery and routing configuration directly to your app
- Your gRPC app handles load balancing and routing internally
- The request goes directly from your app to the destination

No sidecar proxy is involved. The gRPC library itself acts as the data plane.

## Setting Up Proxyless gRPC

### Step 1: Configure Istio

Make sure istiod is configured to serve xDS to proxyless gRPC clients. This is enabled by default in recent Istio versions.

```bash
# Verify istiod is running
kubectl get pods -n istio-system -l app=istiod

# Check that the gRPC xDS port is exposed
kubectl get svc istiod -n istio-system -o yaml | grep 15010
```

Port 15010 is the plaintext xDS port, and port 15012 is the TLS xDS port. Proxyless gRPC clients connect to one of these.

### Step 2: Create a gRPC Server

Your gRPC server needs to register with Istio. Use the Istio-compatible bootstrap configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-server
  namespace: grpc-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grpc-server
  template:
    metadata:
      labels:
        app: grpc-server
      annotations:
        inject.istio.io/templates: grpc-agent
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: grpc-server
        image: my-grpc-server:latest
        ports:
        - containerPort: 50051
          name: grpc-api
        env:
        - name: GRPC_XDS_BOOTSTRAP
          value: /etc/istio/proxy/grpc-bootstrap.json
```

The `inject.istio.io/templates: grpc-agent` annotation tells Istio to inject a lightweight agent instead of the full Envoy sidecar. This agent generates the xDS bootstrap configuration and handles certificate management.

### Step 3: Create the Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: grpc-server
  namespace: grpc-app
spec:
  ports:
  - name: grpc-api
    port: 50051
    targetPort: 50051
  selector:
    app: grpc-server
```

### Step 4: Configure the gRPC Client

The gRPC client needs to use the xDS resolver to discover the server. Instead of connecting directly to a hostname, use the `xds:///` scheme:

For a Go gRPC client:

```go
package main

import (
    "context"
    "log"
    "os"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    _ "google.golang.org/grpc/xds" // Import xDS resolver

    pb "my-project/proto"
)

func main() {
    // Use xds:/// scheme for proxyless service mesh
    target := "xds:///grpc-server.grpc-app.svc.cluster.local:50051"

    conn, err := grpc.Dial(target,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer conn.Close()

    client := pb.NewMyServiceClient(conn)

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    resp, err := client.MyMethod(ctx, &pb.MyRequest{})
    if err != nil {
        log.Fatalf("RPC failed: %v", err)
    }
    log.Printf("Response: %v", resp)
}
```

For a Java gRPC client:

```java
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;
import io.grpc.xds.XdsChannelCredentials;

// Use xds:/// scheme
String target = "xds:///grpc-server.grpc-app.svc.cluster.local:50051";

ManagedChannel channel = ManagedChannelBuilder
    .forTarget(target)
    .usePlaintext()
    .build();
```

Deploy the client with the grpc-agent template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-client
  namespace: grpc-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grpc-client
  template:
    metadata:
      labels:
        app: grpc-client
      annotations:
        inject.istio.io/templates: grpc-agent
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: grpc-client
        image: my-grpc-client:latest
        env:
        - name: GRPC_XDS_BOOTSTRAP
          value: /etc/istio/proxy/grpc-bootstrap.json
```

## Features Available in Proxyless Mode

Not all Istio features work in proxyless mode. Here is what is supported:

### Service Discovery

The gRPC client automatically discovers endpoints through xDS. No manual configuration needed.

### Client-Side Load Balancing

gRPC performs load balancing at the client side, distributing requests across all available server endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-server
  namespace: grpc-app
spec:
  host: grpc-server
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN  # Works with proxyless gRPC
```

### Traffic Routing

VirtualService routing works for proxyless gRPC:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-server
  namespace: grpc-app
spec:
  hosts:
  - grpc-server
  http:
  - match:
    - headers:
        x-version:
          exact: "v2"
    route:
    - destination:
        host: grpc-server
        subset: v2
  - route:
    - destination:
        host: grpc-server
        subset: v1
```

### mTLS

Proxyless gRPC supports mTLS through xDS credentials. The gRPC library manages certificates using the same Istio CA as the sidecar model.

To enable mTLS in your Go client:

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/xds"
    _ "google.golang.org/grpc/xds"
)

creds, err := xds.NewClientCredentials(xds.ClientOptions{
    FallbackCreds: insecure.NewCredentials(),
})
if err != nil {
    log.Fatal(err)
}

conn, err := grpc.Dial(target, grpc.WithTransportCredentials(creds))
```

And in the server:

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/xds"
    "google.golang.org/grpc/xds"
)

creds, err := xds.NewServerCredentials(xds.ServerOptions{
    FallbackCreds: insecure.NewCredentials(),
})
if err != nil {
    log.Fatal(err)
}

server, err := xds.NewGRPCServer(grpc.Creds(creds))
```

## What Does NOT Work in Proxyless Mode

Some Istio features require the Envoy proxy and are not available in proxyless mode:

- Fault injection
- Request mirroring
- Fine-grained retry configuration (basic retries work)
- EnvoyFilter customizations
- Wasm plugins
- Access logging through Envoy

If you need these features, stick with the sidecar model for those services.

## Mixing Proxyless and Sidecar Mode

You can run some services in proxyless mode and others with sidecars in the same mesh. They communicate seamlessly because they use the same mTLS certificates and service discovery.

```yaml
# Proxyless gRPC service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
spec:
  template:
    metadata:
      annotations:
        inject.istio.io/templates: grpc-agent
        sidecar.istio.io/inject: "true"

---
# Standard sidecar service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: http-service
spec:
  template:
    metadata:
      labels:
        app: http-service
    # No special annotations, gets standard sidecar
```

## Debugging Proxyless gRPC

Debugging proxyless mode is different from debugging sidecar mode because there is no Envoy to inspect.

### Check xDS Connection

```bash
# Check the grpc-agent logs
kubectl logs my-pod -c istio-proxy --tail=50

# Look for xDS connection messages
kubectl logs my-pod -c istio-proxy | grep "xds\|ADS"
```

### Enable gRPC Debug Logging

Set environment variables on your application:

```yaml
env:
- name: GRPC_GO_LOG_VERBOSITY_LEVEL
  value: "99"
- name: GRPC_GO_LOG_SEVERITY_LEVEL
  value: "info"
```

### Check Bootstrap Configuration

```bash
# View the generated bootstrap config
kubectl exec my-pod -c istio-proxy -- cat /etc/istio/proxy/grpc-bootstrap.json
```

## Performance Benefits

The main advantage of proxyless gRPC is reduced overhead:

- No extra container per pod (just a lightweight agent for bootstrap)
- No traffic going through an additional proxy
- Lower latency (one fewer network hop per direction)
- Less CPU and memory usage per pod

Measure the actual difference:

```bash
# Run gRPC benchmarks with sidecar
ghz --insecure --proto service.proto \
  --call mypackage.MyService/MyMethod \
  -d '{"key":"value"}' \
  -c 50 -n 10000 \
  grpc-server:50051

# Run the same benchmarks with proxyless
# Compare P50, P99, and throughput
```

Proxyless gRPC is the right choice for latency-sensitive gRPC services where the overhead of the sidecar proxy is unacceptable. For services that need the full range of Istio features (fault injection, Wasm plugins, access logging), the sidecar model is still the better option. Most production environments end up using a mix of both, choosing the right mode for each service's requirements.
