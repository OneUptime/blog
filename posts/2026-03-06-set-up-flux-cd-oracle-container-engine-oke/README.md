# How to Set Up Flux CD on Oracle Container Engine for Kubernetes (OKE)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Oracle Cloud, OKE, Kubernetes, GitOps, Ocir, Oci vault

Description: A step-by-step guide to setting up Flux CD on Oracle Container Engine for Kubernetes (OKE) with OCIR registry integration and OCI Vault for secrets management.

---

## Introduction

Oracle Container Engine for Kubernetes (OKE) is Oracle Cloud Infrastructure's managed Kubernetes service. Combining OKE with Flux CD gives you a powerful GitOps workflow that leverages Oracle's cloud-native services including the Oracle Cloud Infrastructure Registry (OCIR) and OCI Vault for secrets management.

This guide walks you through bootstrapping Flux CD on an OKE cluster, configuring OCIR as your container registry, and integrating OCI Vault for secure secrets handling.

## Prerequisites

Before you begin, ensure you have the following:

- An Oracle Cloud Infrastructure (OCI) account with appropriate permissions
- OCI CLI installed and configured
- kubectl installed
- Flux CLI installed
- A GitHub or GitLab account for your Git repository
- An OKE cluster running Kubernetes 1.25 or later

## Step 1: Create an OKE Cluster

If you do not already have an OKE cluster, create one using the OCI CLI.

```bash
# Create a VCN for the cluster
oci network vcn create \
  --compartment-id $COMPARTMENT_ID \
  --display-name "flux-vcn" \
  --cidr-blocks '["10.0.0.0/16"]'

# Create the OKE cluster
oci ce cluster create \
  --compartment-id $COMPARTMENT_ID \
  --name "flux-oke-cluster" \
  --kubernetes-version "v1.28.2" \
  --vcn-id $VCN_ID \
  --service-lb-subnet-ids '["'$SUBNET_ID'"]'
```

Once the cluster is created, configure kubectl access:

```bash
# Generate the kubeconfig file
oci ce cluster create-kubeconfig \
  --cluster-id $CLUSTER_ID \
  --file $HOME/.kube/config \
  --region us-ashburn-1 \
  --token-version 2.0.0

# Verify connectivity
kubectl get nodes
```

## Step 2: Set Up OCIR (Oracle Cloud Infrastructure Registry)

OCIR is Oracle's managed container registry. You need to create an auth token to allow Flux to pull images from OCIR.

```bash
# Create an auth token for OCIR access
oci iam auth-token create \
  --user-id $USER_OCID \
  --description "Flux CD OCIR access"
```

Save the token value securely. You will need it to create a Kubernetes secret.

```bash
# Create a Kubernetes secret for OCIR access
# The username format is <tenancy-namespace>/<username>
kubectl create secret docker-registry ocir-secret \
  --namespace flux-system \
  --docker-server=<region-code>.ocir.io \
  --docker-username="<tenancy-namespace>/<username>" \
  --docker-password="<auth-token>" \
  --docker-email="your-email@example.com"
```

## Step 3: Set Up a Git Repository

Create a Git repository to store your Flux configuration and Kubernetes manifests.

```bash
# Create the repository structure
mkdir -p flux-oke-config/{clusters/oke-production,apps,infrastructure}

# Initialize Git
cd flux-oke-config
git init
git remote add origin https://github.com/<your-org>/flux-oke-config.git
```

## Step 4: Bootstrap Flux CD on OKE

Export your GitHub credentials and bootstrap Flux onto the OKE cluster.

```bash
# Export GitHub credentials
export GITHUB_TOKEN=<your-github-token>
export GITHUB_USER=<your-github-username>

# Bootstrap Flux CD
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=flux-oke-config \
  --branch=main \
  --path=clusters/oke-production \
  --personal
```

Verify the bootstrap was successful:

```bash
# Check Flux components are running
flux check

# List all Flux resources
kubectl get all -n flux-system
```

## Step 5: Configure OCIR as an Image Source

Create an ImageRepository resource to tell Flux where to scan for container images in OCIR.

```yaml
# clusters/oke-production/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # OCIR endpoint format: <region>.ocir.io/<tenancy-namespace>/<repo-name>
  image: iad.ocir.io/mytenancy/my-app
  interval: 5m
  secretRef:
    # Reference the OCIR docker-registry secret
    name: ocir-secret
```

Create an ImagePolicy to define which tags Flux should track:

```yaml
# clusters/oke-production/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Track all stable semver tags
      range: ">=1.0.0"
```

## Step 6: Integrate OCI Vault for Secrets Management

OCI Vault provides centralized secrets management. You can integrate it with Flux using the External Secrets Operator.

First, install the External Secrets Operator:

```yaml
# infrastructure/external-secrets/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: external-secrets

---
# infrastructure/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 30m
  chart:
    spec:
      chart: external-secrets
      version: "0.9.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: external-secrets
  values:
    # Install CRDs with the chart
    installCRDs: true
```

Add the Helm repository source:

```yaml
# infrastructure/external-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 1h
  url: https://charts.external-secrets.io
```

Configure a SecretStore pointing to OCI Vault:

```yaml
# infrastructure/external-secrets/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: oci-vault
spec:
  provider:
    oracle:
      # The OCID of the OCI Vault
      vault: ocid1.vault.oc1.iad.xxxxxxxxxxxx
      # The OCI region
      region: us-ashburn-1
      auth:
        secretRef:
          privatekey:
            name: oci-credentials
            namespace: external-secrets
            key: private-key
          fingerprint:
            name: oci-credentials
            namespace: external-secrets
            key: fingerprint
          tenancy:
            name: oci-credentials
            namespace: external-secrets
            key: tenancy
          user:
            name: oci-credentials
            namespace: external-secrets
            key: user
```

Create an ExternalSecret to pull secrets from OCI Vault:

```yaml
# apps/my-app/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: my-app-secrets
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: oci-vault
    kind: ClusterSecretStore
  target:
    # The Kubernetes secret that will be created
    name: my-app-secrets
    creationPolicy: Owner
  data:
    - secretKey: database-password
      remoteRef:
        # The secret OCID in OCI Vault
        key: ocid1.vaultsecret.oc1.iad.xxxxxxxxxxxx
```

## Step 7: Deploy an Application

Create a Kustomization to deploy your application from the Git repository:

```yaml
# clusters/oke-production/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  # Retry on failure
  retryInterval: 2m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
  wait: true
  timeout: 5m
```

Create your application manifests:

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          # Image from OCIR - Flux will update the tag via image automation
          image: iad.ocir.io/mytenancy/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef:
                # Reference secrets pulled from OCI Vault
                name: my-app-secrets
      imagePullSecrets:
        - name: ocir-secret
```

## Step 8: Set Up Notifications

Configure Flux to send deployment notifications:

```yaml
# clusters/oke-production/notifications.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook-url

---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: deployment-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  # Watch for events from these Flux resources
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 9: Verify the Setup

Run the following commands to verify everything is working:

```bash
# Check all Flux resources are reconciled
flux get all

# Check image repositories are scanning
flux get image repository

# Check kustomizations are applied
flux get kustomizations

# View recent Flux events
flux events
```

## Troubleshooting

### OCIR Authentication Failures

If Flux cannot pull images from OCIR, verify your auth token and secret:

```bash
# Test OCIR login manually
docker login <region>.ocir.io -u "<tenancy-namespace>/<username>"

# Check the secret exists in the correct namespace
kubectl get secret ocir-secret -n flux-system -o yaml
```

### OKE API Server Connectivity

If Flux controllers cannot reach the Kubernetes API:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deployment/source-controller

# Verify cluster networking
kubectl get events -n flux-system --sort-by='.lastTimestamp'
```

### OCI Vault Access Issues

If External Secrets cannot read from OCI Vault:

```bash
# Check the ExternalSecret status
kubectl describe externalsecret my-app-secrets -n default

# Verify the ClusterSecretStore is healthy
kubectl describe clustersecretstore oci-vault
```

## Conclusion

You now have Flux CD running on Oracle Container Engine for Kubernetes with OCIR integration for container images and OCI Vault for secrets management. This GitOps setup ensures that your OKE cluster state is always in sync with your Git repository, providing a reliable and auditable deployment workflow. As your infrastructure grows, you can extend this setup with additional Kustomizations, HelmReleases, and image automation policies.
