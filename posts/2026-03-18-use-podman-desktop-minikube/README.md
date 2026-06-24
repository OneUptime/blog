# How to Use Podman Desktop with Minikube

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Minikube, Kubernetes, Local Development

Description: Learn how to set up and use Minikube with Podman Desktop as the container runtime for local Kubernetes development and testing.

---

> Minikube with Podman as the driver gives you a feature-rich local Kubernetes cluster without depending on Docker, complete with dashboard access and addon support.

Minikube is one of the most popular tools for running Kubernetes locally. It supports multiple drivers including Podman. Minikube documents the Podman driver as experimental, but it allows you to use Podman Desktop as your container management layer while Minikube provides the Kubernetes control plane. This guide covers setting up Minikube with Podman and managing it through Podman Desktop.

---

## Prerequisites

Install Minikube and make sure `kubectl` and Podman are available:

```bash
# Install Minikube on macOS

brew install minikube

# Or download directly for Linux
# curl -LO https://github.com/kubernetes/minikube/releases/latest/download/minikube-linux-amd64
# sudo install minikube-linux-amd64 /usr/local/bin/minikube && rm minikube-linux-amd64

# Verify the installation
minikube version

# Check that kubectl is available
kubectl version --client

# Check that Podman is available
podman --version
```

## Configuring Minikube to Use Podman

Set Podman as the default driver for Minikube:

```bash
# Set Podman as the default driver
minikube config set driver podman

# Verify the configuration
minikube config view

# Alternatively, specify the driver when starting
minikube start --driver=podman
```

## Starting a Minikube Cluster

Create and start a cluster with Podman:

```bash
# Start Minikube with Podman driver
minikube start --driver=podman

# Start with custom resources
minikube start --driver=podman \
  --cpus=4 \
  --memory=8192 \
  --disk-size=50g

# Start with an explicit Kubernetes version selection
minikube start --driver=podman \
  --kubernetes-version=stable

# Verify the cluster is running
minikube status
kubectl get nodes
```

## Viewing Minikube in Podman Desktop

Once Minikube starts, Podman Desktop reflects the cluster:

1. Open Podman Desktop and check the **Containers** section to see Minikube containers.
2. Open **Settings > Kubernetes** or use the status bar to verify that the Minikube context appears.
3. Select the Minikube context as the current context if it is not already active.
4. You can view pods, deployments, and services running in the cluster.

## Deploying Applications

Deploy applications to your Minikube cluster:

```bash
# Create a deployment
kubectl create deployment hello-minikube \
  --image=registry.k8s.io/echoserver:1.10

# Expose it as a service
kubectl expose deployment hello-minikube \
  --type=NodePort \
  --port=8080

# Get the service URL via Minikube
minikube service hello-minikube --url

# Or use port forwarding
kubectl port-forward svc/hello-minikube 8080:8080
```

## Using the Minikube Dashboard

Minikube includes a built-in Kubernetes dashboard:

```bash
# Launch the dashboard in your browser
minikube dashboard

# Get the dashboard URL without opening the browser
minikube dashboard --url

# Enable the metrics server addon for resource monitoring
minikube addons enable metrics-server
```

## Enabling Minikube Addons

Minikube provides useful addons that extend cluster functionality:

```bash
# List all available addons
minikube addons list

# Enable the ingress controller
minikube addons enable ingress

# Enable the container registry addon
minikube addons enable registry

# Enable storage provisioning
minikube addons enable storage-provisioner

# Enable the metrics server
minikube addons enable metrics-server

# Check enabled addons
minikube addons list | grep enabled
```

## Loading Local Images

Use Minikube to access locally built images:

```bash
# Build an image inside the Minikube environment
minikube image build -t my-app:latest .

# Or load an existing Podman image into Minikube
podman save my-app:latest | minikube image load -

# List images available in Minikube
minikube image ls

# Use the image in a deployment (set imagePullPolicy to IfNotPresent or Never)
kubectl create deployment my-app \
  --image=my-app:latest
kubectl patch deployment my-app -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"my-app","image":"my-app:latest","imagePullPolicy":"IfNotPresent"}]}}}}'
```

## Managing Multiple Profiles

Run multiple Minikube clusters with different profiles:

```bash
# Create a second cluster with a different profile
minikube start -p staging --driver=podman

# List all profiles
minikube profile list

# Switch between profiles
minikube profile staging

# Stop a specific profile
minikube stop -p staging

# Delete a specific profile
minikube delete -p staging
```

## Troubleshooting Minikube with Podman

Common issues and solutions:

```bash
# Check Minikube logs for errors
minikube logs

# SSH into the Minikube node
minikube ssh

# Check the Podman connection and runtime details
podman system info

# Restart the cluster if it gets stuck
minikube stop
minikube start --driver=podman

# Delete and recreate if issues persist
minikube delete
minikube start --driver=podman
```

## Summary

Minikube with Podman Desktop provides a local Kubernetes environment with addon support, a built-in dashboard, and multi-profile management. The Podman driver removes the Docker dependency while still supporting core Minikube workflows, and Podman Desktop adds visual management on top so you can monitor both the containers backing Minikube and the Kubernetes resources running inside it.
