# How to Deploy Istio on ARM-Based Kubernetes Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ARM, Kubernetes, Service Mesh, Cloud Native

Description: A practical guide to deploying Istio service mesh on ARM-based Kubernetes clusters including AWS Graviton and Raspberry Pi nodes.

---

ARM processors have taken the cloud computing world by storm. With AWS Graviton, Ampere Altra, and Apple Silicon all pushing ARM adoption forward, running Kubernetes on ARM is no longer a niche experiment. It is a cost-effective production strategy. If you are running ARM-based nodes and want to add Istio to the mix, there are a few things you need to know before jumping in.

## Prerequisites

Before getting started, make sure you have:

- A Kubernetes cluster running on ARM64 nodes (v1.25 or later recommended)
- kubectl configured to talk to your cluster
- Helm 3.x installed
- At least 4GB of RAM available per node for Istio components

You can verify your node architecture with:

```bash
kubectl get nodes -o wide
```

Look at the ARCH column. You should see `arm64` for your ARM nodes.

## Checking Istio ARM Support

Istio has supported multi-architecture container images since version 1.15. The official images on Docker Hub and gcr.io are published as multi-arch manifests, which means the container runtime will automatically pull the correct image for your node architecture.

You can verify this yourself:

```bash
docker manifest inspect istio/pilot:1.20.0
```

You should see entries for both `linux/amd64` and `linux/arm64` in the manifest list.

## Installing Istio with istioctl

The simplest path to getting Istio running on ARM is using istioctl. First, download the appropriate binary for your platform:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
cd istio-1.20.0
export PATH=$PWD/bin:$PATH
```

If you are running the install from an ARM machine (like a Mac with Apple Silicon), istioctl will automatically download the ARM binary.

Now install Istio with the default profile:

```bash
istioctl install --set profile=default -y
```

This works because the Istio images are multi-arch. The kubelet on your ARM nodes will pull the arm64 variant automatically.

To verify everything is running:

```bash
kubectl get pods -n istio-system
```

You should see `istiod` and the ingress gateway pods in Running state.

## Installing with Helm on ARM

If you prefer Helm, the process is straightforward:

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

Install the base chart first:

```bash
helm install istio-base istio/base -n istio-system --create-namespace
```

Then install istiod:

```bash
helm install istiod istio/istiod -n istio-system --wait
```

And optionally the ingress gateway:

```bash
helm install istio-ingress istio/gateway -n istio-system
```

No special ARM-specific values are needed. The Helm charts reference the same multi-arch images.

## AWS Graviton-Specific Considerations

If you are running EKS with Graviton instances (like m7g or c7g), there are a few things worth knowing.

First, make sure your node groups are labeled correctly. EKS usually adds the `kubernetes.io/arch: arm64` label automatically, but it is good to verify:

```bash
kubectl get nodes --show-labels | grep arch
```

You might want to ensure Istio system components land on ARM nodes specifically. Use node affinity in your IstioOperator config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: kubernetes.io/arch
                  operator: In
                  values:
                  - arm64
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
              - matchExpressions:
                - key: kubernetes.io/arch
                  operator: In
                  values:
                  - arm64
```

Apply it with:

```bash
istioctl install -f graviton-istio.yaml -y
```

## Deploying a Sample Application

Once Istio is installed, enable sidecar injection for your namespace:

```bash
kubectl label namespace default istio-injection=enabled
```

Deploy a simple test application:

```yaml
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
        image: kong/httpbin:latest
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
  - port: 80
    targetPort: 80
```

Apply it and check that the sidecar gets injected:

```bash
kubectl apply -f httpbin.yaml
kubectl get pods -l app=httpbin
```

Each pod should show 2/2 containers, indicating the Envoy sidecar is running alongside your application container.

## Troubleshooting Common ARM Issues

### Image Pull Failures

If a pod fails to start with an image pull error, it is likely that one of your application images does not have an ARM variant. Check the image manifest:

```bash
docker manifest inspect your-image:tag
```

If only `linux/amd64` is listed, you need to build an ARM version or find an alternative image.

### Performance Differences

ARM and x86 have different performance characteristics. Envoy proxy on ARM generally performs well, but you might notice different CPU and memory patterns compared to x86. Monitor your resource usage after deployment:

```bash
kubectl top pods -n istio-system
```

### Init Container Issues

The `istio-init` container configures iptables rules. On some ARM distributions, the iptables binary might not be in the expected path. If you see init container crashes, check the logs:

```bash
kubectl logs <pod-name> -c istio-init
```

You can switch to Istio CNI mode to avoid iptables entirely:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
      - istio-system
      - kube-system
```

## Resource Tuning for ARM

ARM instances like Graviton often have more cores but lower per-core performance compared to equivalent x86 instances. Adjust Istio resource requests accordingly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      resources:
        requests:
          cpu: 500m
          memory: 2Gi
        limits:
          cpu: 2000m
          memory: 4Gi
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

## Verifying the Installation

Run the built-in verification:

```bash
istioctl verify-install
```

And analyze the mesh:

```bash
istioctl analyze --all-namespaces
```

Both commands should report no errors. If you see warnings about resource limits or deprecated APIs, address them before moving to production.

## Summary

Deploying Istio on ARM-based Kubernetes clusters is a well-supported path today. The multi-arch images handle the heavy lifting, and you do not need any special configuration for basic deployments. The key things to watch out for are making sure your application images also support ARM, tuning resource allocations for ARM CPU characteristics, and considering Istio CNI mode if you run into iptables compatibility issues on certain ARM Linux distributions. With Graviton and other ARM processors offering significant cost savings, running Istio on ARM is a smart move for production workloads.
