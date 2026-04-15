# How to Configure Dapr for CI/CD Pipeline Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CI/CD, Testing, GitHub Action, Configuration

Description: Configure Dapr in CI/CD pipelines for integration testing, component mocking, ephemeral test environments, and automated deployment to staging and production.

---

## Dapr in CI/CD Pipelines

CI/CD pipelines need Dapr configured for three distinct purposes: running integration tests with real Dapr components, deploying component configurations to Kubernetes namespaces, and validating Dapr application behavior in ephemeral test environments.

## Local Dapr in GitHub Actions

```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4

    - name: Install Dapr CLI
      run: |
        curl -fsSL https://raw.githubusercontent.com/dapr/cli/master/install/install.sh | /bin/bash
        dapr init --slim

    - name: Start Dapr sidecar for tests
      run: |
        dapr run \
          --app-id test-service \
          --dapr-http-port 3500 \
          --components-path ./test/components \
          &
        sleep 5  # Wait for sidecar to be ready

    - name: Run integration tests
      run: |
        python -m pytest tests/integration/ -v
      env:
        DAPR_HTTP_PORT: "3500"
        APP_ENV: "ci"
```

## CI Test Components

```yaml
# test/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
```

```yaml
# test/components/pubsub.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.in-memory
  version: v1
  metadata: []
```

## In-Memory Components for Fast CI

```yaml
# For unit/component tests - no external infrastructure needed
# test/components/statestore-memory.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
  metadata: []
```

## Kubernetes Deploy Job

```yaml
# .github/workflows/deploy.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging

    steps:
    - uses: actions/checkout@v4

    - name: Configure kubectl
      uses: azure/setup-kubectl@v3

    - name: Azure login
      uses: azure/login@v2
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Set AKS context
      uses: azure/aks-set-context@v3
      with:
        resource-group: ${{ secrets.AKS_RESOURCE_GROUP }}
        cluster-name: ${{ secrets.AKS_CLUSTER_NAME }}
        subscription: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

    - name: Deploy Dapr components
      run: |
        kubectl apply -f kubernetes/staging/components/ -n staging
        kubectl apply -f kubernetes/staging/config/ -n staging

    - name: Deploy application
      run: |
        # Set image tag from commit SHA
        export IMAGE_TAG=${{ github.sha }}
        envsubst < kubernetes/staging/deployments/order-service.yaml | \
          kubectl apply -f - -n staging

    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/order-service -n staging --timeout=300s

    - name: Run smoke tests
      run: |
        python tests/smoke/run_smoke_tests.py \
          --env staging \
          --base-url ${{ secrets.STAGING_URL }}
```

## Component Validation in CI

```bash
# Validate Dapr component YAML files before deployment
# Install kubeconform and dapr schemas
pip install pyyaml

cat > validate_components.py << 'EOF'
import yaml
import sys
import os

def validate_component(file_path):
    with open(file_path) as f:
        component = yaml.safe_load(f)

    required_fields = ['apiVersion', 'kind', 'metadata', 'spec']
    for field in required_fields:
        if field not in component:
            print(f"FAIL {file_path}: missing field '{field}'")
            return False

    if component.get('kind') not in ['Component', 'Configuration', 'Resiliency', 'Subscription']:
        print(f"FAIL {file_path}: unknown kind '{component.get('kind')}'")
        return False

    print(f"OK {file_path}")
    return True

components_dir = sys.argv[1] if len(sys.argv) > 1 else "./components"
failed = 0
for root, dirs, files in os.walk(components_dir):
    for file in files:
        if file.endswith('.yaml') or file.endswith('.yml'):
            if not validate_component(os.path.join(root, file)):
                failed += 1

sys.exit(failed)
EOF

python validate_components.py ./kubernetes/staging/components
```

## Multi-Environment Promotion

```yaml
# .github/workflows/promote.yml
name: Promote to Production

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'Image tag to promote'
        required: true

jobs:
  promote-production:
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval

    steps:
    - uses: actions/checkout@v4

    - name: Deploy Dapr components to production
      run: |
        kubectl apply -f kubernetes/production/components/ -n production
        kubectl apply -f kubernetes/production/config/ -n production

    - name: Canary deploy (10% traffic)
      run: |
        export IMAGE_TAG=${{ inputs.image_tag }}
        kubectl apply -f kubernetes/production/canary/ -n production
```

## Summary

Dapr CI/CD configuration uses in-memory or lightweight Redis components for fast integration test runs, while Kubernetes deployment jobs apply environment-specific component YAML files to isolated namespaces. GitHub Actions workflows validate component YAML syntax before deployment and use Kubernetes rollout status checks with smoke tests to verify successful deployments. The promotion pattern gates production deployments behind manual approval with a canary rollout to reduce risk.
