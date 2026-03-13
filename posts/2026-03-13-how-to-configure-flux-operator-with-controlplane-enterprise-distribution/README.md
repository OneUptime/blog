# How to Configure Flux Operator with ControlPlane Enterprise Distribution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Flux-Operator, Enterprise, Controlplane

Description: Learn how to set up the Flux Operator with the ControlPlane Enterprise Distribution for production-grade Flux deployments with enterprise support and FIPS compliance.

---

## Introduction

The ControlPlane Enterprise Distribution for Flux provides hardened, FIPS-compliant container images, extended support lifecycles, and enterprise-grade features for production Kubernetes environments. When combined with the Flux Operator, you gain a fully declarative way to deploy and manage the enterprise distribution across your clusters.

This guide walks you through configuring the Flux Operator to use the ControlPlane Enterprise Distribution, including authentication setup, FIPS-compliant image configuration, and advanced enterprise features.

## Prerequisites

- A Kubernetes cluster (v1.28 or later)
- `kubectl` and `helm` CLI tools installed
- A ControlPlane enterprise subscription with registry credentials
- The Flux Operator installed on your cluster
- Basic understanding of Flux and OCI registries

## Step 1: Install the Flux Operator

If you have not already installed the Flux Operator, deploy it using Helm:

```bash
helm install flux-operator oci://ghcr.io/controlplaneio-fluxcd/charts/flux-operator \
  --namespace flux-operator-system \
  --create-namespace
```

Verify the installation:

```bash
kubectl get deployment -n flux-operator-system flux-operator
```

## Step 2: Create Registry Credentials

The ControlPlane Enterprise Distribution images are hosted in a private OCI registry. Create a Kubernetes secret with your enterprise credentials:

```yaml
# enterprise-registry-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: enterprise-registry-credentials
  namespace: flux-system
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

Generate the secret using kubectl:

```bash
kubectl create namespace flux-system --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry enterprise-registry-credentials \
  --namespace flux-system \
  --docker-server=ghcr.io \
  --docker-username=your-username \
  --docker-password=your-token
```

## Step 3: Configure the FluxInstance with Enterprise Distribution

Create a FluxInstance resource that points to the ControlPlane enterprise registry:

```yaml
# flux-enterprise-instance.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.x"
    registry: "ghcr.io/controlplaneio-fluxcd/distroless"
    imagePullSecret: "enterprise-registry-credentials"
    artifact: "oci://ghcr.io/controlplaneio-fluxcd/flux-operator-manifests"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
    - image-reflector-controller
    - image-automation-controller
  cluster:
    type: kubernetes
    multitenant: true
    networkPolicy: true
    domain: "cluster.local"
  kustomize:
    patches:
      - target:
          kind: Deployment
          labelSelector: "app.kubernetes.io/part-of=flux"
        patch: |
          - op: add
            path: /spec/template/spec/containers/0/resources
            value:
              requests:
                cpu: 100m
                memory: 256Mi
              limits:
                memory: 1Gi
```

Apply the FluxInstance:

```bash
kubectl apply -f flux-enterprise-instance.yaml
```

## Step 4: Enable FIPS Compliance

For environments that require FIPS 140-2 compliance, use the FIPS-compliant image variants:

```yaml
# flux-enterprise-fips.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.x"
    registry: "ghcr.io/controlplaneio-fluxcd/distroless-fips"
    imagePullSecret: "enterprise-registry-credentials"
    artifact: "oci://ghcr.io/controlplaneio-fluxcd/flux-operator-manifests"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
    networkPolicy: true
```

The FIPS images use BoringCrypto for all TLS and cryptographic operations, meeting federal compliance requirements.

## Step 5: Configure Sync with Enterprise Features

Set up the sync configuration to pull your fleet manifests:

```yaml
# flux-enterprise-sync.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: FluxInstance
metadata:
  name: flux
  namespace: flux-system
spec:
  distribution:
    version: "2.4.x"
    registry: "ghcr.io/controlplaneio-fluxcd/distroless"
    imagePullSecret: "enterprise-registry-credentials"
    artifact: "oci://ghcr.io/controlplaneio-fluxcd/flux-operator-manifests"
  components:
    - source-controller
    - kustomize-controller
    - helm-controller
    - notification-controller
  cluster:
    type: kubernetes
    multitenant: true
    networkPolicy: true
  sync:
    kind: GitRepository
    url: "ssh://git@github.com/your-org/fleet-infra.git"
    ref: "refs/heads/main"
    path: "clusters/production"
    pullSecret: "flux-system"
  kustomize:
    patches:
      - target:
          kind: Deployment
          name: "source-controller"
        patch: |
          - op: add
            path: /spec/template/spec/containers/0/args/-
            value: --helm-cache-max-size=20
          - op: add
            path: /spec/template/spec/containers/0/args/-
            value: --helm-cache-purge-interval=5m
```

## Step 6: Verify Enterprise Deployment

Check that all components are running with the enterprise images:

```bash
kubectl get fluxinstance -n flux-system

kubectl get deployments -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.template.spec.containers[0].image}{"\n"}{end}'
```

Confirm the images are from the ControlPlane registry. Run the Flux check command:

```bash
flux check
```

## Step 7: Set Up Enterprise Monitoring

Configure Prometheus monitoring for the enterprise deployment:

```yaml
# flux-enterprise-monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-system
  namespace: flux-system
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  podMetricsEndpoints:
    - port: http-prom
      path: /metrics
      interval: 30s
```

## Conclusion

Configuring the Flux Operator with the ControlPlane Enterprise Distribution gives you a production-hardened GitOps platform with FIPS compliance, enterprise support, and distroless container images. The FluxInstance resource provides a single point of configuration for your entire Flux deployment, making it straightforward to standardize across multiple clusters. With enterprise registry credentials, FIPS-compliant images, and proper resource management in place, your Flux installation is ready for regulated and high-security production environments.
