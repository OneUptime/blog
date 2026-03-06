# How to Configure Cluster Labels for Conditional Deployments in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cluster labels, Conditional Deployments, Multi-Cluster, GitOps, Kubernetes

Description: Learn how to use cluster labels and metadata to conditionally deploy resources with Flux CD, enabling selective rollouts and feature gating across clusters.

---

## Introduction

In a multi-cluster environment, not every application or configuration should be deployed to every cluster. Some clusters are GPU-enabled, some are in regulated regions, some run specific workloads. Flux CD allows you to use cluster labels and metadata to control which resources get deployed where. This guide shows you how to configure cluster labels and use them for conditional deployments.

## Use Cases for Conditional Deployments

- **GPU workloads**: Deploy machine learning services only to clusters with GPU nodes
- **Regional compliance**: Deploy GDPR-specific policies only to EU clusters
- **Feature rollouts**: Enable new features on canary clusters before rolling out everywhere
- **Tier-based deployments**: Deploy premium features only to production-tier clusters
- **Cloud-specific resources**: Deploy AWS-specific operators only to AWS clusters

## Repository Structure

```text
fleet-repo/
  base/
    apps/
      ml-inference/
      web-api/
      gdpr-controller/
    infrastructure/
      gpu-operator/
      aws-load-balancer-controller/
      gcp-config-connector/
  conditional/
    gpu-workloads/
      kustomization.yaml
    gdpr-compliance/
      kustomization.yaml
    canary-features/
      kustomization.yaml
    aws-specific/
      kustomization.yaml
  clusters/
    prod-us-east-gpu/
      cluster-config.yaml
      apps.yaml
    prod-eu-west/
      cluster-config.yaml
      apps.yaml
    canary-us-west/
      cluster-config.yaml
      apps.yaml
    prod-us-east/
      cluster-config.yaml
      apps.yaml
```

## Defining Cluster Labels with ConfigMaps

Each cluster stores its metadata in a ConfigMap that Flux uses for variable substitution and conditional logic.

```yaml
# clusters/prod-us-east-gpu/cluster-config.yaml
# Cluster metadata ConfigMap: GPU-enabled production cluster in US East
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-info
  namespace: flux-system
data:
  # Cluster identity
  CLUSTER_NAME: prod-us-east-gpu
  CLUSTER_TIER: production
  CLUSTER_REGION: us-east-1
  CLUSTER_CLOUD: aws

  # Cluster capabilities
  GPU_ENABLED: "true"
  GPU_TYPE: nvidia-a100
  GPU_COUNT: "8"

  # Compliance flags
  GDPR_REQUIRED: "false"
  PCI_REQUIRED: "true"
  SOC2_REQUIRED: "true"

  # Feature flags
  CANARY_ENABLED: "false"
  FEATURE_NEW_DASHBOARD: "true"
  FEATURE_ML_PIPELINE: "true"
```

```yaml
# clusters/prod-eu-west/cluster-config.yaml
# Cluster metadata ConfigMap: EU West production cluster with GDPR requirements
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-info
  namespace: flux-system
data:
  CLUSTER_NAME: prod-eu-west
  CLUSTER_TIER: production
  CLUSTER_REGION: eu-west-1
  CLUSTER_CLOUD: aws

  GPU_ENABLED: "false"
  GPU_TYPE: none
  GPU_COUNT: "0"

  # GDPR compliance is required for EU clusters
  GDPR_REQUIRED: "true"
  PCI_REQUIRED: "true"
  SOC2_REQUIRED: "true"

  CANARY_ENABLED: "false"
  FEATURE_NEW_DASHBOARD: "true"
  FEATURE_ML_PIPELINE: "false"
```

```yaml
# clusters/canary-us-west/cluster-config.yaml
# Cluster metadata ConfigMap: canary cluster for testing new features
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-info
  namespace: flux-system
data:
  CLUSTER_NAME: canary-us-west
  CLUSTER_TIER: canary
  CLUSTER_REGION: us-west-2
  CLUSTER_CLOUD: aws

  GPU_ENABLED: "false"
  GPU_TYPE: none
  GPU_COUNT: "0"

  GDPR_REQUIRED: "false"
  PCI_REQUIRED: "false"
  SOC2_REQUIRED: "false"

  # Canary cluster gets all new features first
  CANARY_ENABLED: "true"
  FEATURE_NEW_DASHBOARD: "true"
  FEATURE_ML_PIPELINE: "true"
```

## Conditional Deployment Using Separate Kustomizations

The primary pattern for conditional deployments in Flux CD is creating separate Kustomization resources that only exist in specific cluster directories.

```yaml
# clusters/prod-us-east-gpu/apps.yaml
# This cluster deploys the standard apps plus GPU workloads
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: standard-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./base/apps/web-api
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-info
---
# GPU workloads: only present in GPU-enabled cluster directories
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gpu-workloads
  namespace: flux-system
spec:
  interval: 10m
  path: ./conditional/gpu-workloads
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-info
  dependsOn:
    - name: gpu-operator
---
# GPU operator: only deployed on clusters with GPUs
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gpu-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./base/infrastructure/gpu-operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

```yaml
# clusters/prod-eu-west/apps.yaml
# EU West cluster deploys standard apps plus GDPR compliance resources
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: standard-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./base/apps/web-api
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-info
---
# GDPR compliance: only present in EU cluster directories
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gdpr-compliance
  namespace: flux-system
spec:
  interval: 10m
  path: ./conditional/gdpr-compliance
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-info
```

## Defining Conditional Resource Sets

```yaml
# conditional/gpu-workloads/kustomization.yaml
# Resources deployed only on GPU-enabled clusters
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ml-inference-deployment.yaml
  - ml-inference-service.yaml
  - gpu-resource-quota.yaml
```

```yaml
# conditional/gpu-workloads/ml-inference-deployment.yaml
# ML inference service that requires GPU nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
  namespace: ml-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ml-inference
  template:
    metadata:
      labels:
        app: ml-inference
    spec:
      containers:
        - name: ml-inference
          image: your-org/ml-inference:v1.5.0
          ports:
            - containerPort: 8501
              name: grpc
          env:
            - name: CLUSTER_NAME
              value: ${CLUSTER_NAME}
            - name: GPU_TYPE
              value: ${GPU_TYPE}
            - name: MODEL_CACHE_DIR
              value: /models
          resources:
            requests:
              cpu: "2"
              memory: 8Gi
              # Request GPU resources
              nvidia.com/gpu: "1"
            limits:
              cpu: "4"
              memory: 16Gi
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: model-cache
              mountPath: /models
      # Schedule on GPU nodes only
      nodeSelector:
        accelerator: nvidia-gpu
      tolerations:
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
      volumes:
        - name: model-cache
          persistentVolumeClaim:
            claimName: ml-model-cache
```

```yaml
# conditional/gpu-workloads/gpu-resource-quota.yaml
# Resource quota specific to GPU workloads
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gpu-quota
  namespace: ml-system
spec:
  hard:
    requests.nvidia.com/gpu: ${GPU_COUNT}
    limits.nvidia.com/gpu: ${GPU_COUNT}
    pods: "20"
```

```yaml
# conditional/gdpr-compliance/kustomization.yaml
# Resources deployed only on GDPR-required clusters
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gdpr-controller.yaml
  - data-residency-policy.yaml
  - audit-logging.yaml
```

```yaml
# conditional/gdpr-compliance/gdpr-controller.yaml
# GDPR data controller for managing data subject requests
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gdpr-controller
  namespace: compliance
spec:
  replicas: 2
  selector:
    matchLabels:
      app: gdpr-controller
  template:
    metadata:
      labels:
        app: gdpr-controller
    spec:
      containers:
        - name: gdpr-controller
          image: your-org/gdpr-controller:v2.0.0
          ports:
            - containerPort: 8080
          env:
            - name: CLUSTER_NAME
              value: ${CLUSTER_NAME}
            - name: CLUSTER_REGION
              value: ${CLUSTER_REGION}
            - name: DATA_RETENTION_DAYS
              value: "90"
            - name: PII_ENCRYPTION_ENABLED
              value: "true"
            - name: AUDIT_LOG_ENABLED
              value: "true"
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

```yaml
# conditional/gdpr-compliance/data-residency-policy.yaml
# Network policy ensuring data stays within the EU region
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: data-residency-enforcement
  namespace: apps
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Allow internal cluster traffic
    - to:
        - ipBlock:
            cidr: 10.0.0.0/8
    # Allow DNS resolution
    - ports:
        - protocol: UDP
          port: 53
    # Block all external egress except approved EU endpoints
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              # Block non-EU AWS regions
              - 52.0.0.0/8
      ports:
        - protocol: TCP
          port: 443
```

## Feature Rollout Using Canary Clusters

```yaml
# conditional/canary-features/kustomization.yaml
# Resources deployed only on canary clusters for testing new features
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - new-dashboard.yaml
  - feature-flag-config.yaml
```

```yaml
# conditional/canary-features/new-dashboard.yaml
# New dashboard UI deployed to canary clusters for validation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: new-dashboard
  namespace: apps
spec:
  replicas: 1
  selector:
    matchLabels:
      app: new-dashboard
  template:
    metadata:
      labels:
        app: new-dashboard
        feature: canary
    spec:
      containers:
        - name: new-dashboard
          image: your-org/dashboard:v5.0.0-beta1
          ports:
            - containerPort: 3000
          env:
            - name: CLUSTER_NAME
              value: ${CLUSTER_NAME}
            - name: FEATURE_FLAGS
              value: "all-experimental"
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
```

```yaml
# clusters/canary-us-west/apps.yaml
# Canary cluster deploys standard apps plus canary features
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: standard-apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./base/apps/web-api
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-info
---
# Canary features: only deployed to the canary cluster
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: canary-features
  namespace: flux-system
spec:
  interval: 5m
  path: ./conditional/canary-features
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-info
```

## Using Variable Substitution for In-Template Conditionals

While Flux does not support if/else logic directly, you can use variable substitution to toggle behavior within templates.

```yaml
# base/apps/web-api/deployment.yaml
# Deployment that adapts behavior based on cluster labels
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-api
  namespace: apps
  labels:
    cluster: ${CLUSTER_NAME}
    tier: ${CLUSTER_TIER}
    region: ${CLUSTER_REGION}
spec:
  replicas: ${REPLICAS:=2}
  selector:
    matchLabels:
      app: web-api
  template:
    metadata:
      labels:
        app: web-api
        cluster: ${CLUSTER_NAME}
    spec:
      containers:
        - name: web-api
          image: your-org/web-api:v3.0.0
          env:
            - name: CLUSTER_NAME
              value: ${CLUSTER_NAME}
            - name: CLUSTER_TIER
              value: ${CLUSTER_TIER}
            - name: CLUSTER_REGION
              value: ${CLUSTER_REGION}
            - name: FEATURE_NEW_DASHBOARD
              value: ${FEATURE_NEW_DASHBOARD:=false}
            - name: FEATURE_ML_PIPELINE
              value: ${FEATURE_ML_PIPELINE:=false}
            - name: PII_MASKING_ENABLED
              value: ${GDPR_REQUIRED:=false}
```

## Verifying Conditional Deployments

```bash
# Check which Kustomizations are deployed on each cluster
for ctx in prod-us-east-gpu prod-eu-west canary-us-west; do
  echo "=== $ctx ==="
  kubectl --context "$ctx" get kustomizations -n flux-system -o custom-columns='NAME:.metadata.name,READY:.status.conditions[0].status,PATH:.spec.path'
  echo ""
done

# Verify GPU workloads only exist on GPU clusters
kubectl --context prod-us-east-gpu get deployments -n ml-system
kubectl --context prod-eu-west get deployments -n ml-system  # Should show "No resources found"

# Verify GDPR resources only exist on EU clusters
kubectl --context prod-eu-west get deployments -n compliance
kubectl --context prod-us-east-gpu get deployments -n compliance  # Should show "No resources found"

# Check cluster labels applied to resources
kubectl --context prod-us-east-gpu get deployment web-api -n apps -o jsonpath='{.metadata.labels}'
```

## Best Practices

1. **Use cluster directories for inclusion/exclusion**: The simplest conditional is whether a Kustomization file exists in a cluster directory.
2. **Store cluster metadata in ConfigMaps**: Makes cluster capabilities queryable and usable in variable substitution.
3. **Group conditional resources by capability**: Organize resources by what they require (GPU, GDPR, canary) not by cluster name.
4. **Use default values in substitution**: Always provide defaults with `${VAR:=default}` to avoid failures on clusters that lack certain variables.
5. **Document cluster capabilities**: Maintain a table of which clusters have which labels and capabilities.
6. **Test on canary first**: Always deploy new conditional resource sets to a canary cluster before production.
7. **Keep conditional sets independent**: Avoid dependencies between conditional resource sets unless necessary.

## Conclusion

Conditional deployments in Flux CD are primarily achieved through repository structure: a Kustomization resource only exists in the cluster directories that need it. Combined with cluster metadata ConfigMaps for variable substitution and a `conditional` directory organized by capability, you can precisely control which resources deploy to which clusters. This approach is explicit, auditable, and easy to understand -- you can tell at a glance what each cluster runs by looking at its directory in the fleet repository.
