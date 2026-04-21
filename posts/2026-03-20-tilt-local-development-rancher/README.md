# How to Set Up Tilt for Local Development with Rancher - Local Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Tilt, Developer Experience, Kubernetes, Local Development, Inner Loop

Description: Configure Tilt to automate the build-deploy-log cycle for local Kubernetes development against a Rancher cluster with live updates and error visualization.

## Introduction

Tilt is a developer experience tool that provides a visual dashboard for your Kubernetes development workflow. It watches your code, automatically rebuilds and redeploys on change, streams container logs in a web UI, and shows resource health at a glance. Tilt's `live_update` feature can sync file changes directly into running containers without a full rebuild.

## Step 1: Install Tilt

```bash
# macOS

brew install tilt

# Linux
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
```

## Step 2: Create a Tiltfile

The `Tiltfile` is a Python-like configuration file that describes your development workflow:

```python
# Tiltfile

# Load the Helm extension
load('ext://helm_resource', 'helm_resource')

# Build the Docker image using the local Dockerfile
docker_build(
    'myregistry/myapp',
    '.',                           # Build context
    dockerfile='./Dockerfile',
    live_update=[
        # Sync source files into the container without rebuilding the image
        sync('./src', '/app/src'),
        sync('./package.json', '/app/package.json'),
        # Run npm install only when package.json changes
        run('cd /app && npm install --silent', trigger=['./package.json']),
    ]
)

# Load Kubernetes manifests
k8s_yaml(['k8s/deployment.yaml', 'k8s/service.yaml'])

# Configure resource in the Tilt dashboard
k8s_resource(
    'myapp',
    port_forwards='8080:8080',    # Forward port for local browser access
    labels=['backend'],
)

# Load a Helm chart
helm_resource(
    'postgres',
    'oci://registry-1.docker.io/bitnamicharts/postgresql',
    flags=[
        '--set=auth.postgresPassword=devpassword',
        '--set=primary.persistence.enabled=false',    # No persistence in dev
    ],
    port_forwards='5432:5432',
    labels=['database'],
)
```

## Step 3: Configure for Remote Rancher Cluster

For development against a remote Rancher cluster (not local), allow Tilt to run against your cluster's context:

```python
# Tiltfile - remote cluster configuration

# Allow this Rancher Kubernetes context. Select it with
# kubectl config use-context or tilt up --context.
allow_k8s_contexts(['rancher-dev-cluster'])   # Name from your kubeconfig

# Use a remote registry since the cluster can't pull local images
default_registry('myregistry.example.com')

docker_build('myapp', '.', live_update=[
    sync('./src', '/app/src'),
])
```

## Step 4: Start Tilt

```bash
# Start Tilt
tilt up

# Or stream logs in the terminal
tilt up --stream

# Tilt web UI available at http://localhost:10350
```

## Step 5: Trigger and Watch Updates

Tilt streams all container logs in its web UI, organized by resource. Edit any file in `./src`, and Tilt will:

1. Sync the changed files directly into the running container (via `live_update`)
2. Let your app's hot-reload process pick up the change, if one is configured
3. Show the updated logs in the UI

A full image rebuild happens when a watched file in the Docker build context changes but `live_update` sync rules don't cover it.

## Conclusion

Tilt on Rancher provides the fastest Kubernetes inner development loop available. The `live_update` feature eliminates image rebuilds for file-level changes, reducing iteration time from minutes to seconds. The web dashboard gives a complete real-time view of all your development resources.
