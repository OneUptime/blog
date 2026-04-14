# How to Use Dapr with GitHub Actions for CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GitHub Action, CI/CD, Deployment, Automation

Description: Build automated CI/CD pipelines with GitHub Actions to test, build, and deploy Dapr microservices to Kubernetes with component validation and integration testing.

---

## Overview

GitHub Actions provides a powerful CI/CD platform for automating Dapr microservice deployments. This guide covers setting up pipelines that run integration tests with Dapr's local mode, build container images, validate Dapr component configurations, and deploy to Kubernetes.

## Prerequisites

- GitHub repository with Dapr microservices
- Kubernetes cluster (or kind for local testing)
- Docker Hub or container registry credentials stored as GitHub Secrets

## Workflow Structure

A complete Dapr CI/CD workflow has four stages: test, build, validate, and deploy.

## Stage 1: Integration Testing with Dapr

```yaml
name: Dapr CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install Dapr CLI
      run: |
        wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

    - name: Initialize Dapr
      run: dapr init --slim

    - name: Run Unit Tests
      run: |
        cd services/order-service
        npm test

    - name: Run Integration Tests with Dapr
      run: |
        dapr run \
          --app-id order-service \
          --app-port 3000 \
          --dapr-http-port 3500 \
          --resources-path ./components/test \
          -- npm run test:integration &
        sleep 5
        npm run test:e2e
```

## Stage 2: Build and Push Container Image

```yaml
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}

    - name: Build and Push
      uses: docker/build-push-action@v5
      with:
        context: services/order-service
        push: true
        tags: myorg/order-service:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

## Stage 3: Validate Dapr Components

```yaml
  validate-components:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Validate Component Manifests
      run: |
        for file in k8s/components/*.yaml; do
          echo "Validating $file"
          kubectl apply --dry-run=client -f "$file"
        done
```

## Stage 4: Deploy to Kubernetes

```yaml
  deploy:
    needs: [build, validate-components]
    runs-on: ubuntu-latest
    environment: production
    steps:
    - uses: actions/checkout@v4

    - name: Set Kubernetes Context
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBECONFIG }}

    - name: Deploy Dapr Components
      run: kubectl apply -f k8s/components/

    - name: Deploy Application
      run: |
        sed -i "s/IMAGE_TAG/${{ github.sha }}/g" k8s/deployments/order-service.yaml
        kubectl apply -f k8s/deployments/order-service.yaml
        kubectl rollout status deployment/order-service --timeout=5m
```

## Testing Component Files in CI

```yaml
  - name: Create Test Components
    run: |
      cat > /tmp/components/statestore.yaml << 'EOF'
      apiVersion: dapr.io/v1alpha1
      kind: Component
      metadata:
        name: statestore
      spec:
        type: state.in-memory
        version: v1
      EOF
```

## Summary

GitHub Actions integrates naturally with Dapr's CLI-based local mode for running integration tests, validating component configurations, and automating Kubernetes deployments. By combining Dapr's `dapr run` command in CI with Kubernetes rollouts in CD, teams get a reliable pipeline that tests service behavior with real Dapr building blocks before production deployment.
