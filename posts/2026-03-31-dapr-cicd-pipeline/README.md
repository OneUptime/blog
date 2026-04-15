# How to Set Up CI/CD Pipeline for Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CI/CD, DevOps, Pipeline, Automation

Description: Learn how to set up a complete CI/CD pipeline for Dapr applications covering build, test, security scanning, and deployment to Kubernetes with Dapr components.

---

A CI/CD pipeline for Dapr applications needs to handle not just application code but also Dapr component configuration, access control policies, and sidecar configuration. This guide covers building a complete pipeline from code commit to production deployment.

## Pipeline Stages Overview

A Dapr CI/CD pipeline should include:
1. Code linting and unit tests
2. Build and push container image
3. Security scanning (image + manifests)
4. Deploy Dapr components to staging
5. Integration tests using `dapr run`
6. Deploy to production

## Repository Structure

```bash
├── src/                      # Application code
├── tests/                    # Unit and integration tests
├── k8s/
│   ├── base/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── components/
│   │   ├── pubsub.yaml
│   │   ├── state-store.yaml
│   │   └── secret-store.yaml
│   ├── config/
│   │   └── dapr-config.yaml
│   └── overlays/
│       ├── staging/
│       └── production/
└── .github/workflows/
    └── ci-cd.yaml
```

## GitHub Actions CI/CD Workflow

```yaml
name: Dapr Application CI/CD
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  IMAGE_NAME: myrepo/order-service
  DAPR_VERSION: 1.13.0

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: pip install -r requirements.txt -r requirements-dev.txt
    - name: Run unit tests
      run: pytest tests/unit/ -v --cov=src --cov-report=xml
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_TOKEN }}
    - name: Build and push Docker image
      id: meta
      uses: docker/build-push-action@v5
      with:
        push: true
        tags: ${{ env.IMAGE_NAME }}:${{ github.sha }}

  scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Run Trivy image scan
      uses: aquasecurity/trivy-action@master
      with:
        image-ref: ${{ env.IMAGE_NAME }}:${{ github.sha }}
        severity: HIGH,CRITICAL
        exit-code: 1

  deploy-staging:
    needs: scan
    runs-on: ubuntu-latest
    environment: staging
    steps:
    - uses: actions/checkout@v4
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        kubeconfig: ${{ secrets.STAGING_KUBECONFIG }}
    - name: Deploy Dapr components
      run: kubectl apply -f k8s/components/ -n staging
    - name: Deploy application
      run: |
        kubectl set image deployment/order-service \
          order-service=${{ env.IMAGE_NAME }}:${{ github.sha }} \
          -n staging
        kubectl rollout status deployment/order-service -n staging

  integration-test:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Run integration tests against staging
      run: |
        export BASE_URL="https://api-staging.example.com"
        pytest tests/integration/ -v
```

## Summary

A complete Dapr CI/CD pipeline builds and tests the application, scans images and manifests for vulnerabilities, deploys Dapr components before the application, and validates with integration tests before promoting to production. Structure your repository to separate application code from Dapr component configuration to enable independent updates of each layer.
