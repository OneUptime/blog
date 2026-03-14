# How to Deploy Nexus Repository Manager with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Nexus, Artifact Management, DevOps

Description: Deploy Sonatype Nexus Repository Manager to Kubernetes using Flux CD for GitOps-driven artifact storage and proxy management.

---

## Introduction

Sonatype Nexus Repository Manager is the industry-standard artifact repository for storing, organizing, and distributing binaries-Maven JARs, npm packages, Docker images, PyPI packages, and more. Running Nexus on Kubernetes centralizes artifact management for all your teams and pipelines in a single, highly available service.

With Flux CD managing the deployment, your Nexus configuration is version-controlled in Git. HelmRelease resources track the official chart, and Flux's reconciliation loop ensures your running instance always matches the declared state. Any drift-caused by manual `kubectl` edits or node restarts-is automatically corrected.

This guide walks you through deploying Nexus OSS (open-source edition) using the Sonatype Helm chart, configuring persistent storage, and exposing Nexus through an Ingress controller.

## Prerequisites

- A Kubernetes cluster (v1.26+) with Flux CD bootstrapped
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
      chart: nexus-repository-manager
      version: ">=61.0.0 <62.0.0"
      sourceRef:
        kind: HelmRepository
        name: sonatype
        namespace: flux-system
  values:
    # Nexus application settings
    nexus:
      imageTag: 3.66.0
      resources:
        requests:
          cpu: 500m
          memory: 2Gi
        limits:
          cpu: "2"
          memory: 4Gi
      # Set the Java heap size for Nexus
      env:
        - name: INSTALL4J_ADD_VM_PARAMS
          value: "-Xms1g -Xmx2g -XX:MaxDirectMemorySize=2g"

    # Persistent volume for Nexus data directory
    persistence:
      enabled: true
      storageClass: standard
      accessMode: ReadWriteOnce
      storage: 100Gi

    # Ingress configuration
    ingress:
      enabled: true
      ingressClassName: nginx
      annotations:
        nginx.ingress.kubernetes.io/proxy-body-size: "0"  # Unlimited upload size
      rules:
        - host: nexus.example.com
          http:
            paths:
              - path: /
                pathType: Prefix
                backend:
                  service:
                    name: nexus-nexus-repository-manager
                    port:
                      number: 8081

    # Docker registry sub-domain ingress (port 5000)
    nexusProxyRoute:
      enabled: false
```

## Step 4: Add a Kustomization

```yaml
# clusters/my-cluster/nexus/kustomization.yaml
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

After Nexus starts, the admin password is stored inside the container:

```bash
# Wait for the pod to be Running
kubectl wait --for=condition=ready pod -l app=nexus-nexus-repository-manager \
  -n nexus --timeout=300s

# Retrieve the initial admin password
kubectl exec -n nexus \
  $(kubectl get pod -n nexus -l app=nexus-nexus-repository-manager -o name) \
  -- cat /nexus-data/admin.password
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
- Enable the `nexus.scripts.allowCreation` flag only during initial setup; disable it afterward for security.
- Configure a `PodDisruptionBudget` if running the paid HA edition to protect against simultaneous node drains.
- Set up Nexus IQ Server integration (if licensed) via Helm values to enable component lifecycle management.

## Conclusion

Nexus Repository Manager is now fully managed by Flux CD. Any change to chart versions, resource limits, or ingress rules goes through Git, giving your team a clean audit trail and straightforward rollback path. Combined with Flux's automated drift correction, your artifact repository will remain consistent with your declared configuration regardless of what happens at the cluster level.
