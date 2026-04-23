# How to Configure DevSpace with Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, DevSpace, Development, Inner Loop

Description: Configure DevSpace for cloud-native development on Rancher clusters with hot reloading, port forwarding, and automated deployment pipelines.

## Introduction

DevSpace is an open-source developer tool for Kubernetes that provides a streamlined development experience with hot reloading, interactive terminal access, and automated deployment workflows. Unlike other tools, DevSpace focuses on the developer's perspective with a configuration-as-code approach using devspace.yaml. This guide covers setting up DevSpace for development against Rancher clusters.

## Prerequisites

- DevSpace CLI installed
- kubectl configured for your Rancher cluster
- Docker installed (or in-cluster build support)
- A development namespace in Rancher

## Step 1: Install DevSpace

```bash
# macOS

brew install devspace

# Linux
curl -L -o devspace "https://github.com/loft-sh/devspace/releases/latest/download/devspace-linux-amd64" && \
  sudo install -c -m 0755 devspace /usr/local/bin

# Windows (PowerShell)
md -Force "$Env:APPDATA\devspace"
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]'Tls,Tls11,Tls12'
Invoke-WebRequest -URI "https://github.com/loft-sh/devspace/releases/latest/download/devspace-windows-amd64.exe" -o $Env:APPDATA\devspace\devspace.exe
$env:Path += ";" + $Env:APPDATA + "\devspace"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [System.EnvironmentVariableTarget]::User)

# Verify
devspace version
```

## Step 2: Initialize DevSpace Configuration

```bash
# Initialize DevSpace in your project
cd /path/to/your/project
devspace init

# DevSpace will auto-detect your Dockerfile and create devspace.yaml
```

## Step 3: Create devspace.yaml

```yaml
# devspace.yaml - DevSpace configuration
version: v2beta1

# Image building
images:
  backend:
    image: registry.example.com/backend
    dockerfile: ./backend/Dockerfile
    context: ./backend
    buildKit:
      inCluster: {}  # Build inside the cluster

  frontend:
    image: registry.example.com/frontend
    dockerfile: ./frontend/Dockerfile.dev
    context: ./frontend

# Deploy configuration
deployments:
  app:
    namespace: development
    helm:
      chart:
        name: ./chart
      values:
        backend:
          image:
            repository: registry.example.com/backend
            tag: ${DEVSPACE_RANDOM}
        frontend:
          image:
            repository: registry.example.com/frontend
            tag: ${DEVSPACE_RANDOM}
        replicaCount: 1

# Development configuration
dev:
  backend:
    imageSelector: registry.example.com/backend
    # Sync local files into the running container
    sync:
      - path: ./backend/src:/app/src
        excludePaths:
          - __pycache__
          - "*.pyc"
    # Port forwarding
    ports:
      - port: "8080"
    # Open terminal in the container
    terminal:
      command: bash
    # Override container command for development
    command:
      - python
      - -m
      - uvicorn
      - src.main:app
      - --reload
      - --host
      - "0.0.0.0"

  frontend:
    imageSelector: registry.example.com/frontend
    sync:
      - path: ./frontend/src:/app/src
      - path: ./frontend/public:/app/public
    ports:
      - port: "3000"
    command:
      - npm
      - run
      - dev

# Pipeline customization
pipelines:
  dev:
    run: |-
      run_dependencies --all
      build_images --all
      create_deployments --all
      start_dev --all
  dev-backend:
    run: |-
      run_dependencies --all
      build_images backend
      create_deployments --all
      start_dev backend
```

## Step 4: Configure Namespace and Context

```bash
# Create development namespace
kubectl create namespace development

# Set DevSpace to use specific namespace
devspace use namespace development

# Use specific kubeconfig context
devspace use context rancher-development

# Verify configuration
devspace print
```

## Step 5: Start Development Mode

```bash
# Start full development loop
devspace dev

# Start with specific profile
devspace dev --profile local

# Start only the backend dev configuration
devspace run-pipeline dev-backend

# Build and deploy without dev mode
devspace deploy

# Run in specific namespace
devspace dev --namespace development
```

## Step 6: Configure Profiles

```yaml
# devspace.yaml - Multiple deployment profiles
profiles:
  # Local development profile
  - name: local
    patches:
      - op: replace
        path: dev.backend.command
        value:
          - python
          - -m
          - debugpy
          - --listen
          - "0.0.0.0:5678"
          - -m
          - uvicorn
          - src.main:app
          - --reload
      - op: add
        path: dev.backend.ports
        value:
          port: "5678"  # Debugpy port

  # Staging profile
  - name: staging
    patches:
      - op: replace
        path: deployments.app.helm.values.replicaCount
        value: 2

  # CI profile - no dev mode, just build and deploy
  - name: ci
    patches:
      - op: remove
        path: dev
```

## Step 7: Run Commands and Pipelines

```bash
# Execute a command in the running container
devspace enter --image-selector registry.example.com/backend ls /app

# Enter interactive shell
devspace enter --image-selector registry.example.com/backend bash

# Run custom pipeline
devspace run-pipeline dev-backend

# View logs for the backend container
devspace logs --image-selector registry.example.com/backend

# Pick a pod/container and view logs
devspace logs
```

## Step 8: Extend Pipelines for Deployment Tasks

```yaml
# devspace.yaml - Pipelines instead of deprecated hooks
pipelines:
  deploy:
    run: |-
      run_dependencies --all
      echo "Building images..."
      build_images --all
      create_deployments --all
      kubectl wait --for=condition=available deployment/backend --namespace=development --timeout=120s
      kubectl exec -n development deployment/backend -- python manage.py migrate
```

## Step 9: In-Cluster Builds

```yaml
# devspace.yaml - Build images inside the cluster
images:
  backend:
    image: registry.example.com/backend
    buildKit:
      inCluster:
        # Use specific namespace for builds
        namespace: development
```

## Conclusion

DevSpace provides an intuitive developer experience for Kubernetes-native development on Rancher clusters. Its YAML-based configuration integrates well with existing Helm charts and Docker workflows. The file sync and hot reload capabilities eliminate the slow build-push-deploy cycle for iterative development, while profiles enable the same configuration to serve development, staging, and CI environments without duplication.
