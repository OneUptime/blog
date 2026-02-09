# How to Deploy Istio Ambient Mesh with Ztunnel for Sidecarless mTLS in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Kubernetes, mTLS, Zero Trust

Description: Learn how to deploy Istio Ambient Mesh with ztunnel proxies to achieve sidecarless mutual TLS encryption in Kubernetes, reducing resource overhead while maintaining security and observability.

---

Istio traditionally deploys a sidecar proxy alongside each application pod, which adds resource overhead and complexity. Ambient Mesh introduces a new deployment model using ztunnel (zero-trust tunnel) that provides Layer 4 security without sidecars. This guide shows you how to deploy and use Ambient Mesh in Kubernetes.

## Understanding Ambient Mesh Architecture

Ambient Mesh splits the data plane into two layers. The secure overlay layer handles mTLS, telemetry, and basic routing at Layer 4 using ztunnel proxies. The Layer 7 processing layer uses waypoint proxies only when you need advanced traffic management like header manipulation or complex routing rules.

Ztunnel runs as a DaemonSet on each node, handling traffic for all pods on that node. This shared infrastructure approach dramatically reduces resource consumption compared to per-pod sidecars. Applications don't need injection or modification to join the mesh.

The key benefit is incremental adoption. You can add namespaces to the mesh without changing deployments. Layer 4 features work immediately. Layer 7 features activate only when you deploy waypoint proxies for specific services.

## Prerequisites

You need a Kubernetes cluster with kubectl access. Ambient Mesh requires Istio 1.18 or later. Check the Kubernetes version is 1.24 or newer:

```bash
kubectl version --short
```

Make sure your cluster has CNI plugin support. Ambient Mesh uses native Kubernetes networking capabilities and requires a compatible CNI like Cilium, Calico, or the default CNI.

## Installing Istio with Ambient Profile

Install Istio using the ambient profile. This configures the control plane for ambient mesh mode and deploys ztunnel:

```bash
# Download Istio 1.20 or later
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -

cd istio-1.20.0
export PATH=$PWD/bin:$PATH

# Install with ambient profile
istioctl install --set profile=ambient --skip-confirmation
```

The ambient profile installs these components:

- Istiod control plane
- Ztunnel DaemonSet for secure overlay
- CNI plugin for transparent traffic interception

Verify the installation:

```bash
kubectl get pods -n istio-system
```

You should see istiod running and ztunnel pods on each node:

```bash
kubectl get daemonset -n istio-system ztunnel
```

## Adding a Namespace to Ambient Mesh

Enable ambient mesh for a namespace by adding a label. No need to modify deployments or restart pods:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

Check the label is set:

```bash
kubectl get namespace default -o jsonpath='{.metadata.labels}'
```

Deploy a sample application to test:

```yaml
# sleep-app.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sleep
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sleep
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sleep
  template:
    metadata:
      labels:
        app: sleep
    spec:
      serviceAccountName: sleep
      containers:
      - name: sleep
        image: curlimages/curl:latest
        command: ["/bin/sleep", "infinity"]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  namespace: default
spec:
  selector:
    app: httpbin
  ports:
  - port: 8000
    targetPort: 80
```

```bash
kubectl apply -f sleep-app.yaml
```

Notice the pods have no sidecars. Check the pod containers:

```bash
kubectl get pod -l app=httpbin -o jsonpath='{.items[0].spec.containers[*].name}'
```

You'll see only the application container, no istio-proxy sidecar.

## Verifying mTLS Encryption with Ztunnel

Even without sidecars, traffic between pods uses mTLS automatically. Ztunnel intercepts traffic at the node level and encrypts it.

Test connectivity:

```bash
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get
```

The request succeeds. Check if mTLS is active using istioctl:

```bash
istioctl x ztunnel-config workload
```

This shows all workloads managed by ztunnel with their identity and mTLS status.

Check the certificates used:

```bash
kubectl exec -n istio-system daemonset/ztunnel -- pilot-agent request GET /debug/pprof/certificates
```

You'll see certificates issued by the Istio CA for workload identities.

## Examining Ztunnel Telemetry

Ztunnel collects Layer 4 metrics automatically. Query Prometheus for basic metrics:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

Query for connection metrics:

```promql
# Active connections through ztunnel
istio_tcp_connections_opened_total

# Bytes sent between workloads
sum by (source_workload, destination_workload) (
  rate(istio_tcp_sent_bytes_total[5m])
)
```

These metrics work without any changes to your application. Ztunnel provides observability at the network layer.

## Configuring Authorization Policies in Ambient Mode

Apply authorization policies to control traffic between services. These work at Layer 4 using ztunnel:

```yaml
# authz-policy.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: httpbin-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/sleep"]
    to:
    - operation:
        ports: ["8000"]
```

```bash
kubectl apply -f authz-policy.yaml
```

This policy allows only the sleep service account to access httpbin on port 8000. Test from the sleep pod:

```bash
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get
```

This succeeds because sleep has the correct identity. Create a different pod without the sleep service account:

```bash
kubectl run test-pod --image=curlimages/curl:latest --rm -it -- sh
curl http://httpbin:8000/get
```

This fails with a connection reset because the test pod's identity isn't allowed by the policy. Ztunnel enforces this at Layer 4 before the request reaches httpbin.

## Understanding When You Need Waypoint Proxies

Ztunnel handles Layer 4 features like mTLS, basic telemetry, and authorization. For Layer 7 features, you need waypoint proxies. These include:

- HTTP header-based routing
- Traffic splitting by percentage
- Request timeouts and retries
- Circuit breakers
- Header manipulation
- Fault injection

Waypoint proxies are deployed per service account or namespace, not per pod. This keeps the deployment lighter than sidecar mode while still providing full Layer 7 capabilities when needed.

## Monitoring Ztunnel Performance

Check ztunnel resource usage to see the efficiency gains:

```bash
kubectl top pods -n istio-system -l app=ztunnel
```

Compare this to sidecar mode where each pod would have its own proxy consuming memory and CPU. With ztunnel, one proxy per node handles all pod traffic on that node.

Check ztunnel logs for troubleshooting:

```bash
# Get ztunnel pod name
ZTUNNEL_POD=$(kubectl get pod -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}')

# View logs
kubectl logs -n istio-system $ZTUNNEL_POD --tail=100
```

## Comparing Resource Usage: Ambient vs Sidecar

Let's measure the resource difference. First, check current usage with ambient:

```bash
kubectl top nodes
kubectl top pods -n default
```

Now deploy the same application with sidecar injection in a different namespace:

```bash
kubectl create namespace sidecar-test
kubectl label namespace sidecar-test istio-injection=enabled

kubectl apply -f sleep-app.yaml -n sidecar-test
```

Check resource usage with sidecars:

```bash
kubectl top pods -n sidecar-test
```

Each pod now has an istio-proxy container consuming additional memory (typically 50-100MB) and CPU. Multiply this by the number of pods in your cluster to see the total overhead savings with ambient mode.

## Enabling Ambient Mesh for Specific Workloads Only

Instead of enabling ambient for an entire namespace, you can enable it for specific pods using labels:

```yaml
# deployment-ambient-selective.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin-ambient
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: httpbin-ambient
  template:
    metadata:
      labels:
        app: httpbin-ambient
        istio.io/dataplane-mode: ambient
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin:latest
        ports:
        - containerPort: 80
```

This gives you granular control over which workloads participate in the mesh.

## Transitioning from Sidecar to Ambient Mode

To migrate an existing sidecar deployment to ambient, follow these steps:

1. Remove the sidecar injection label from the namespace:

```bash
kubectl label namespace default istio-injection-
```

2. Add the ambient label:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

3. Roll out the deployments to remove sidecars:

```bash
kubectl rollout restart deployment -n default
```

Pods restart without sidecars. Ztunnel automatically handles their traffic. Test thoroughly to ensure all features work as expected.

## Troubleshooting Ambient Mesh

If pods can't communicate, check ztunnel status:

```bash
istioctl x ztunnel-config workload | grep <pod-name>
```

Verify the namespace label is set correctly:

```bash
kubectl get namespace default -o yaml | grep istio.io/dataplane-mode
```

Check ztunnel logs for errors:

```bash
kubectl logs -n istio-system daemonset/ztunnel --tail=50
```

Ensure your CNI plugin is compatible. Some older CNI versions don't work with ambient mode. Check the Istio compatibility matrix.

## Understanding Ztunnel's Traffic Interception

Ztunnel uses the Istio CNI plugin to redirect traffic. Unlike sidecar mode which uses iptables in each pod, ambient mode intercepts traffic at the node level using eBPF or iptables.

Check the CNI configuration:

```bash
kubectl get configmap -n kube-system istio-cni-config -o yaml
```

The CNI plugin identifies pods in ambient namespaces and configures the network to route their traffic through ztunnel.

## Conclusion

Istio Ambient Mesh with ztunnel provides sidecarless service mesh capabilities with significantly lower resource overhead. Layer 4 features like mTLS, basic observability, and authorization work automatically when you add a namespace label.

Ztunnel runs as a shared DaemonSet handling traffic for all pods on a node. This architecture eliminates the per-pod proxy overhead while maintaining security and observability. Applications join the mesh without modification or restarts.

For Layer 7 features, you'll add waypoint proxies which we'll cover in the next guide. The two-layer architecture gives you flexibility to use only the features you need, keeping resource consumption minimal.

Start by enabling ambient for a single namespace and testing your workloads. Once comfortable, expand to more namespaces and take advantage of the significant resource savings ambient mode provides.
