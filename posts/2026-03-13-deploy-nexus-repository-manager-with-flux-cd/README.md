# How to Deploy Nexus Repository Manager with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Nexus, Artifact Management, DevOps

Description: Deploy Sonatype Nexus Repository Manager to Kubernetes using Flux CD for GitOps-driven artifact storage and proxy management.

---

## Introduction

Sonatype Nexus Repository Manager is the industry-standard artifact repository for storing, organizing, and distributing binaries-Maven JARs, npm packages, Docker images, PyPI packages, and more. Running Nexus on Kubernetes centralizes artifact management for all your teams and pipelines in a single, resilient service.

With Flux CD managing the deployment, your Nexus configuration is version-controlled in Git. HelmRelease resources track the official chart, and Flux's reconciliation loop ensures your running instance always matches the declared state. Any drift-caused by manual `kubectl` edits or node restarts-is automatically corrected.

This guide walks you through deploying Nexus Repository Pro using Sonatype's supported HA/resiliency Helm chart, configuring persistent storage, and exposing Nexus through an Ingress controller.

## Prerequisites

- A Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- A Nexus Repository Pro license and an external PostgreSQL database
- A `StorageClass` that provisions `ReadWriteOnce` persistent volumes
- An Ingress controller (e.g., ingress-nginx) installed in the cluster
- `flux` and `kubectl` CLIs installed locally

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/nexus/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: nexus
```

Commit and push this file to your fleet repository. Flux will create the namespace on the next reconciliation cycle.

## Step 2: Register the Sonatype Helm Repository

```yaml
# clusters/my-cluster/nexus/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: sonatype
  namespace: flux-system
spec:
  url: https://sonatype.github.io/helm3-charts/
  interval: 12h
```

## Step 3: Create the HelmRelease for Nexus

```yaml
# clusters/my-cluster/nexus/nexus-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nexus
  namespace: nexus
spec:
  interval: 10m
  chart:
    spec:
      chart: nxrm-ha
      version: ">=92.0.0 <93.0.0"
      sourceRef:
        kind: HelmRepository
        name: sonatype
        namespace: flux-system
  values:
    namespaces:
      nexusNs:
        enabled: false
        name: nexus

    # Nexus application settings
    statefulset:
      replicaCount: 1
      clustered: false
      container:
        image:
          nexusTag: 3.92.1
        env:
          nexusDBName: nexus
          nexusDBPort: 5432
          install4jAddVmParams: "-Xms2703m -Xmx2703m"
        resources:
          requests:
            cpu: "4"
            memory: 8Gi
          limits:
            cpu: "8"
            memory: 16Gi

    # PostgreSQL, initial admin password, and license inputs
    secret:
      dbSecret:
        enabled: true
      db:
        host: postgres.example.com
        user: nxrm_db_user
        password: change-me
      nexusAdminSecret:
        enabled: true
        adminPassword: change-me
      license:
        licenseSecret:
          enabled: true
          fileContentsBase64: BASE64_ENCODED_LICENSE_FILE

    # Service and persistent volume for Nexus data
    service:
      nexus:
        enabled: true
        type: ClusterIP
        port: 80
        targetPort: 8081

    storageClass:
      enabled: false
      name: standard

    pvc:
      accessModes: ReadWriteOnce
      storage: 100Gi

    # Docker registry connector support
    nexus:
      docker:
        enabled: false

    # Resource requests for log sidecars
    requestLogContainer:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 200m
          memory: 512Mi

    # Ingress configuration
    ingress:
      enabled: true
      host: nexus.example.com
      hostPath: /
      defaultRule: true
      ingressClassName: nginx
      annotations:
        nginx.ingress.kubernetes.io/proxy-body-size: "0"  # Unlimited upload size
```

## Step 4: Add a Kustomization

```yaml
# clusters/my-cluster/flux-system/nexus-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nexus
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/nexus
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: nexus
      namespace: nexus
```

## Step 5: Retrieve the Initial Admin Password

After Nexus starts, the initial admin password is stored in the Kubernetes Secret created by the chart:

```bash
# Wait for the pod to be Running
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=nxrm-ha,app.kubernetes.io/instance=nexus \
  -n nexus --timeout=300s

# Retrieve the configured initial admin password
kubectl get secret nxrm-ha-adminsecret -n nexus \
  -o jsonpath='{.data.nexus-admin-password}' | base64 --decode
```

Open `https://nexus.example.com`, log in with `admin` and the retrieved password, then follow the setup wizard.

## Step 6: Verify Flux Reconciliation

```bash
# Check all resources in the nexus namespace
flux get all -n nexus

# Inspect HelmRelease events
kubectl describe helmrelease nexus -n nexus

# Force a manual reconciliation
flux reconcile kustomization nexus --with-source
```

## Best Practices

- Store the admin password and any proxy credentials in Sealed Secrets or Vault, never in plain Git.
- Use a dedicated `StorageClass` backed by fast storage (SSD) for the Nexus data volume-artifact uploads are I/O intensive.
- Use an external PostgreSQL database for Kubernetes deployments; Sonatype does not support Helm deployments with an embedded database.
- Configure a `PodDisruptionBudget` if running a multi-replica HA deployment to protect against simultaneous node drains.
- Set up Nexus IQ Server integration (if licensed) via Helm values to enable component lifecycle management.

## Conclusion

Nexus Repository Manager is now fully managed by Flux CD. Any change to chart versions, resource limits, or ingress rules goes through Git, giving your team a clean audit trail and straightforward rollback path. Combined with Flux's automated drift correction, your artifact repository will remain consistent with your declared configuration regardless of what happens at the cluster level.
