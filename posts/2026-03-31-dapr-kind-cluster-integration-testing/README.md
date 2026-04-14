# How to Use Kind Cluster for Dapr Integration Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Kind, Kubernetes, Integration Test

Description: Use a Kind (Kubernetes in Docker) cluster to run Dapr integration tests in a real Kubernetes environment locally without needing a cloud cluster.

---

Kind (Kubernetes in Docker) creates a real Kubernetes cluster inside Docker containers. Testing Dapr applications on Kind gives you confidence that your Kubernetes-specific configuration - annotations, RBAC, namespaces, and CRDs - is correct before pushing to a cloud cluster.

## Install Kind and Set Up the Cluster

```bash
# Install Kind
brew install kind

# Create a cluster with a custom config
kind create cluster --name dapr-test --config kind-config.yaml
```

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
```

## Install Dapr on Kind

```bash
# Point kubectl to the Kind cluster
kubectl cluster-info --context kind-dapr-test

# Install Dapr
dapr init -k --wait

# Verify Dapr control plane is running
dapr status -k
```

## Deploy Redis for State and Pub/Sub

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install redis bitnami/redis \
  --set auth.enabled=false \
  --namespace default \
  --wait
```

## Load Local Images into Kind

Kind nodes run their own containerd runtime, separate from your local Docker daemon. Locally built images are not available inside the cluster unless you load them explicitly:

```bash
docker build -t my-app:test .
kind load docker-image my-app:test --name dapr-test
```

## Deploy Test Application

```bash
# Apply components
kubectl apply -f k8s/components/

# Deploy the application
kubectl apply -f k8s/deployment.yaml

# Wait for it to be ready
kubectl rollout status deployment/my-app
```

## Run Integration Tests Against the Kind Cluster

Port-forward the Dapr sidecar to run tests from your local machine:

```bash
kubectl port-forward deployment/my-app 3500:3500 &
```

Then run your test suite:

```bash
go test ./tests/integration/... -v -timeout 300s
```

## Run Tests Inside the Cluster

Alternatively, deploy a test runner as a Kubernetes Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: integration-tests
spec:
  template:
    spec:
      containers:
        - name: test-runner
          image: my-app:test
          command: ["go", "test", "./tests/integration/...", "-v"]
      restartPolicy: Never
  backoffLimit: 0
```

```bash
kubectl apply -f k8s/test-job.yaml
kubectl wait --for=condition=complete job/integration-tests --timeout=300s
kubectl logs job/integration-tests
```

## Cleanup

```bash
kind delete cluster --name dapr-test
```

## CI Pipeline Example

```yaml
# .github/workflows/kind-tests.yml
jobs:
  kind-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: engineerd/setup-kind@v0.6.2
        with:
          version: v0.23.0
      - name: Install Dapr CLI
        run: wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash
      - name: Install Dapr
        run: dapr init -k --wait
      - name: Run integration tests
        run: go test ./tests/integration/... -v -timeout 300s
```

## Summary

Kind clusters provide a real Kubernetes environment for Dapr integration testing without cloud costs. By loading local images, deploying actual Kubernetes resources, and running tests inside the cluster, you catch Kubernetes-specific issues before they reach your staging or production cluster.
