# Troubleshooting Calico Alternate Registry Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Container Registry, Troubleshooting, Kubernetes, DevOps

Description: A systematic guide to diagnosing and fixing Calico alternate registry configuration issues including image pull failures, authentication errors, and registry connectivity problems.

---

## Introduction

Configuring Calico to pull images from an alternate registry is a common requirement in enterprise environments, but it introduces several potential failure points. Image pull errors, authentication failures, certificate trust issues, and registry connectivity problems can prevent Calico components from starting or upgrading.

These issues are particularly challenging because they manifest at the pod level with generic error messages like "ImagePullBackOff" that do not immediately reveal the root cause. A systematic troubleshooting approach that checks registry connectivity, authentication, image availability, and Kubernetes configuration is essential.

This guide provides a structured troubleshooting workflow for Calico alternate registry issues with specific diagnostic commands and solutions.

## Prerequisites

- Kubernetes cluster with Calico configured for an alternate registry
- kubectl access with permissions to view pods and events
- Access to the private registry for verification
- crane or skopeo CLI for registry inspection
- Basic understanding of container image registries

## Step 1: Identify the Failing Component

Start by identifying which Calico component is failing and what error it reports:

```bash
# Check pod status across Calico namespaces

kubectl get pods -n calico-system -o wide
kubectl get pods -n tigera-operator -o wide

# Look for image pull errors in events
kubectl get events -n calico-system --sort-by='.lastTimestamp' | grep -i "pull\|image\|registry"

# Get detailed error from a specific failing pod
kubectl describe pod -n calico-system <pod-name> | grep -A 5 "Events:"
```

Common error messages and their meanings:

```text
# ErrImagePull / ImagePullBackOff
# The image cannot be pulled -- could be auth, network, or missing image

# "repository does not exist or may require docker login"
# Image not found in registry or authentication failed

# "x509: certificate signed by unknown authority"
# The registry uses a TLS certificate not trusted by the node
```

## Step 2: Verify Image Availability in the Registry

Confirm that the required images exist in your private registry:

```bash
# List available Calico images and tags
crane ls registry.example.com/calico/node
crane ls registry.example.com/calico/cni
crane ls registry.example.com/calico/kube-controllers
crane ls registry.example.com/calico/typha

# Check a specific image manifest
crane manifest registry.example.com/calico/node:v3.27.0

# Verify the available image platforms match your nodes
crane manifest registry.example.com/calico/node:v3.27.0 | \
  python3 -c "import sys,json; m=json.load(sys.stdin); [print(f\"OS: {p['platform']['os']}, Arch: {p['platform']['architecture']}\") for p in m.get('manifests', [])] or print('Single-platform manifest; inspect with crane config')"
```

## Step 3: Test Registry Authentication

Verify that Kubernetes can authenticate to the private registry:

```bash
# Check if image pull secrets are configured on the Installation resource
kubectl get installation default -o jsonpath='{.spec.imagePullSecrets[*].name}{"\n"}'

# Check if the referenced image pull secret exists in the tigera-operator namespace
kubectl get secret tigera-pull-secret -n tigera-operator

# Inspect the pull secret contents (base64 encoded)
kubectl get secret tigera-pull-secret -n tigera-operator -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d | python3 -m json.tool

# Test that Kubernetes can pull a private Calico image with the secret
kubectl run registry-pull-test -n tigera-operator --rm -it --restart=Never \
  --image=registry.example.com/calico/node:v3.27.0 \
  --overrides='{
    "spec": {
      "imagePullSecrets": [{"name": "tigera-pull-secret"}]
    }
  }' --command -- /bin/sh -c 'echo "Image pulled successfully"'

# Recreate the pull secret if credentials are wrong
kubectl delete secret tigera-pull-secret -n tigera-operator
kubectl create secret docker-registry tigera-pull-secret \
  -n tigera-operator \
  --docker-server=registry.example.com \
  --docker-username=calico-pull \
  --docker-password="${REGISTRY_PASSWORD}"
```

## Step 4: Check Registry TLS Configuration

If your registry uses a self-signed or enterprise CA certificate:

```bash
# Test TLS connectivity to the registry from a node
openssl s_client -connect registry.example.com:443 -servername registry.example.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer

# Check if containerd trusts the registry CA
# For containerd-based nodes
grep -A 5 "config_path" /etc/containerd/config.toml
cat /etc/containerd/certs.d/registry.example.com/hosts.toml

# Configure containerd to trust the private CA on each node.
# For containerd 1.x, set config_path in /etc/containerd/config.toml:
# [plugins."io.containerd.grpc.v1.cri".registry]
#   config_path = "/etc/containerd/certs.d"
#
# For containerd 2.x, set config_path in /etc/containerd/config.toml:
# [plugins."io.containerd.cri.v1.images".registry]
#   config_path = "/etc/containerd/certs.d"
#
# Then create /etc/containerd/certs.d/registry.example.com/hosts.toml:
# server = "https://registry.example.com"
# ca = "/etc/containerd/certs.d/registry.example.com/ca.crt"
```

```mermaid
flowchart TD
    A[ImagePullBackOff] --> B{Image exists in registry?}
    B -->|No| C[Mirror images to registry]
    B -->|Yes| D{Auth credentials correct?}
    D -->|No| E[Fix imagePullSecret]
    D -->|Yes| F{Registry TLS trusted?}
    F -->|No| G[Add CA to containerd config]
    F -->|Yes| H{Network accessible?}
    H -->|No| I[Fix firewall/proxy rules]
    H -->|Yes| J{Correct image path?}
    J -->|No| K[Fix Installation CR registry/imagePath]
    J -->|Yes| L[Check node disk space]
```

## Step 5: Verify Operator and Installation Configuration

Ensure the Tigera operator is configured with the correct registry:

```bash
# Check the Installation resource
kubectl get installation default -o yaml | grep -A 3 "imagePullSecrets\|registry\|imagePath"

# Expected output:
# registry: registry.example.com/
# imagePath: calico
# imagePullSecrets:
# - name: tigera-pull-secret

# Check what images the operator is actually setting
kubectl get deployment -n calico-system calico-kube-controllers -o jsonpath='{.spec.template.spec.containers[*].image}'
kubectl get daemonset -n calico-system calico-node -o jsonpath='{.spec.template.spec.containers[*].image}'

# If the registry is wrong, update the Installation resource
kubectl patch installation default --type merge -p '{
  "spec": {
    "registry": "registry.example.com/",
    "imagePath": "calico",
    "imagePullSecrets": [{"name": "tigera-pull-secret"}]
  }
}'
```

## Step 6: Check Node-Level Registry Access

Verify that each node can reach the private registry:

```bash
# Run a debug pod on a specific node to test connectivity
kubectl debug node/<node-name> -it --image=busybox -- sh -c \
  "wget -q -O /dev/null --timeout=5 https://registry.example.com/v2/ && echo 'Registry reachable' || echo 'Registry unreachable'"

# Check for proxy settings that might block registry access
kubectl get daemonset -n calico-system calico-node -o json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); [print(e) for c in d['spec']['template']['spec']['containers'] for e in c.get('env', []) if 'proxy' in e.get('name', '').lower()]"
```

## Verification

```bash
# After fixing the issue, verify all pods are running
kubectl get pods -n calico-system -w

# Verify no image pull errors remain
kubectl get events -n calico-system --field-selector reason=Failed --sort-by='.lastTimestamp' | tail -5

# Confirm all images are from the private registry
kubectl get pods -n calico-system -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.containers[*].image}{"\n"}{end}'
```

## Troubleshooting

- **Pods stuck in ImagePullBackOff after fixing**: Delete the failing pods to force re-creation. The daemonset/deployment controller will recreate them: `kubectl delete pods -n calico-system -l k8s-app=calico-node`.
- **Some nodes pull images but others fail**: Check node-specific network policies, proxy settings, or containerd configurations that may differ between nodes.
- **Operator reverts image changes**: Do not modify pod images directly. Always update the Installation CR, as the operator reconciles pod specs.
- **Multi-arch images missing**: Ensure you mirror the manifest list (multi-arch) rather than a single platform image. Use `crane copy` which handles manifest lists correctly.

## Conclusion

Troubleshooting Calico alternate registry configuration requires checking each layer systematically: image availability in the registry, authentication credentials, TLS trust, network connectivity, and operator configuration. By working through these steps methodically, you can quickly identify and resolve the root cause of image pull failures and ensure all Calico components pull images from your private registry reliably.
