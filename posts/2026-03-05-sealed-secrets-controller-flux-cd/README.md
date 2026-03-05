# How to Configure Sealed Secrets Controller with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secrets, Sealed Secrets, Controller, Helm

Description: Learn how to deploy and configure the Sealed Secrets controller using Flux CD HelmRelease for production-ready secret management.

---

The Sealed Secrets controller is the server-side component that decrypts SealedSecret resources into regular Kubernetes Secrets. Deploying it through Flux CD ensures the controller itself is managed via GitOps, providing consistent and reproducible installations across clusters. This guide covers deploying, configuring, and customizing the Sealed Secrets controller with Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- `kubectl` access to your cluster
- `kubeseal` CLI installed

## Step 1: Create the Infrastructure Directory Structure

Organize the Sealed Secrets controller deployment in your repository's infrastructure directory.

```bash
# Create the directory structure
mkdir -p infrastructure/sealed-secrets
```

## Step 2: Define the HelmRepository Source

Create a HelmRepository resource pointing to the Sealed Secrets Helm chart repository.

```yaml
# infrastructure/sealed-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: sealed-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://bitnami-labs.github.io/sealed-secrets
```

## Step 3: Create the HelmRelease

Define the HelmRelease with production-ready configuration options.

```yaml
# infrastructure/sealed-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sealed-secrets-controller
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: sealed-secrets
      version: ">=2.0.0"
      sourceRef:
        kind: HelmRepository
        name: sealed-secrets
      interval: 1h
  # Install the controller in the kube-system namespace
  targetNamespace: kube-system
  install:
    crds: Create
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # Override the full name for consistent references
    fullnameOverride: sealed-secrets-controller
    # Resource limits for production
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
    # Enable metrics for monitoring
    metrics:
      serviceMonitor:
        enabled: false
      dashboards:
        create: false
    # Key renewal period (default: 30 days)
    keyrenewperiod: "720h0m0s"
```

## Step 4: Create the Kustomization File

Create a kustomization file to bundle the resources.

```yaml
# infrastructure/sealed-secrets/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrepository.yaml
  - helmrelease.yaml
```

## Step 5: Add to the Infrastructure Kustomization

Include the Sealed Secrets directory in your infrastructure Flux Kustomization.

```yaml
# clusters/my-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: flux-system
```

## Step 6: Commit and Deploy

Push the configuration and wait for Flux to deploy the controller.

```bash
# Commit and push
git add infrastructure/sealed-secrets/
git commit -m "Add Sealed Secrets controller via HelmRelease"
git push

# Monitor the deployment
flux get helmreleases -n flux-system
kubectl get pods -n kube-system -l app.kubernetes.io/name=sealed-secrets
```

## Step 7: Verify the Controller

Confirm the controller is running and the CRD is installed.

```bash
# Check the HelmRelease status
flux get helmreleases -n flux-system sealed-secrets-controller

# Verify the controller pod is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=sealed-secrets

# Verify the CRD is installed
kubectl get crd sealedsecrets.bitnami.com

# Fetch the public certificate to confirm the controller is operational
kubeseal --fetch-cert \
  --controller-name=sealed-secrets-controller \
  --controller-namespace=kube-system
```

## Advanced Configuration Options

### Custom Key Pair

Use your own key pair instead of the auto-generated one, which is useful for disaster recovery.

```bash
# Generate a custom key pair
openssl req -x509 -days 365 -nodes \
  -newkey rsa:4096 \
  -keyout sealed-secrets-key.pem \
  -out sealed-secrets-cert.pem \
  -subj "/CN=sealed-secrets/O=sealed-secrets"

# Create the secret before deploying the controller
kubectl create secret tls sealed-secrets-custom-key \
  --namespace=kube-system \
  --cert=sealed-secrets-cert.pem \
  --key=sealed-secrets-key.pem
kubectl label secret sealed-secrets-custom-key \
  --namespace=kube-system \
  sealedsecrets.bitnami.com/sealed-secrets-key=active
```

### High Availability Configuration

Configure the controller for high availability in production clusters.

```yaml
# infrastructure/sealed-secrets/helmrelease.yaml - HA configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sealed-secrets-controller
  namespace: flux-system
spec:
  interval: 1h
  chart:
    spec:
      chart: sealed-secrets
      version: ">=2.0.0"
      sourceRef:
        kind: HelmRepository
        name: sealed-secrets
  targetNamespace: kube-system
  values:
    fullnameOverride: sealed-secrets-controller
    # Pod disruption budget
    podDisruptionBudget:
      enabled: true
      minAvailable: 1
    # Node affinity for reliability
    affinity:
      podAntiAffinity:
        preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              topologyKey: kubernetes.io/hostname
              labelSelector:
                matchLabels:
                  app.kubernetes.io/name: sealed-secrets
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

### Network Policy

Restrict network access to the Sealed Secrets controller.

```yaml
# infrastructure/sealed-secrets/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: sealed-secrets-controller
  namespace: kube-system
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: sealed-secrets
  policyTypes:
    - Ingress
  ingress:
    # Allow the Kubernetes API server to reach the controller webhook
    - ports:
        - port: 8080
          protocol: TCP
```

## Backing Up the Controller Keys

Backing up the Sealed Secrets keys is critical for disaster recovery.

```bash
# Back up all Sealed Secrets keys
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key -o yaml > sealed-secrets-keys-backup.yaml

# Store this backup securely (password manager, vault, etc.)
# DO NOT commit this file to Git
```

## Troubleshooting

Common issues with the Sealed Secrets controller.

```bash
# Check if the HelmRelease is reconciled
flux get helmreleases -n flux-system sealed-secrets-controller

# Check controller logs for errors
kubectl logs -n kube-system deployment/sealed-secrets-controller

# Verify the controller version
kubectl get deployment sealed-secrets-controller -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'

# Check for SealedSecret events
kubectl get events -n default --field-selector involvedObject.kind=SealedSecret
```

Common problems include CRD version mismatches after upgrades, expired sealing keys when rotating, and the controller not being ready when SealedSecrets are first applied. Ensure the infrastructure Kustomization has proper dependency ordering so the controller is deployed before application secrets.

Deploying the Sealed Secrets controller through Flux CD ensures consistent, reproducible installations and makes it easy to manage controller upgrades and configuration changes through your standard GitOps workflow.
