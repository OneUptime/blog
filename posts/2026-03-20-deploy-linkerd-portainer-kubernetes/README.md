# How to Deploy Linkerd via Portainer on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Linkerd, Service Mesh, DevOps

Description: Step-by-step guide to installing and configuring Linkerd service mesh on Kubernetes using Portainer.

## Introduction

Linkerd is a lightweight, ultra-fast service mesh for Kubernetes that focuses on simplicity and performance. Unlike Istio, Linkerd uses a Rust-based micro-proxy called linkerd2-proxy, making it significantly lighter on resources. Portainer makes managing Linkerd deployments straightforward through its Helm and manifest management capabilities.

## Prerequisites

- Portainer CE or Business Edition installed on Kubernetes
- kubectl CLI installed locally
- Linkerd CLI installed: `curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh`
- Kubernetes 1.22+ cluster with at least 2 CPU cores and 4 GB RAM

## Step 1: Add the Linkerd Helm Repository

In Portainer, navigate to your Kubernetes environment:

1. Go to **Kubernetes** > **Helm**
2. Click **Add Repository**
3. Add the Linkerd stable repository:

```text
Name: linkerd
URL: https://helm.linkerd.io/stable
```

## Step 2: Create Required Namespaces

Deploy the following manifest via Portainer's Kubernetes manifest editor:

```yaml
# linkerd-namespaces.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: linkerd
  annotations:
    linkerd.io/inject: disabled
  labels:
    linkerd.io/is-control-plane: "true"
    config.linkerd.io/admission-webhooks: disabled
    linkerd.io/control-plane-ns: linkerd
---
apiVersion: v1
kind: Namespace
metadata:
  name: linkerd-viz
  labels:
    linkerd.io/extension: viz
```

## Step 3: Generate and Install Certificates

Linkerd requires TLS certificates for mTLS. Generate them using step CLI or openssl:

```bash
# Generate root CA certificate
step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca --no-password --insecure

# Generate identity certificate
step certificate create identity.linkerd.cluster.local issuer.crt issuer.key \
  --profile intermediate-ca --not-after 8760h --no-password --insecure \
  --ca ca.crt --ca-key ca.key
```

Store these as Kubernetes secrets via Portainer's **Kubernetes** > **Secrets** section:

```yaml
# linkerd-identity-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: linkerd-identity-issuer
  namespace: linkerd
type: kubernetes.io/tls
data:
  # base64-encoded certificate content
  tls.crt: <base64-issuer-crt>
  tls.key: <base64-issuer-key>
```

## Step 4: Install Linkerd CRDs

Install Linkerd Custom Resource Definitions via Helm in Portainer:

1. Go to **Kubernetes** > **Helm** > **Charts**
2. Find `linkerd-crds` in the Linkerd repository
3. Install with namespace `linkerd`
4. Use default values

## Step 5: Install Linkerd Control Plane

Install the Linkerd control plane via Portainer Helm:

1. Find `linkerd-control-plane` chart
2. Install with namespace `linkerd`
3. Configure values:

```yaml
# linkerd-control-plane-values.yaml
# Control plane configuration
controllerReplicas: 1

# Trust anchor (root CA) PEM - top-level value
identityTrustAnchorsPEM: |
  # Your root CA certificate PEM content (contents of ca.crt)

# Identity configuration - the issuer cert/key are read from the
# linkerd-identity-issuer Secret of type kubernetes.io/tls created above
identity:
  issuer:
    scheme: kubernetes.io/tls

# Proxy configuration
proxy:
  resources:
    cpu:
      request: 100m
    memory:
      limit: 250Mi
      request: 20Mi

# High availability settings
highAvailability: false  # Set to true for production

# Log level
controllerLogLevel: info
```

## Step 6: Install Linkerd Viz Extension

The viz extension provides the Linkerd dashboard and metrics:

```yaml
# linkerd-viz-values.yaml
# Install via Portainer Helm
dashboard:
  replicas: 1

prometheus:
  enabled: true
  resources:
    cpu:
      limit: "4"
      request: 100m
    memory:
      limit: 8Gi
      request: 300Mi
```

## Step 7: Verify the Installation

Check the deployment status in Portainer:

1. Go to **Kubernetes** > **Workloads** > **Pods**
2. Filter by namespace `linkerd`
3. All pods should show **Running** status

Verify via CLI:

```bash
# Check Linkerd status
linkerd check

# View control plane pods
kubectl get pods -n linkerd

# View viz pods
kubectl get pods -n linkerd-viz
```

## Step 8: Enable Proxy Injection for Namespaces

Annotate namespaces to automatically inject the Linkerd proxy:

```yaml
# Enable injection for default namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    linkerd.io/inject: enabled
```

Apply via Portainer's namespace editor or manifest deployer.

## Step 9: Access the Linkerd Dashboard

Port-forward the Linkerd dashboard through Portainer:

1. Go to **Kubernetes** > **Workloads** > **Pods**
2. Find the `web` pod in `linkerd-viz`
3. Click on the pod > **Port Forwarding**
4. Forward port 8084

Or via CLI:

```bash
linkerd viz dashboard &
```

## Monitoring Traffic

Use Portainer to view Linkerd-managed workloads and their traffic stats:

```bash
# View live traffic stats
linkerd viz stat deployments -n production

# View top traffic routes
linkerd viz routes deployments/my-app -n production
```

## Conclusion

Linkerd deployed via Portainer provides an excellent balance of simplicity and power for Kubernetes service mesh adoption. Its lightweight Rust-based proxy ensures minimal overhead, while Portainer's interface makes deployment and certificate management accessible to teams that prefer visual management over raw CLI operations. With automatic mTLS, golden metrics (success rate, request rate, and latency), and a clean dashboard, Linkerd is an excellent choice for organizations prioritizing operational simplicity.
