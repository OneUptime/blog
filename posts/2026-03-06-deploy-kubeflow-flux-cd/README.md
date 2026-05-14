# How to Deploy Kubeflow with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubeflow, Kubernetes, GitOps, Machine Learning, MLOps, Helm

Description: A practical guide to deploying Kubeflow on Kubernetes using Flux CD for GitOps-managed machine learning platform operations.

---

## Introduction

Kubeflow is the machine learning toolkit for Kubernetes, providing components for building and deploying ML pipelines, notebook servers, model training, and model serving. Deploying Kubeflow with Flux CD brings GitOps practices to your MLOps platform, ensuring that all configuration changes are version-controlled, auditable, and reproducible.

This guide covers deploying Kubeflow's core components including Pipelines, Notebooks, KServe, and training operators using Flux CD.

## Prerequisites

- A Kubernetes cluster (v1.27 to v1.29 for Kubeflow manifests v1.9.0) with at least 16GB RAM and 4 CPUs per node
- Flux CD installed and bootstrapped
- kubectl and kustomize 5.2.1 or later installed
- A default StorageClass configured in the cluster
- cert-manager installed for TLS certificate management

## Repository Structure

```text
clusters/
  production/
    kubeflow/
      namespace.yaml
      sources/
        kubeflow-manifests.yaml
      components/
        istio.yaml
        oauth2-proxy.yaml
        dex.yaml
        kubeflow-roles.yaml
        kubeflow-istio-resources.yaml
        profiles.yaml
        pipelines.yaml
        notebooks.yaml
        kserve.yaml
        training-operator.yaml
      profiles/
        kustomization.yaml
        data-science-team.yaml
      kustomization.yaml
    kubeflow.yaml
```

## Step 1: Create Required Namespaces

Kubeflow uses several namespaces for its components.

```yaml
# clusters/production/kubeflow/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: kubeflow
  labels:
    # Istio sidecar injection for service mesh
    istio-injection: enabled
    app.kubernetes.io/part-of: kubeflow
---
apiVersion: v1
kind: Namespace
metadata:
  name: auth
  labels:
    app.kubernetes.io/part-of: kubeflow
```

## Step 2: Configure the Git Source for Kubeflow Manifests

Kubeflow uses kustomize-based manifests from its official repository.

```yaml
# clusters/production/kubeflow/sources/kubeflow-manifests.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: kubeflow-manifests
  namespace: flux-system
spec:
  # Official Kubeflow manifests repository
  url: https://github.com/kubeflow/manifests.git
  ref:
    # Pin to a specific release tag for stability
    tag: v1.9.0
  interval: 1h
  # Ignore files not needed for deployment
  ignore: |
    # Exclude test and CI files
    /tests/
    /.github/
```

## Step 3: Deploy Istio Service Mesh

Kubeflow requires Istio for networking and security.

```yaml
# clusters/production/kubeflow/components/istio.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-istio-namespace
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/istio-1-22/istio-namespace/base
  prune: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-istio-crds
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-istio-namespace
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  # Path to Istio manifests in the Kubeflow repo
  path: ./common/istio-1-22/istio-crds/base
  prune: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-istio-install
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-istio-crds
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/istio-1-22/istio-install/overlays/oauth2-proxy
  prune: true
  timeout: 10m
---
# clusters/production/kubeflow/components/kubeflow-istio-resources.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-istio-resources
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-istio-install
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/istio-1-22/kubeflow-istio-resources/base
  prune: true
  timeout: 5m
```

## Step 4: Deploy Dex for Authentication

Configure Dex as the identity provider for Kubeflow.

```yaml
# clusters/production/kubeflow/components/oauth2-proxy.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-oauth2-proxy
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-istio-install
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/oidc-client/oauth2-proxy/overlays/m2m-self-signed
  prune: true
  timeout: 10m
---
# clusters/production/kubeflow/components/dex.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-dex
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-oauth2-proxy
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/dex/overlays/oauth2-proxy
  prune: true
  timeout: 5m
  # Patch the default user's password hash with your own bcrypt hash
  patches:
    - patch: |
        apiVersion: v1
        kind: Secret
        metadata:
          name: dex-passwords
          namespace: auth
        stringData:
          DEX_USER_PASSWORD: "REPLACE_WITH_BCRYPT_HASH"
      target:
        kind: Secret
        name: dex-passwords
```

## Step 5: Deploy Kubeflow Pipelines

Kubeflow Pipelines is the core component for building ML workflows.

```yaml
# clusters/production/kubeflow/components/kubeflow-roles.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-roles
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/kubeflow-roles/base
  prune: true
  timeout: 5m
---
# clusters/production/kubeflow/components/pipelines.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-pipelines
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-dex
    - name: kubeflow-roles
    - name: kubeflow-profiles
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./apps/pipeline/upstream/env/cert-manager/platform-agnostic-multi-user
  prune: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ml-pipeline
      namespace: kubeflow
    - apiVersion: apps/v1
      kind: Deployment
      name: ml-pipeline-ui
      namespace: kubeflow
```

## Step 6: Deploy Notebook Servers

Enable Jupyter notebook servers for interactive ML development.

```yaml
# clusters/production/kubeflow/components/notebooks.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-notebooks
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-pipelines
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./apps/jupyter/notebook-controller/upstream/overlays/kubeflow
  prune: true
  timeout: 10m
---
# Jupyter Web App for notebook management UI
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-jupyter-web-app
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-notebooks
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./apps/jupyter/jupyter-web-app/upstream/overlays/istio
  prune: true
  timeout: 5m
```

## Step 7: Deploy KServe for Model Serving

KServe enables model inference on Kubernetes. Install Knative first if you want KServe's serverless deployment mode.

```yaml
# clusters/production/kubeflow/components/kserve.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-knative-serving
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-istio-install
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/knative/knative-serving/overlays/gateways
  prune: true
  timeout: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-cluster-local-gateway
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-knative-serving
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./common/istio-1-22/cluster-local-gateway/base
  prune: true
  timeout: 10m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-kserve
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-cluster-local-gateway
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./contrib/kserve/kserve
  prune: true
  timeout: 10m
---
# KServe models web app
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-kserve-web-app
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-kserve
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./contrib/kserve/models-web-app/overlays/kubeflow
  prune: true
  timeout: 5m
```

## Step 8: Deploy the Training Operator

The training operator manages distributed training jobs for TensorFlow, PyTorch, and others.

```yaml
# clusters/production/kubeflow/components/training-operator.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-training-operator
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-pipelines
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./apps/training-operator/upstream/overlays/kubeflow
  prune: true
  timeout: 10m
```

## Step 9: Configure Kubeflow Profiles

Create user profiles for multi-tenancy.

```yaml
# clusters/production/kubeflow/components/profiles.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-profiles
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-dex
    - name: kubeflow-roles
  sourceRef:
    kind: GitRepository
    name: kubeflow-manifests
  path: ./apps/profiles/upstream/overlays/kubeflow
  prune: true
  timeout: 10m
---
# Reconcile Profile resources only after the Profile CRD and controller exist
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow-user-profiles
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: kubeflow-profiles
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/kubeflow/profiles
  prune: true
  timeout: 5m
---
# clusters/production/kubeflow/profiles/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - data-science-team.yaml
---
# clusters/production/kubeflow/profiles/data-science-team.yaml
apiVersion: kubeflow.org/v1
kind: Profile
metadata:
  name: data-science-team
spec:
  # Owner of the profile/namespace
  owner:
    kind: User
    name: ds-lead@example.com
  # Resource quota for the team namespace
  resourceQuotaSpec:
    hard:
      cpu: "32"
      memory: 64Gi
      nvidia.com/gpu: "4"
      requests.storage: 500Gi
      persistentvolumeclaims: "20"
---
apiVersion: kubeflow.org/v1
kind: Profile
metadata:
  name: ml-engineering
spec:
  owner:
    kind: User
    name: ml-lead@example.com
  resourceQuotaSpec:
    hard:
      cpu: "64"
      memory: 128Gi
      nvidia.com/gpu: "8"
      requests.storage: 1Ti
```

## Step 10: Create the Master Kustomization

Tie all components together with dependency ordering.

```yaml
# clusters/production/kubeflow/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - sources/kubeflow-manifests.yaml
  - components/istio.yaml
  - components/oauth2-proxy.yaml
  - components/dex.yaml
  - components/kubeflow-roles.yaml
  - components/kubeflow-istio-resources.yaml
  - components/profiles.yaml
  - components/pipelines.yaml
  - components/notebooks.yaml
  - components/kserve.yaml
  - components/training-operator.yaml
---
# clusters/production/kubeflow.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubeflow
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/kubeflow
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 30m
```

## Step 11: Verify the Deployment

```bash
# Check all Flux Kustomizations for Kubeflow
flux get kustomizations | grep kubeflow

# Verify all pods are running in the kubeflow namespace
kubectl get pods -n kubeflow

# Check Istio gateway
kubectl get gateway -n kubeflow

# Verify Kubeflow Pipelines API
kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80

# Check user profiles
kubectl get profiles

# Verify KServe is ready
kubectl get inferenceservice -A
```

## Troubleshooting

```bash
# If Istio injection is not working
kubectl label namespace kubeflow istio-injection=enabled --overwrite

# If Pipelines fail to connect to the database
kubectl logs -n kubeflow deployment/ml-pipeline -c ml-pipeline-api-server

# Check Dex authentication logs
kubectl logs -n auth deployment/dex

# Force reconciliation of all Kubeflow components
flux reconcile kustomization kubeflow --with-source

# Check resource quotas for user namespaces
kubectl describe resourcequota -n data-science-team
```

## Summary

You now have Kubeflow deployed on Kubernetes via Flux CD, providing a complete MLOps platform with pipelines, notebooks, model serving, and distributed training. All components are managed through GitOps, meaning infrastructure changes, user profiles, and component updates go through version control. The dependency ordering in Flux Kustomizations ensures components deploy in the correct sequence, while health checks verify each component is ready before proceeding to the next.
