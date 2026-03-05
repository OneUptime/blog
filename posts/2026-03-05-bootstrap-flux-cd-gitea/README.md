# How to Bootstrap Flux CD with Gitea

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Gitea, Self-Hosted, CI/CD

Description: Learn how to bootstrap Flux CD with Gitea, a lightweight self-hosted Git service, including token-based authentication and SSH key setup.

---

Gitea is a lightweight, self-hosted Git service that is easy to deploy and maintain. It is an excellent choice for teams that want full control over their Git infrastructure without the overhead of larger platforms. Flux CD supports Gitea through a dedicated `flux bootstrap gitea` command, making the setup process straightforward. This guide covers bootstrapping Flux CD with Gitea instances, including both cloud-hosted and self-hosted deployments.

## Prerequisites

- A running Kubernetes cluster (v1.26 or later)
- `kubectl` configured to access your cluster
- Flux CLI installed (v2.0 or later)
- A Gitea instance (self-hosted or cloud-hosted like Codeberg)
- A Gitea personal access token

## Step 1: Set Up Gitea

If you do not already have a Gitea instance, you can deploy one on Kubernetes using Helm.

```bash
# Add the Gitea Helm repository
helm repo add gitea-charts https://dl.gitea.com/charts/
helm repo update

# Install Gitea
helm install gitea gitea-charts/gitea \
  --namespace gitea \
  --create-namespace \
  --set gitea.admin.username=admin \
  --set gitea.admin.password=admin123 \
  --set service.http.type=LoadBalancer
```

Wait for the Gitea pod to become ready:

```bash
# Wait for Gitea to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=gitea -n gitea --timeout=120s

# Get the Gitea service URL
kubectl get svc gitea-http -n gitea
```

## Step 2: Create a Gitea Personal Access Token

Log in to your Gitea web interface and create a personal access token:

1. Navigate to Settings > Applications
2. Under "Manage Access Tokens", enter a token name (e.g., `flux-cd`)
3. Select permissions: `repo` (full control) and `admin:org` (if using organizations)
4. Click "Generate Token" and save the token

```bash
# Export the Gitea token and connection details
export GITEA_TOKEN=<your-gitea-personal-access-token>
export GITEA_USER=<your-gitea-username>
export GITEA_HOST=<your-gitea-hostname>  # e.g., gitea.example.com
```

## Step 3: Run Pre-flight Checks

Verify that your cluster is compatible with Flux CD.

```bash
# Run Flux pre-flight checks
flux check --pre
```

## Step 4: Bootstrap Flux CD with Gitea

Flux CLI has a built-in `bootstrap gitea` command that handles the entire setup process.

```bash
# Bootstrap Flux CD with Gitea
flux bootstrap gitea \
  --hostname=$GITEA_HOST \
  --owner=$GITEA_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

This command will:

1. Connect to your Gitea instance at the specified hostname
2. Create the `fleet-infra` repository if it does not exist
3. Generate and push Flux component manifests
4. Install the Flux controllers on your cluster
5. Configure a deploy key on the Gitea repository
6. Set up continuous reconciliation

For Gitea instances running behind HTTPS with a custom port:

```bash
# Bootstrap with a custom port and HTTPS
flux bootstrap gitea \
  --hostname=$GITEA_HOST:3000 \
  --owner=$GITEA_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

## Step 5: Bootstrap with a Gitea Organization

If you use Gitea organizations to manage repositories, omit the `--personal` flag.

```bash
# Bootstrap with a Gitea organization
flux bootstrap gitea \
  --hostname=$GITEA_HOST \
  --owner=my-organization \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production
```

The token must have permission to create repositories in the organization.

## Step 6: Bootstrap with Token Authentication

By default, Flux uses SSH deploy keys. If SSH is not available or you prefer token-based HTTPS authentication, use the `--token-auth` flag.

```bash
# Bootstrap using token-based HTTPS authentication
flux bootstrap gitea \
  --hostname=$GITEA_HOST \
  --owner=$GITEA_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal \
  --token-auth
```

With `--token-auth`, Flux stores the token in a Kubernetes secret and uses it for HTTPS Git operations instead of SSH.

## Step 7: Handle Self-Signed Certificates

If your Gitea instance uses self-signed TLS certificates, provide the CA certificate.

```bash
# Bootstrap with a custom CA certificate
flux bootstrap gitea \
  --hostname=$GITEA_HOST \
  --owner=$GITEA_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal \
  --ca-file=./gitea-ca.crt
```

## Step 8: Verify the Installation

Check that all Flux components are running and syncing.

```bash
# Run the health check
flux check

# View Git sources
flux get sources git

# View kustomizations
flux get kustomizations

# List all pods in the flux-system namespace
kubectl get pods -n flux-system
```

You should see all four controllers running: source-controller, kustomize-controller, helm-controller, and notification-controller.

## Step 9: Deploy an Application Through GitOps

Add application manifests to the repository to test the workflow.

```yaml
# clusters/production/apps.yaml
# Kustomization that points to the apps directory
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m0s
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - podinfo.yaml
```

```yaml
# apps/production/podinfo.yaml
# Deploy podinfo as a HelmRelease
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  interval: 1h0s
  url: https://stefanprodan.github.io/podinfo
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: podinfo
  namespace: default
spec:
  interval: 5m0s
  chart:
    spec:
      chart: podinfo
      version: "6.5.*"
      sourceRef:
        kind: HelmRepository
        name: podinfo
        namespace: flux-system
  values:
    replicaCount: 2
    ingress:
      enabled: false
```

Commit and push these files to the repository. Then trigger an immediate reconciliation:

```bash
# Force reconciliation
flux reconcile source git flux-system
flux reconcile kustomization flux-system

# Watch the apps kustomization
flux get kustomizations --watch

# Verify the HelmRelease
flux get helmreleases

# Check the deployed pods
kubectl get pods -l app.kubernetes.io/name=podinfo
```

## Step 10: Using Codeberg (Gitea-Based Hosting)

Codeberg is a public Gitea instance that you can use with Flux CD in the same way. Simply set the hostname to `codeberg.org`.

```bash
# Bootstrap Flux with Codeberg
flux bootstrap gitea \
  --hostname=codeberg.org \
  --owner=<your-codeberg-username> \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

## Troubleshooting

Common issues when using Gitea with Flux:

```bash
# Verify connectivity to the Gitea instance
curl -s https://$GITEA_HOST/api/v1/version

# Check if the deploy key was created
curl -s -H "Authorization: token $GITEA_TOKEN" \
  https://$GITEA_HOST/api/v1/repos/$GITEA_USER/fleet-infra/keys

# For SSH issues, test the connection
ssh -T git@$GITEA_HOST

# Check Flux logs for errors
flux logs --level=error

# View source-controller logs specifically
kubectl logs -n flux-system deploy/source-controller --tail=50

# Re-bootstrap to fix drift (idempotent operation)
flux bootstrap gitea \
  --hostname=$GITEA_HOST \
  --owner=$GITEA_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=./clusters/production \
  --personal
```

## Summary

Gitea is an excellent self-hosted Git solution for teams that want lightweight infrastructure with full GitOps capabilities. Flux CD's dedicated `flux bootstrap gitea` command makes the setup as simple as with GitHub or GitLab. Whether you run Gitea on-premises, in your Kubernetes cluster, or use a hosted service like Codeberg, the bootstrap process handles repository creation, authentication setup, and controller installation automatically. The lightweight nature of both Gitea and Flux CD makes this combination ideal for resource-constrained environments and edge computing scenarios.
