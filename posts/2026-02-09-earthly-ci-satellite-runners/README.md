# How to Set Up Earthly CI Builds with Satellite Runners on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Earthly, CI/CD, Kubernetes

Description: Learn how to deploy and configure Earthly Satellite runners on Kubernetes for fast, reproducible CI builds with remote caching and distributed execution.

---

Earthly provides reproducible builds using containers and a simple Earthfile syntax. While you can run Earthly locally or in standard CI environments, Earthly Satellites take performance to the next level by providing managed remote build runners with intelligent caching and instant start times. This guide walks through deploying Earthly Satellites on your own Kubernetes cluster for self-hosted CI builds.

## Why Use Earthly Satellites on Kubernetes

Earthly Satellites offer several advantages over traditional CI runners. First, they provide instant build environments without cold start delays. Second, they maintain persistent cache layers between builds, dramatically reducing build times for incremental changes. Third, they allow you to run builds remotely while developing locally, leveraging more powerful hardware without complex setup.

Running Satellites on Kubernetes gives you additional control over infrastructure costs, security policies, and resource allocation. You can scale runners dynamically based on demand and integrate them into your existing Kubernetes monitoring and security stack.

## Prerequisites

Before starting, ensure you have the following:

- A Kubernetes cluster with at least 4 CPU cores and 8GB RAM per Satellite runner
- kubectl configured to access your cluster
- Earthly CLI installed locally (version 0.8+)
- An Earthly account (free tier works for getting started)
- Helm 3.x for deploying the Satellite operator

You'll also need cluster-admin permissions to create custom resource definitions and namespaces.

## Installing the Earthly Satellite Operator

Earthly provides a Kubernetes operator that manages Satellite lifecycle. Start by adding the Earthly Helm repository:

```bash
# Add the Earthly Helm repo
helm repo add earthly https://helm.earthly.dev
helm repo update

# Create a namespace for Earthly components
kubectl create namespace earthly-system
```

Next, obtain your Earthly organization token from the Earthly dashboard. This token allows the operator to register Satellites with your account:

```bash
# Store your token as a Kubernetes secret
kubectl create secret generic earthly-token \
  --from-literal=token=YOUR_EARTHLY_TOKEN \
  -n earthly-system
```

Now install the operator using Helm:

```bash
helm install earthly-operator earthly/earthly-operator \
  --namespace earthly-system \
  --set tokenSecret.name=earthly-token \
  --set tokenSecret.key=token
```

Verify the operator is running:

```bash
kubectl get pods -n earthly-system
# You should see earthly-operator-controller-manager running
```

## Configuring Satellite Runners

Create a Satellite custom resource to define your runner configuration. Here's a production-ready example:

```yaml
# satellite-runner.yaml
apiVersion: earthly.dev/v1alpha1
kind: Satellite
metadata:
  name: prod-satellite-01
  namespace: earthly-system
spec:
  # Number of concurrent build slots
  size: large  # small (2 builds), medium (4 builds), large (8 builds)

  # Compute resources per build slot
  resources:
    requests:
      cpu: "2"
      memory: "4Gi"
    limits:
      cpu: "4"
      memory: "8Gi"

  # Cache configuration
  cache:
    # Persistent volume for build cache
    storageClass: fast-ssd  # Use your fastest storage class
    size: 100Gi

  # Network configuration
  network:
    # Allow pulling from private registries
    imagePullSecrets:
      - name: regcred

  # Security context
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000

  # Node selector for dedicated build nodes
  nodeSelector:
    workload-type: ci-builds

  # Tolerations for tainted nodes
  tolerations:
    - key: "ci-workload"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
```

Apply the configuration:

```bash
kubectl apply -f satellite-runner.yaml

# Watch the Satellite become ready
kubectl get satellite prod-satellite-01 -n earthly-system -w
```

The operator creates a StatefulSet for the Satellite and provisions persistent volumes for caching. This process takes 2-3 minutes on first deployment.

## Connecting Local Earthly to Your Satellite

Once your Satellite is running, configure your local Earthly CLI to use it:

```bash
# List available satellites in your organization
earthly satellite ls

# Select your Kubernetes-hosted satellite
earthly satellite select prod-satellite-01

# Verify the connection
earthly satellite status
```

Now when you run Earthly builds, they execute on your Kubernetes-hosted Satellite instead of locally:

```bash
# This build runs on the satellite
earthly +build

# You'll see output indicating remote execution:
# --> Satellite prod-satellite-01: Running build...
```

## Configuring CI/CD Integration

To use Satellites in your CI pipelines, configure your CI system with Earthly credentials. Here's a GitHub Actions example:

```yaml
# .github/workflows/build.yml
name: Build with Earthly Satellite

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Earthly
        run: |
          wget https://github.com/earthly/earthly/releases/latest/download/earthly-linux-amd64 -O /usr/local/bin/earthly
          chmod +x /usr/local/bin/earthly

      - name: Configure Earthly
        env:
          EARTHLY_TOKEN: ${{ secrets.EARTHLY_TOKEN }}
          EARTHLY_SATELLITE: prod-satellite-01
        run: |
          earthly account login --token "$EARTHLY_TOKEN"
          earthly satellite select "$EARTHLY_SATELLITE"

      - name: Run build
        run: earthly --ci +build-all
```

Store your `EARTHLY_TOKEN` in GitHub Actions secrets. The token allows CI jobs to authenticate and use your Satellites.

## Optimizing Cache Performance

Satellite caching dramatically improves build performance, but proper cache key design is essential. Structure your Earthfile to maximize cache hits:

```dockerfile
# Earthfile
VERSION 0.8

# Base image layers are cached
FROM golang:1.21-alpine
WORKDIR /app

# Dependencies change infrequently - cache them separately
deps:
    COPY go.mod go.sum ./
    RUN go mod download
    SAVE ARTIFACT /go/pkg/mod AS LOCAL .go-cache

# Build target uses cached deps
build:
    FROM +deps
    COPY . .
    RUN go build -o app .
    SAVE ARTIFACT app AS LOCAL build/app

# Test target also reuses deps
test:
    FROM +deps
    COPY . .
    RUN go test ./...
```

This structure ensures dependency downloads only happen when `go.mod` changes, not on every code change.

## Monitoring Satellite Performance

Monitor your Satellites using standard Kubernetes tools. The operator exposes metrics on port 8080:

```bash
# View Satellite resource usage
kubectl top pod -n earthly-system -l app=satellite

# Check build queue depth
kubectl get satellite prod-satellite-01 -n earthly-system -o jsonpath='{.status.queueDepth}'

# View recent build logs
kubectl logs -n earthly-system -l app=satellite --tail=100
```

For production deployments, configure Prometheus to scrape Satellite metrics:

```yaml
# prometheus-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: earthly-satellite
  namespace: earthly-system
spec:
  selector:
    matchLabels:
      app: satellite
  endpoints:
    - port: metrics
      interval: 30s
```

Key metrics to monitor include build queue depth, cache hit ratio, and average build duration.

## Scaling Satellites Horizontally

For high build volume, deploy multiple Satellites and configure Earthly to distribute load:

```bash
# Deploy additional satellites
kubectl apply -f - <<EOF
apiVersion: earthly.dev/v1alpha1
kind: Satellite
metadata:
  name: prod-satellite-02
  namespace: earthly-system
spec:
  size: large
  # ... same configuration as prod-satellite-01
EOF
```

Configure round-robin selection in your CI:

```bash
# Select satellite based on build number
SATELLITE_NUM=$((GITHUB_RUN_NUMBER % 2 + 1))
earthly satellite select "prod-satellite-0${SATELLITE_NUM}"
```

This distributes builds across multiple Satellites for better resource utilization.

## Security Considerations

Satellites run Docker-in-Docker by default, which requires privileged containers. For stricter security, configure rootless mode:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  buildkitd:
    rootless: true
```

Rootless mode provides stronger isolation but has some limitations with certain build operations. Test thoroughly before deploying to production.

Also configure network policies to restrict Satellite access:

```yaml
# networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: satellite-egress
  namespace: earthly-system
spec:
  podSelector:
    matchLabels:
      app: satellite
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443  # HTTPS for image registries
    - to:
        - podSelector:
            matchLabels:
              app: earthly-operator
      ports:
        - protocol: TCP
          port: 8080
```

## Conclusion

Earthly Satellites on Kubernetes provide a powerful platform for fast, reproducible CI builds. By combining Earthly's caching intelligence with Kubernetes orchestration, you get the best of both worlds: instant build environments with persistent caching and infrastructure you fully control.

The operator-based deployment model makes it easy to scale Satellites as your build volume grows, while Kubernetes-native monitoring and security tools integrate seamlessly. For teams running substantial CI workloads, self-hosted Satellites deliver significant cost savings compared to SaaS CI runners while maintaining excellent performance.
