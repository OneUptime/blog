# How to Use Post-Build Substitution with HelmRelease Values in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, HelmRelease, Post-Build Substitution, Helm

Description: Learn how to inject dynamic values into Flux HelmRelease resources using post-build substitution for flexible Helm chart deployments.

---

## Introduction

Flux HelmRelease resources define how Helm charts are deployed to your cluster. While HelmRelease supports inline values and values from ConfigMaps or Secrets, there are situations where you want to dynamically inject values into the HelmRelease manifest itself using post-build substitution. This technique lets you parameterize any field in the HelmRelease resource, including the chart version, release name, namespace, and values block, giving you maximum flexibility across environments.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository or HelmRepository source
- Understanding of Helm charts and Flux HelmRelease resources

## How It Works

Post-build substitution in Flux operates at the Kustomization level, not the HelmRelease level. When a Flux Kustomization reconciles and builds the manifests in its path, any HelmRelease manifests found there go through the same variable substitution as any other Kubernetes resource. This means you can place `${VAR_NAME}` placeholders anywhere in your HelmRelease YAML.

## Basic Setup

Start with a HelmRelease manifest that contains variable placeholders:

```yaml
# apps/nginx/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: ${APP_NAMESPACE}
spec:
  interval: 30m
  chart:
    spec:
      chart: nginx
      version: "${NGINX_CHART_VERSION}"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    replicaCount: ${REPLICAS}
    service:
      type: ${SERVICE_TYPE}
    resources:
      requests:
        cpu: ${CPU_REQUEST}
        memory: ${MEMORY_REQUEST}
      limits:
        cpu: ${CPU_LIMIT}
        memory: ${MEMORY_LIMIT}
    ingress:
      enabled: ${INGRESS_ENABLED}
      hostname: ${APP_HOSTNAME}
      tls: ${INGRESS_TLS}
```

## Wrapping with a Kustomization

The HelmRelease must be deployed through a Flux Kustomization that has post-build substitution configured:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nginx
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/nginx
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      APP_NAMESPACE: "web"
      NGINX_CHART_VERSION: "18.1.2"
      REPLICAS: "3"
      SERVICE_TYPE: "ClusterIP"
      CPU_REQUEST: "100m"
      MEMORY_REQUEST: "128Mi"
      CPU_LIMIT: "500m"
      MEMORY_LIMIT: "512Mi"
      INGRESS_ENABLED: "true"
      APP_HOSTNAME: "www.example.com"
      INGRESS_TLS: "true"
```

When Flux reconciles this Kustomization, it reads the HelmRelease manifest, substitutes all variables, and then applies the resulting HelmRelease to the cluster. Flux then processes the HelmRelease to install or upgrade the Helm chart.

## Using ConfigMaps and Secrets for Values

For environment-specific deployments, use `substituteFrom` to pull values from ConfigMaps and Secrets:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: flux-system
data:
  APP_NAMESPACE: "web"
  NGINX_CHART_VERSION: "18.1.2"
  REPLICAS: "3"
  SERVICE_TYPE: "ClusterIP"
  CPU_REQUEST: "100m"
  MEMORY_REQUEST: "128Mi"
  CPU_LIMIT: "500m"
  MEMORY_LIMIT: "512Mi"
  INGRESS_ENABLED: "true"
  APP_HOSTNAME: "www.example.com"
  INGRESS_TLS: "true"
```

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nginx
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/nginx
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: nginx-config
      - kind: Secret
        name: nginx-secrets
```

## Parameterizing the Chart Source

You can also use substitution to control which chart version or even which chart is deployed:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ${RELEASE_NAME}
  namespace: ${APP_NAMESPACE}
spec:
  interval: 30m
  chart:
    spec:
      chart: ${CHART_NAME}
      version: "${CHART_VERSION}"
      sourceRef:
        kind: HelmRepository
        name: ${HELM_REPO}
        namespace: flux-system
  values:
    image:
      repository: ${IMAGE_REPO}
      tag: ${IMAGE_TAG}
```

This pattern is useful when you want to test a new chart version in staging before promoting it to production. Update the ConfigMap in the staging cluster to point to the new version and let Flux handle the rollout.

## Injecting Complex Values

Post-build substitution replaces variables with string values. For complex nested Helm values, structure your manifest so that each variable maps to a single value:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: ${APP_NAMESPACE}
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "${CHART_VERSION}"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  values:
    database:
      host: ${DB_HOST}
      port: ${DB_PORT}
      name: ${DB_NAME}
      username: ${DB_USER}
      password: ${DB_PASSWORD}
    redis:
      host: ${REDIS_HOST}
      port: ${REDIS_PORT}
    monitoring:
      enabled: ${MONITORING_ENABLED}
      endpoint: ${METRICS_ENDPOINT}
```

Each substitution variable maps to a leaf value in the Helm values tree. This keeps the substitution straightforward and predictable.

## Combining with HelmRelease valuesFrom

You can combine post-build substitution with the HelmRelease `valuesFrom` field. Use substitution for values that affect the HelmRelease structure and `valuesFrom` for values that only affect the Helm chart:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: ${APP_NAMESPACE}
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "${CHART_VERSION}"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  valuesFrom:
    - kind: ConfigMap
      name: my-app-helm-values
      targetPath: ""
  values:
    global:
      environment: ${ENVIRONMENT}
```

In this setup, post-build substitution handles `APP_NAMESPACE`, `CHART_VERSION`, and `ENVIRONMENT`, while the ConfigMap `my-app-helm-values` provides the bulk of the Helm chart values.

## Verifying the Results

After reconciliation, check that the HelmRelease was created with the correct values:

```bash
kubectl get helmrelease -n flux-system my-app -o yaml
```

Check the Helm release status:

```bash
flux get helmrelease my-app -n flux-system
```

If substitution fails, the Kustomization will report an error:

```bash
flux get kustomization nginx
```

## Conclusion

Post-build substitution with HelmRelease resources in Flux gives you a powerful way to parameterize your Helm deployments. By placing variable placeholders in your HelmRelease manifests and configuring substitution sources in the wrapping Kustomization, you can control chart versions, namespaces, replica counts, and any other Helm value from external sources. This approach works well for multi-environment deployments where the same chart needs different configuration across staging, production, and other clusters.
