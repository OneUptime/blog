# How to Set Up Flux CD on Google Anthos Bare Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Google Anthos, Bare Metal, Multi-Cloud

Description: Deploy Flux CD on Google Anthos for Bare Metal clusters, enabling GitOps-driven workload management on on-premises and edge infrastructure registered with Google Cloud.

---

## Introduction

Google Anthos for Bare Metal (ABM) allows you to run Google Cloud's managed Kubernetes service on your own physical servers, without a hypervisor layer. It brings GKE-compatible Kubernetes, GCP IAM integration, and Google Cloud's fleet management capabilities to on-premises data centers. This makes it ideal for organizations with data residency requirements or existing hardware investments that still want GCP-native tooling.

Flux CD on Anthos Bare Metal provides an additional GitOps layer on top of Anthos's built-in configuration management. While Anthos Config Management (ACM) is the Google-native option, many teams prefer Flux for its flexibility, rich ecosystem, and upstream CNCF standing. Flux and ACM can coexist, with Flux handling application-level GitOps and ACM handling policy enforcement.

This guide covers deploying Flux CD on an Anthos Bare Metal cluster, configuring Workload Identity Federation for GCP service access, and integrating with Google Artifact Registry.

## Prerequisites

- Google Anthos Bare Metal cluster provisioned (using `bmctl`)
- `kubectl` configured with the ABM cluster kubeconfig
- `flux` CLI on your workstation
- A Git repository for Flux CD bootstrap
- Google Cloud project with GKE Enterprise and Artifact Registry APIs enabled
- Workload Identity Federation configured for the Anthos Bare Metal cluster

## Step 1: Verify Anthos Bare Metal Cluster Access

```bash
# Your ABM cluster kubeconfig is typically at:

export KUBECONFIG=~/bmctl-workspace/my-abm-cluster/my-abm-cluster-kubeconfig

# Verify cluster is ready
kubectl get nodes
# Expected:
# NAME        STATUS   ROLES           AGE
# abm-cp-1    Ready    control-plane   30m
# abm-cp-2    Ready    control-plane   28m
# abm-cp-3    Ready    control-plane   26m
# abm-wk-1    Ready    <none>          20m
# abm-wk-2    Ready    <none>          18m

# Verify Anthos components are running
kubectl get pods -n kube-system | grep -E "anthos|gke"
```

## Step 2: Configure Workload Identity Federation for Flux (GCP Service Account Integration)

Anthos Bare Metal supports Workload Identity Federation for authenticating workloads to GCP services without long-lived service account keys. Configure it for Flux's image reflector controller and source controller to access Artifact Registry:

```bash
# Create a GCP service account for Flux
gcloud iam service-accounts create flux-abm \
  --display-name="Flux CD for ABM" \
  --project=my-gcp-project

# Grant Artifact Registry read access
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:flux-abm@my-gcp-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Enable Workload Identity binding
gcloud iam service-accounts add-iam-policy-binding \
  flux-abm@my-gcp-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/subject/system:serviceaccount:flux-system:image-reflector-controller"

gcloud iam service-accounts add-iam-policy-binding \
  flux-abm@my-gcp-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "principal://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/subject/system:serviceaccount:flux-system:source-controller"
```

## Step 3: Bootstrap Flux CD on Anthos Bare Metal

```bash
export GITHUB_TOKEN=ghp_your_github_token

flux bootstrap github \
  --components-extra=image-reflector-controller,image-automation-controller \
  --owner=my-org \
  --repository=anthos-fleet \
  --branch=main \
  --path=clusters/anthos-bare-metal \
  --personal

# Verify all Flux controllers are running
kubectl get pods -n flux-system
```

## Step 4: Configure Image Reflector for GCP Artifact Registry

```yaml
# clusters/anthos-bare-metal/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: ServiceAccount
      name: image-reflector-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: image-reflector-controller
        namespace: flux-system
        annotations:
          iam.gke.io/gcp-service-account: flux-abm@my-gcp-project.iam.gserviceaccount.com
          gcp.auth.fluxcd.io/workload-identity-provider: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
  - target:
      kind: Deployment
      name: image-reflector-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --feature-gates=ObjectLevelWorkloadIdentity=true
  - target:
      kind: ServiceAccount
      name: source-controller
    patch: |
      apiVersion: v1
      kind: ServiceAccount
      metadata:
        name: source-controller
        namespace: flux-system
        annotations:
          iam.gke.io/gcp-service-account: flux-abm@my-gcp-project.iam.gserviceaccount.com
          gcp.auth.fluxcd.io/workload-identity-provider: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --feature-gates=ObjectLevelWorkloadIdentity=true
```

```yaml
# clusters/anthos-bare-metal/flux-system/artifact-registry-imagerepository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  # Google Artifact Registry URL
  image: us-central1-docker.pkg.dev/my-gcp-project/my-repo/myapp
  interval: 5m
  provider: gcp  # Use GCP Workload Identity for authentication
  serviceAccountName: image-reflector-controller
```

## Step 5: Deploy Applications via Flux on ABM

```yaml
# clusters/anthos-bare-metal/apps/myapp/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: myapp-charts
  namespace: flux-system
spec:
  url: oci://us-central1-docker.pkg.dev/my-gcp-project/helm-charts
  type: oci
  interval: 10m
  provider: gcp
  serviceAccountName: source-controller
```

```yaml
# clusters/anthos-bare-metal/apps/myapp/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: default
  chart:
    spec:
      chart: myapp
      version: ">=1.0.0"
      sourceRef:
        kind: HelmRepository
        name: myapp-charts
        namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: us-central1-docker.pkg.dev/my-gcp-project/my-repo/myapp
```

## Step 6: Integrate with Google Cloud Monitoring

After Google Cloud Managed Service for Prometheus managed collection is installed on the ABM cluster, add a `PodMonitoring` resource to scrape Flux controller metrics:

```yaml
# clusters/anthos-bare-metal/monitoring/flux-podmonitoring.yaml
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: flux-controllers
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  endpoints:
    - port: http-prom
      interval: 60s
```

## Step 7: Verify Fleet Registration and Flux Status

```bash
# Verify the cluster is registered in Anthos fleet
gcloud container fleet memberships list \
  --project=my-gcp-project

# Check Flux reconciliation status
flux get all

# View Flux system pods on ABM nodes
kubectl get pods -n flux-system -o wide

# Check Google Cloud Logging for Flux controller logs
gcloud logging read \
  'resource.type="k8s_container" AND resource.labels.namespace_name="flux-system"' \
  --project=my-gcp-project \
  --limit=50
```

## Best Practices

- Use Workload Identity Federation on Anthos Bare Metal for all GCP service integrations (Artifact Registry, Secret Manager, GCS) to avoid service account key files on nodes.
- Separate Flux from Anthos Config Management by having Flux own application-layer resources and ACM own cluster-layer policies (NetworkPolicy, ResourceQuota, PodSecurity).
- Use Google Artifact Registry with OCI HelmRepository sources in Flux for a seamless GCP-native chart distribution workflow.
- Enable Anthos Service Mesh for mTLS between Flux-managed services on ABM to meet data-in-transit encryption requirements.
- Register all ABM clusters in a Google Cloud Fleet and use fleet-level policy tooling for consistent cluster policy across all clusters.

## Conclusion

Deploying Flux CD on Google Anthos for Bare Metal creates a powerful combination of Google Cloud's fleet management capabilities with the flexibility of upstream Flux CD GitOps. Organizations that need to run Kubernetes on-premises while maintaining GCP-native tooling for identity, monitoring, and artifact management get the best of both worlds: Anthos for infrastructure management and Flux for application-level GitOps.
