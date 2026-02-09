# How to Set Up Spin and WebAssembly Container Runtime for Kubernetes Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, WebAssembly, Cloud Native

Description: Learn how to configure Spin WebAssembly runtime in Kubernetes to run lightweight, fast-starting WASM workloads alongside traditional containers for improved efficiency.

---

WebAssembly is transforming cloud-native computing by offering near-native performance with significantly smaller footprints than traditional containers. Spin, developed by Fermyon, provides a WebAssembly runtime specifically designed for microservices and serverless workloads. Running Spin applications in Kubernetes combines the orchestration benefits of Kubernetes with the efficiency of WebAssembly.

This guide demonstrates how to configure the containerd-wasm-shim to run Spin applications in Kubernetes, deploy WASM workloads, and integrate them with your existing infrastructure.

## Understanding Spin and WebAssembly Benefits

Traditional container images include a full operating system, runtime dependencies, and application code. A typical Node.js container might be 200MB or larger. Spin WASM applications package only the compiled WebAssembly binary and minimal runtime requirements, often under 10MB.

Startup times improve dramatically. While traditional containers take hundreds of milliseconds to start, WASM modules initialize in single-digit milliseconds. This enables true serverless-style scaling where you spin up instances on demand without noticeable latency.

Memory usage drops proportionally. A dozen Spin instances might consume less memory than a single traditional container running the same application logic. This density improvement allows more workloads per node.

## Installing containerd-wasm-shim

The containerd-wasm-shim provides the bridge between containerd and WebAssembly runtimes. Install it on each Kubernetes node that will run WASM workloads.

```bash
# Install containerd-wasm-shim
curl -fsSL https://github.com/containerd/runwasi/releases/download/v0.3.0/containerd-wasm-shim-v0.3.0-linux-x86_64.tar.gz \
  -o containerd-wasm-shim.tar.gz

# Extract binaries
sudo tar -C /usr/local/bin -xzf containerd-wasm-shim.tar.gz

# Verify installation
containerd-shim-spin-v1 --version
```

The shim includes support for multiple WASM runtimes. We'll focus on the Spin runtime, but the same approach works for other WebAssembly engines like Wasmtime or WasmEdge.

## Configuring containerd for Spin Runtime

Update containerd configuration to register the Spin runtime handler. Edit `/etc/containerd/config.toml` to add the new runtime.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".containerd]
  default_runtime_name = "runc"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
  runtime_type = "io.containerd.runc.v2"

[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.spin]
  runtime_type = "io.containerd.spin.v1"
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.spin.options]
    BinaryName = "/usr/local/bin/containerd-shim-spin-v1"
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
  name: wasmtime-spin
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
kubectl get runtimeclass wasmtime-spin
```

The nodeSelector ensures pods only schedule on nodes with the WASM shim installed.

## Building a Spin Application

Create a simple HTTP service with Spin. Install the Spin CLI first if you haven't already.

```bash
# Install Spin CLI
curl -fsSL https://developer.fermyon.com/downloads/install.sh | bash
sudo mv spin /usr/local/bin/

# Create a new Spin application
spin new http-rust my-spin-app
cd my-spin-app
```

This generates a basic Rust HTTP handler. Modify `src/lib.rs` to implement your application logic.

```rust
use spin_sdk::{
    http::{Request, Response},
    http_component,
};

#[http_component]
fn handle_request(req: Request) -> Result<Response> {
    Ok(http::Response::builder()
        .status(200)
        .header("content-type", "application/json")
        .body(Some(
            r#"{"message": "Hello from Spin on Kubernetes!", "version": "1.0"}"#.into()
        ))?)
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

Spin applications must be packaged as OCI-compatible container images to run in Kubernetes. Use the Spin registry plugin to push to your container registry.

```bash
# Install the registry plugin
spin plugins install registry

# Build and push to registry
spin registry push myregistry.io/my-spin-app:v1.0

# Verify the image
spin registry pull myregistry.io/my-spin-app:v1.0
```

The resulting OCI image contains the WASM binary and Spin manifest. Notice the image size compared to traditional containers.

```bash
# Check image size
docker images myregistry.io/my-spin-app:v1.0
# REPOSITORY                    TAG    SIZE
# myregistry.io/my-spin-app     v1.0   4.2MB
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
      runtimeClassName: wasmtime-spin
      containers:
      - name: spin-app
        image: myregistry.io/my-spin-app:v1.0
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

Track key metrics for your WASM workloads. Spin applications expose metrics through standard Kubernetes mechanisms.

```yaml
apiVersion: v1
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

Spin and WebAssembly bring significant efficiency improvements to Kubernetes workloads. The combination of microsecond startup times, minimal memory footprint, and compatibility with standard Kubernetes tooling makes WASM an excellent choice for microservices, edge computing, and serverless-style architectures. By running Spin alongside traditional containers, you can optimize resource utilization while maintaining flexibility for workloads that require full OS capabilities.
