# How to Use Kubewarden Policy Hub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, Policy, PolicyHub, Security

Description: Learn how to discover, evaluate, and deploy pre-built policies from the Kubewarden Policy Hub to accelerate your cluster security implementation.

## Introduction

The Kubewarden Policy Hub at https://hub.kubewarden.io has been retired. Kubewarden policies are now discovered on Artifact Hub (https://artifacthub.io/packages/search?kind=13), while the policies themselves are distributed as OCI artifacts. Instead of writing policies from scratch, you can browse Artifact Hub for policies that address your specific needs - from pod security to image restrictions, policy validation, and more - and then deploy them to your cluster with Kubewarden.

This guide covers how to discover policies on Artifact Hub, evaluate them with `kwctl`, and deploy them to your Kubernetes cluster.

## Prerequisites

- Kubewarden installed on your cluster
- `kwctl` CLI installed
- `kubectl` access to your cluster

## Accessing Policies on Artifact Hub

### Via Web Browser

Visit https://artifacthub.io/packages/search?kind=13 to browse Kubewarden policies:
- Search by keyword (e.g., "privileged", "image", "network")
- Use the Kubewarden policy package filter
- View policy documentation, settings, versions, and install instructions

### Via kwctl CLI After Discovery

```bash
# Inspect a policy once you have its OCI URI
kwctl inspect \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

# Download the policy locally
kwctl pull \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

# List downloaded policies
kwctl policies
```

## Discovering Policies

### Searching for Common Security Policies

Use Artifact Hub search terms such as:
- `privileged` for pod privilege controls
- `image` for image provenance, registry, and tag restrictions
- `network` for host networking and namespace controls
- `resource` for resource validation policies

### Getting Policy Details

```bash
# Get metadata about a specific policy
kwctl inspect \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

# Output the policy metadata in YAML
kwctl inspect \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8 \
  -o yaml
```

## Evaluating Policies Before Deploying

Before deploying a policy, test it against a representative admission request:

```bash
# Download the policy locally
kwctl pull \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

# List downloaded policies
kwctl policies

# Create an AdmissionReview request from a pod manifest
kwctl scaffold admission-request \
  --operation CREATE \
  --object my-pod.json > my-pod-request.json

# Test the policy against the admission request
kwctl run \
  --request-path my-pod-request.json \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

# Test with explicit settings
kwctl run \
  --request-path my-pod-request.json \
  --settings-json '{}' \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8
```

## Popular Policies

### Pod Privileged Policy

Prevents pods from running in privileged mode:

```yaml
# deploy-pod-privileged.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-privileged-pods
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Host Namespaces Policy

Prevents pods from using host networking, PID, and IPC namespaces:

```yaml
# deploy-host-namespaces.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-host-namespaces
spec:
  module: registry://ghcr.io/kubewarden/policies/host-namespaces-psp:v1.1.6
  settings:
    allow_host_pid: false
    allow_host_ipc: false
    allow_host_network: false
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Trusted Repositories Policy

Restricts images to approved registries:

```yaml
# deploy-trusted-repos.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: trusted-registries
spec:
  module: registry://ghcr.io/kubewarden/policies/trusted-repos:v2.0.4
  settings:
    registries:
      allow:
        - registry.internal.example.com
        - gcr.io
        - docker.io
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

### Safe Annotations Policy

Rejects resources that use annotations on a deny list:

```yaml
# deploy-safe-annotations.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: safe-annotations
spec:
  module: registry://ghcr.io/kubewarden/policies/safe-annotations:v1.0.2
  settings:
    denied_annotations:
      - "kubernetes.io/cluster-service"
      - "scheduler.alpha.kubernetes.io/critical-pod"
  rules:
    - apiGroups: ["*"]
      apiVersions: ["*"]
      resources: ["*"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: protect
```

## Automating Policy Discovery and Deployment

```bash
#!/bin/bash
# deploy-security-baseline.sh
# Deploys a baseline set of security policies discovered on Artifact Hub

echo "Deploying Kubewarden security baseline policies..."

# Apply all policies at once
kubectl apply -f - <<EOF
---
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: baseline-no-privileged
spec:
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: monitor  # Start in monitor mode
---
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: baseline-no-host-namespaces
spec:
  module: registry://ghcr.io/kubewarden/policies/host-namespaces-psp:v1.1.6
  settings:
    allow_host_pid: false
    allow_host_ipc: false
    allow_host_network: false
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: monitor
EOF

echo "Policies deployed in monitor mode. Review violations before switching to protect mode."
```

## Checking Policy Versions

Artifact Hub shows the available versions of each policy. After choosing a version, you can inspect or pull it with `kwctl`:

```bash
# Inspect a specific version
kwctl inspect \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

# Pull a specific version
kwctl pull \
  registry://ghcr.io/kubewarden/policies/pod-privileged:v1.0.8

# Check which policies are already downloaded locally
kwctl policies
```

## Conclusion

Artifact Hub accelerates your Kubewarden policy discovery process by providing a searchable catalog of community-published policies, while `kwctl` gives you the tools to inspect, test, and pull the exact OCI artifacts you want to enforce. By starting policies in monitor mode, you can see what would be blocked before enabling enforcement, giving you confidence in deploying new policies without disrupting existing workloads. The combination of Artifact Hub's policy catalog and `kwctl`'s testing capabilities provides a complete workflow for discovering, evaluating, and safely deploying admission policies.
