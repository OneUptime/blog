# How to Handle Multi-Architecture Istio Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Architecture, Kubernetes, DevOps, Cloud Native

Description: Complete guide to managing Istio deployments across multiple CPU architectures including CI/CD pipelines and image management.

---

When your Kubernetes cluster runs nodes with different CPU architectures, every part of your deployment pipeline needs to account for that. Istio itself handles multi-arch well, but the surrounding ecosystem of CI/CD, image building, testing, and operations requires thoughtful planning. This guide walks through the full lifecycle of managing multi-architecture Istio deployments.

## The Multi-Arch Landscape

Most organizations hit multi-arch scenarios in a few common ways:

- Migrating from x86 to ARM for cost savings (Graviton, Ampere)
- Running edge nodes on ARM alongside cloud x86 nodes
- Supporting developer laptops on Apple Silicon while production runs x86
- Mixing specialized hardware for ML workloads

Regardless of the reason, you need a consistent approach.

## Building Multi-Arch Application Images

Your Istio sidecar is multi-arch, but your application images need to be too. Use Docker buildx to create multi-platform images:

```bash
# Create a builder that supports multiple platforms
docker buildx create --name multiarch --driver docker-container --use

# Build and push multi-arch image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myregistry.io/my-service:v1.0 \
  --push .
```

Your Dockerfile might need adjustments for multi-arch builds. Use build arguments for architecture-specific packages:

```dockerfile
FROM --platform=$BUILDPLATFORM golang:1.21 AS builder
ARG TARGETARCH
ARG TARGETOS

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build -o server .

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app/server /server
ENTRYPOINT ["/server"]
```

## Istio Installation for Multi-Arch

When installing Istio in a multi-arch cluster, use the IstioOperator with topology-aware settings:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: multi-arch-mesh
spec:
  profile: default
  meshConfig:
    defaultConfig:
      concurrency: 2
  components:
    pilot:
      k8s:
        replicaCount: 2
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                  - key: app
                    operator: In
                    values:
                    - istiod
                topologyKey: kubernetes.io/arch
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        replicaCount: 2
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                  - key: app
                    operator: In
                    values:
                    - istio-ingressgateway
                topologyKey: kubernetes.io/arch
```

This configuration spreads istiod and gateway replicas across different architectures. If one architecture has issues, the other keeps serving.

Install it:

```bash
istioctl install -f multi-arch-mesh.yaml -y
```

## CI/CD Pipeline for Multi-Arch

Your CI/CD pipeline needs to handle building, testing, and deploying for multiple architectures. Here is a GitLab CI example:

```yaml
stages:
  - build
  - test
  - deploy

build-multiarch:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker buildx create --use
    - docker buildx build
        --platform linux/amd64,linux/arm64
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        --push .

test-x86:
  stage: test
  tags:
    - x86
  script:
    - kubectl apply -f k8s/test-deployment.yaml
    - kubectl wait --for=condition=available deployment/test-app --timeout=120s
    - ./run-integration-tests.sh

test-arm:
  stage: test
  tags:
    - arm64
  script:
    - kubectl apply -f k8s/test-deployment.yaml
    - kubectl wait --for=condition=available deployment/test-app --timeout=120s
    - ./run-integration-tests.sh

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/my-service app=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## Handling Architecture-Specific ConfigMaps

Sometimes your application needs architecture-specific configuration. Use Kustomize overlays for this:

```yaml
# base/kustomization.yaml
resources:
- deployment.yaml
- service.yaml
- istio-virtualservice.yaml

# overlays/arm64/kustomization.yaml
resources:
- ../../base
patchesStrategicMerge:
- deployment-patch.yaml

# overlays/arm64/deployment-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
      - name: app
        env:
        - name: WORKER_THREADS
          value: "8"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

Apply the overlay:

```bash
kubectl apply -k overlays/arm64/
```

## Canary Deployments Across Architectures

Use Istio traffic management to do canary deployments that span architectures:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
        subset: stable
      weight: 90
    - destination:
        host: my-service
        subset: canary
      weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

The stable version might run on x86 while the canary runs on ARM. Istio routes traffic based on the labels, not the architecture. Monitor the canary with:

```bash
istioctl dashboard kiali
```

## Rollback Strategies

If the ARM deployment has issues, you can quickly roll back by adjusting the VirtualService weights:

```bash
kubectl patch virtualservice my-service --type merge -p '
spec:
  http:
  - route:
    - destination:
        host: my-service
        subset: stable
      weight: 100
    - destination:
        host: my-service
        subset: canary
      weight: 0
'
```

## Monitoring Multi-Arch Deployments

Set up Prometheus queries that help you compare performance across architectures:

```bash
# Average latency by architecture
sum(rate(istio_request_duration_milliseconds_sum[5m])) by (destination_workload, node_name)
/
sum(rate(istio_request_duration_milliseconds_count[5m])) by (destination_workload, node_name)
```

Create Grafana dashboards that show latency and error rates split by node architecture. This makes it immediately visible if one architecture is underperforming.

## Handling Third-Party Images

Not all third-party images support ARM. When you hit this, you have a few options:

1. Build the image yourself from source for ARM
2. Use an alternative image that supports multi-arch
3. Pin that particular workload to x86 nodes

To pin a workload to x86:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-dependency
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/arch: amd64
      containers:
      - name: legacy
        image: some-vendor/x86-only-image:latest
```

Istio will still inject the multi-arch sidecar, so this workload participates in the mesh normally.

## Automating Architecture Detection

Create an admission webhook or use OPA/Gatekeeper to enforce multi-arch image requirements:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireMultiArch
metadata:
  name: require-multiarch-images
spec:
  match:
    kinds:
    - apiGroups: ["apps"]
      kinds: ["Deployment"]
    namespaces:
    - production
  parameters:
    requiredArchitectures:
    - amd64
    - arm64
```

This prevents deploying single-architecture images to production namespaces.

## Summary

Managing multi-architecture Istio deployments requires attention across the full pipeline: building multi-arch images, configuring Istio to spread across architectures, setting up CI/CD that tests on both platforms, and monitoring to catch architecture-specific issues. The mesh layer itself is architecture-agnostic, which makes Istio a great fit for heterogeneous environments. The work is really in your application images, your deployment pipelines, and your operational tooling. Get those right, and the multi-arch transition becomes smooth and safe.
