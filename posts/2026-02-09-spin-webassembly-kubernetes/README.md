# How to Set Up Spin and WebAssembly Container Runtime for Kubernetes Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, WebAssembly, Cloud Native

Description: Learn how to configure Spin WebAssembly runtime in Kubernetes to run lightweight, fast-starting WASM workloads alongside traditional containers for improved efficiency.

---

WebAssembly is transforming cloud-native computing by offering near-native performance with significantly smaller footprints than traditional containers. Spin, developed by Fermyon, provides a WebAssembly runtime specifically designed for microservices and serverless workloads. Running Spin applications in Kubernetes combines the orchestration benefits of Kubernetes with the efficiency of WebAssembly.

This guide demonstrates how to configure the containerd-shim-spin runtime to run Spin applications in Kubernetes, deploy WASM workloads, and integrate them with your existing infrastructure.

## Understanding Spin and WebAssembly Benefits

Traditional container images include a full operating system, runtime dependencies, and application code. A typical Node.js container might be 200MB or larger. Spin WASM applications package only the compiled WebAssembly binary and minimal runtime requirements, often under 10MB.

Startup times improve dramatically. While traditional containers take hundreds of milliseconds to start, WASM modules initialize in single-digit milliseconds. This enables true serverless-style scaling where you spin up instances on demand without noticeable latency.

Memory usage drops proportionally. A dozen Spin instances might consume less memory than a single traditional container running the same application logic. This density improvement allows more workloads per node.

## Installing containerd-shim-spin

The containerd-shim-spin provides the bridge between containerd and Spin applications. Install it on each Kubernetes node that will run Spin workloads.

```bash
# Install containerd-shim-spin

curl -fsSL https://github.com/spinframework/containerd-shim-spin/releases/download/v0.24.0/containerd-shim-spin-v2-linux-x86_64.tar.gz \
  -o containerd-shim-spin.tar.gz

# Extract binaries
sudo tar -C /usr/local/bin -xzf containerd-shim-spin.tar.gz

# Verify installation
containerd-shim-spin-v2 --version
```

Runwasi-based shims are available for multiple WASM runtimes. We'll focus on the Spin runtime, but the same Kubernetes RuntimeClass pattern works for other WebAssembly engines like Wasmtime or WasmEdge when their own shims are installed.

## Configuring containerd for Spin Runtime

Update containerd configuration to register the Spin runtime handler. On containerd 1.x, edit `/etc/containerd/config.toml` to add the new runtime.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".containerd]
  default_runtime_name = "runc"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.spin]
  runtime_type = "io.containerd.spin.v2"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.spin.options]
    SystemdCgroup = true
```

On containerd 2.x, use the updated CRI plugin path.

```toml
[plugins."io.containerd.cri.v1.runtime".containerd.runtimes.spin]
  runtime_type = "io.containerd.spin.v2"
  [plugins."io.containerd.cri.v1.runtime".containerd.runtimes.spin.options]
    SystemdCgroup = true
```

Restart containerd to load the new runtime configuration.

```bash
sudo systemctl restart containerd

# Verify Spin runtime is available
sudo crictl info | jq '.config.containerd.runtimes'
```

The output should show both runc and spin as available runtimes.

## Creating a RuntimeClass for Spin Workloads

Define a RuntimeClass resource that Kubernetes workloads can reference to use the Spin runtime.

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: wasmtime-spin-v2
handler: spin
scheduling:
  nodeSelector:
    wasm-enabled: "true"
```

Apply this configuration and label appropriate nodes.

```bash
kubectl apply -f spin-runtimeclass.yaml

# Label nodes with WASM support
kubectl label nodes worker-1 wasm-enabled=true
kubectl label nodes worker-2 wasm-enabled=true

# Verify RuntimeClass
kubectl get runtimeclass wasmtime-spin-v2
```

The nodeSelector ensures pods only schedule on nodes with the WASM shim installed.

## Building a Spin Application

Create a simple HTTP service with Spin. Install the Spin CLI first if you haven't already.

```bash
# Install Spin CLI
curl -fsSL https://spinframework.dev/downloads/install.sh | bash
sudo mv spin /usr/local/bin/

# Create a new Spin application
spin new -t http-rust my-spin-app
cd my-spin-app
```

This generates a basic Rust HTTP handler. Modify `src/lib.rs` to implement your application logic.

```rust
use spin_sdk::http::{IntoResponse, Request, Response};
use spin_sdk::http_service;

#[http_service]
async fn handle_request(_req: Request) -> anyhow::Result<impl IntoResponse> {
    Ok(Response::builder()
        .status(200)
        .header("content-type", "application/json")
        .body(r#"{"message": "Hello from Spin on Kubernetes!", "version": "1.0"}"#.to_string()))
}
```

Build the Spin application.

```bash
# Build the WASM module
spin build

# Test locally
spin up

# In another terminal, test the endpoint
curl http://localhost:3000
# {"message": "Hello from Spin on Kubernetes!", "version": "1.0"}
```

## Packaging Spin Applications as OCI Images

Spin applications must be packaged as OCI-compatible artifacts to run in Kubernetes. Use the Spin registry commands to push to your container registry.

```bash
# Log in if your registry requires authentication
spin registry login myregistry.io

# Build and push to registry
spin registry push myregistry.io/my-spin-app:v1.0

# Verify the image
spin registry pull myregistry.io/my-spin-app:v1.0
```

The resulting OCI artifact contains the WASM binary and Spin manifest. Notice the artifact size compared to traditional containers.

```bash
# Check image size
crane manifest myregistry.io/my-spin-app:v1.0 | jq '.layers[].size'
# 4382712
```

## Deploying Spin Applications to Kubernetes

Create a deployment manifest that references the Spin RuntimeClass.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spin-hello
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spin-hello
  template:
    metadata:
      labels:
        app: spin-hello
    spec:
      runtimeClassName: wasmtime-spin-v2
      containers:
      - name: spin-app
        image: myregistry.io/my-spin-app:v1.0
        command: ["/"]
        ports:
        - containerPort: 80
          name: http
        resources:
          requests:
            memory: "8Mi"
            cpu: "10m"
          limits:
            memory: "16Mi"
            cpu: "50m"
---
apiVersion: v1
kind: Service
metadata:
  name: spin-hello
  labels:
    app: spin-hello
spec:
  selector:
    app: spin-hello
  ports:
  - protocol: TCP
    port: 80
    targetPort: http
  type: ClusterIP
```

Deploy the application and verify it's running.

```bash
kubectl apply -f spin-deployment.yaml

# Check pod status
kubectl get pods -l app=spin-hello

# View pod details
kubectl describe pod -l app=spin-hello

# Test the service
kubectl run curl --image=curlimages/curl -it --rm --restart=Never -- \
  curl http://spin-hello
```

The pods start almost instantly compared to traditional containers. Check the startup time in pod events.

## Configuring Ingress for Spin Services

Expose your Spin application through an Ingress controller just like any other Kubernetes service.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: spin-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: spin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: spin-hello
            port:
              number: 80
```

Apply the Ingress configuration.

```bash
kubectl apply -f spin-ingress.yaml

# Test external access
curl http://spin.example.com
```

## Implementing Horizontal Pod Autoscaling for WASM Workloads

Spin applications scale efficiently due to their low resource footprint. Configure HPA to take advantage of this.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spin-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spin-hello
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
    scaleDown:
      stabilizationWindowSeconds: 30
```

The rapid startup times of WASM allow aggressive scale-up policies without worrying about slow pod initialization.

```bash
kubectl apply -f spin-hpa.yaml

# Generate load to test autoscaling
kubectl run load-generator --image=busybox -- \
  /bin/sh -c "while true; do wget -q -O- http://spin-hello; done"

# Watch autoscaling in action
kubectl get hpa spin-hpa -w
```

## Mixing Traditional and WASM Workloads

Run WASM and traditional containers side-by-side in the same cluster. Create a hybrid deployment where a traditional container handles complex operations and Spin handles high-frequency, lightweight requests.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hybrid-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hybrid
  template:
    metadata:
      labels:
        app: hybrid
    spec:
      containers:
      - name: api-gateway
        image: myregistry.io/gateway:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPIN_SERVICE_URL
          value: "http://spin-hello"
```

The traditional container calls the Spin service for operations that benefit from WASM's performance characteristics.

## Monitoring Spin Application Performance

Track key metrics for your WASM workloads. If your Spin application exposes a Prometheus metrics endpoint, a ServiceMonitor can scrape it through the Kubernetes Service.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: spin-metrics
spec:
  selector:
    matchLabels:
      app: spin-hello
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
```

Create a Grafana dashboard to visualize startup times, request latency, and memory usage. Compare these metrics against traditional container workloads to quantify the benefits.

```bash
# Query pod startup time
kubectl get pods -l app=spin-hello -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.startTime}{"\t"}{.status.conditions[?(@.type=="Ready")].lastTransitionTime}{"\n"}{end}'
```

Spin and WebAssembly bring significant efficiency improvements to Kubernetes workloads. The combination of millisecond-scale startup times, minimal memory footprint, and compatibility with standard Kubernetes tooling makes WASM an excellent choice for microservices, edge computing, and serverless-style architectures. By running Spin alongside traditional containers, you can optimize resource utilization while maintaining flexibility for workloads that require full OS capabilities.
