# How to Configure HelmRelease with disableOpenAPIValidation in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, OpenAPI, Kubernetes, GitOps, Helm, Validation

Description: Learn how to disable OpenAPI validation in Flux HelmRelease to handle charts with non-standard resource definitions or CRDs not yet registered in the cluster.

---

## Introduction

When Flux installs or upgrades a Helm chart, Kubernetes validates the rendered manifests against the OpenAPI schema registered in the API server. This validation catches errors early, but it can also block legitimate deployments when charts include resources whose CRDs are not yet registered or when charts produce manifests that do not conform to the strict OpenAPI schema. Flux provides the `disableOpenAPIValidation` flag in the HelmRelease spec to bypass this validation when needed.

In this post, you will learn when and how to use `disableOpenAPIValidation`, the risks involved, and practical configurations for common scenarios.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on the cluster
- A Git repository connected to Flux
- kubectl configured to access the cluster
- Basic familiarity with Helm and Kubernetes resource validation

## Why Disable OpenAPI Validation

Kubernetes uses OpenAPI schemas to validate resources before they are persisted to etcd. This validation ensures that resource manifests conform to the expected structure. However, there are scenarios where this validation causes problems:

1. **CRDs not yet installed**: If a Helm chart creates both CRDs and custom resources in the same release, the custom resources may fail validation because the CRDs are not yet registered when validation occurs.

2. **Non-standard fields**: Some charts use fields that are valid but not captured in the OpenAPI schema, especially with older API versions or beta features.

3. **Server-side validation differences**: Different Kubernetes versions have different OpenAPI schemas, and a chart built for one version may fail validation on another.

4. **Webhook-managed resources**: Some admission webhooks add or modify fields that are not in the base OpenAPI schema.

## Configuring disableOpenAPIValidation

The `disableOpenAPIValidation` flag can be set independently for install and upgrade operations:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      interval: 12h
  install:
    disableOpenAPIValidation: true
    remediation:
      retries: 3
  upgrade:
    disableOpenAPIValidation: true
    remediation:
      retries: 3
```

This is equivalent to running `helm install --disable-openapi-validation` or `helm upgrade --disable-openapi-validation`.

## A Practical Example: Deploying a Chart with Bundled CRDs and CRs

Consider a chart that installs both CRDs and custom resources. Without disabling validation, the custom resources fail because the API server does not know about the CRD schemas yet:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: istio-operator
  namespace: istio-system
spec:
  interval: 1h
  chart:
    spec:
      chart: istio-operator
      version: "1.21.x"
      sourceRef:
        kind: HelmRepository
        name: istio
        namespace: flux-system
      interval: 24h
  install:
    crds: CreateReplace
    disableOpenAPIValidation: true
    createNamespace: true
    remediation:
      retries: 5
  upgrade:
    crds: CreateReplace
    disableOpenAPIValidation: true
    remediation:
      retries: 5
  values:
    hub: docker.io/istio
    tag: 1.21.0
```

In this case, `disableOpenAPIValidation` is combined with `crds: CreateReplace` to handle the full CRD lifecycle while avoiding validation errors for custom resources rendered alongside the CRDs.

## When to Use disableOpenAPIValidation Selectively

You may want to disable validation only during install and not during upgrade, or vice versa. For example, if CRDs are created during install but are already present during upgrades:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-operator
  namespace: operators
spec:
  interval: 30m
  chart:
    spec:
      chart: my-operator
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      interval: 12h
  install:
    disableOpenAPIValidation: true
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    disableOpenAPIValidation: false
    crds: CreateReplace
    remediation:
      retries: 3
```

This enables validation during upgrades to catch any schema violations once CRDs are established, while still allowing the initial install to proceed without validation issues.

## Diagnosing OpenAPI Validation Errors

Before reaching for `disableOpenAPIValidation`, it helps to understand the actual error. Check the HelmRelease status:

```bash
kubectl get helmrelease -n default my-app -o yaml
```

Look for conditions with type `Ready` and status `False`. Common error messages include:

```text
error validating "": error validating data: ValidationError(MyCustomResource.spec):
unknown field "customField" in io.example.v1.MyCustomResource.spec
```

You can also test validation manually:

```bash
helm template my-app my-repo/my-app --version 2.0.0 | kubectl apply --dry-run=server -f -
```

If the dry run fails with validation errors but the manifests are correct, disabling OpenAPI validation is appropriate.

## Risks of Disabling Validation

Disabling OpenAPI validation removes an important safety net. Without validation:

- Typos in field names will not be caught and will be silently ignored.
- Incorrect field types (string instead of integer) may cause unexpected behavior.
- Deprecated or removed fields will not produce warnings.
- Invalid resource structures may be accepted and cause controller errors at runtime.

For these reasons, use `disableOpenAPIValidation` only when necessary and prefer to fix the underlying issue when possible.

## Alternative Approaches

Before disabling validation, consider these alternatives:

1. **Install CRDs separately**: Use a Flux Kustomization to install CRDs before the HelmRelease runs, eliminating the validation race condition.

2. **Use the Skip CRD policy with dependsOn**: Install CRDs through a separate resource and use `dependsOn` to order the operations.

3. **Update Kubernetes**: If the validation issue is due to an outdated OpenAPI schema, upgrading the cluster may resolve it.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-operator-crds
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./crds/my-operator
  prune: false
  wait: true
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-operator
  namespace: operators
spec:
  interval: 30m
  dependsOn:
    - name: my-operator-crds
      namespace: flux-system
  chart:
    spec:
      chart: my-operator
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    crds: Skip
```

## Conclusion

The `disableOpenAPIValidation` flag in Flux HelmRelease is a useful escape hatch for deploying charts that produce manifests incompatible with the Kubernetes OpenAPI schema. While it should be used judiciously, it is essential for charts that bundle CRDs alongside custom resources or that target multiple Kubernetes versions with differing schemas. Always prefer fixing the root cause of validation errors when possible, and use this flag as a targeted solution rather than a blanket default across all your HelmReleases.
