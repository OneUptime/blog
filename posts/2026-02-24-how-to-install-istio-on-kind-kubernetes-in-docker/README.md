# How to Install Istio on kind (Kubernetes in Docker)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, kind, Kubernetes, Docker, Local Development, Service Mesh

Description: How to get Istio running on kind clusters for fast local development and CI pipeline testing with Docker-based Kubernetes.

---

kind (Kubernetes in Docker) runs entire Kubernetes clusters inside Docker containers. It's fast to spin up, lightweight on resources, and works the same across macOS, Linux, and Windows. For Istio development and CI pipelines, kind is one of the best options out there because you can create and destroy clusters in seconds.

The setup is a little different from a regular Kubernetes cluster since kind doesn't have a cloud load balancer. But once you know the tricks, it works really well.

## Prerequisites

- Docker installed and running
- kind installed (v0.20+)
- kubectl
- istioctl

Install kind if you haven't:

```bash
# macOS
brew install kind

# Linux
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.24.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

## Step 1: Create a kind Cluster

For Istio, you need a cluster with some extra configuration. Create a config file that maps ports for the ingress gateway:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: 80
        protocol: TCP
      - containerPort: 30443
        hostPort: 443
        protocol: TCP
  - role: worker
  - role: worker
```

This maps host ports 80 and 443 to NodePorts on the control plane node. Create the cluster:

```bash
kind create cluster --name istio-testing --config kind-config.yaml
```

It takes about 30 seconds. Verify:

```bash
kubectl cluster-info --context kind-istio-testing
kubectl get nodes
```

## Step 2: Install Istio

Download Istio and install with the demo profile:

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

```bash
istioctl install --set profile=demo -y
```

Check the pods:

```bash
kubectl get pods -n istio-system
```

## Step 3: Configure NodePort Access

Since kind doesn't support LoadBalancer services natively, you need to change the ingress gateway to use NodePort with the specific ports you mapped in the kind config:

```bash
kubectl patch svc istio-ingressgateway -n istio-system \
  --type='json' \
  -p='[
    {"op": "replace", "path": "/spec/type", "value": "NodePort"},
    {"op": "replace", "path": "/spec/ports/0/nodePort", "value": 30080},
    {"op": "replace", "path": "/spec/ports/1/nodePort", "value": 30443}
  ]'
```

Now traffic to localhost:80 on your machine reaches the Istio ingress gateway.

Alternatively, you can set this during Istio installation:

```yaml
# istio-kind.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: demo
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            type: NodePort
            ports:
              - name: http2
                port: 80
                targetPort: 8080
                nodePort: 30080
              - name: https
                port: 443
                targetPort: 8443
                nodePort: 30443
```

```bash
istioctl install -f istio-kind.yaml -y
```

## Step 4: Deploy and Test

Enable injection and deploy the sample app:

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
```

Wait for pods:

```bash
kubectl get pods -w
```

Apply the gateway:

```bash
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Test it:

```bash
curl http://localhost/productpage
```

If the port mapping is set up correctly, you should see the Bookinfo product page HTML.

## Using MetalLB for LoadBalancer Support

If you want proper LoadBalancer support (so you don't have to mess with NodePorts), install MetalLB:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.8/config/manifests/metallb-native.yaml
```

Wait for MetalLB to be ready:

```bash
kubectl wait --namespace metallb-system \
  --for=condition=ready pod \
  --selector=app=metallb \
  --timeout=90s
```

Find the Docker network CIDR that kind uses:

```bash
docker network inspect -f '{{.IPAM.Config}}' kind
```

This gives you something like `172.18.0.0/16`. Create an IP address pool from that range:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: kind-pool
  namespace: metallb-system
spec:
  addresses:
    - 172.18.255.200-172.18.255.250
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: kind-l2
  namespace: metallb-system
```

```bash
kubectl apply -f metallb-config.yaml
```

Now the Istio ingress gateway gets a real external IP:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

## Loading Local Docker Images

When developing locally, you often want to test your own Docker images. kind requires you to load images into the cluster:

```bash
docker build -t my-app:latest .
kind load docker-image my-app:latest --name istio-testing
```

Then deploy your app. The sidecar gets injected automatically:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 8080
```

The `imagePullPolicy: Never` tells Kubernetes to use the locally loaded image.

## Using kind for CI Pipelines

kind is perfect for running Istio integration tests in CI. Here's a basic GitHub Actions workflow:

```yaml
name: Istio Integration Tests
on: push

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create kind cluster
        uses: helm/kind-action@v1
        with:
          cluster_name: test-cluster

      - name: Install Istio
        run: |
          curl -L https://istio.io/downloadIstio | sh -
          cd istio-*
          export PATH=$PWD/bin:$PATH
          istioctl install --set profile=demo -y
          kubectl label namespace default istio-injection=enabled

      - name: Run tests
        run: |
          kubectl apply -f k8s/
          kubectl wait --for=condition=ready pod -l app=my-app --timeout=120s
          # Run your tests here
```

## Multi-Node Clusters

For testing Istio features that depend on node topology (like locality-aware routing), create a multi-node cluster:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
  - role: worker
```

You can even label nodes to simulate different zones:

```bash
kubectl label node istio-testing-worker topology.kubernetes.io/zone=us-east-1a
kubectl label node istio-testing-worker2 topology.kubernetes.io/zone=us-east-1b
kubectl label node istio-testing-worker3 topology.kubernetes.io/zone=us-east-1c
```

## Cleaning Up

Delete the entire cluster:

```bash
kind delete cluster --name istio-testing
```

This removes everything instantly. That's one of kind's biggest advantages - you can blow away the whole environment and recreate it in under a minute.

kind and Istio make a great combination for fast iteration during development. You get a full Kubernetes environment with a working service mesh, all running inside Docker containers on your local machine.
