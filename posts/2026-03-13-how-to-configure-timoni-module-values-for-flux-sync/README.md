# How to Configure Timoni Module Values for Flux Sync

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, kubernetes, gitops, timoni, values, configuration

Description: A practical guide to configuring Timoni module values for Flux sync operations, covering value types, defaults, overrides, and validation.

---

## Introduction

Timoni modules use CUE-based values schemas to define configurable parameters for Flux resource generation. Understanding how to structure, validate, and override these values is essential for effective module consumption. Whether you are using pre-built Flux modules or custom ones, properly configuring values ensures your deployments are correct, consistent, and maintainable.

This guide covers the mechanics of Timoni module values for Flux sync configurations, including value file formats, type validation, defaults, environment-specific overrides, and common patterns.

## Prerequisites

- Timoni CLI installed (v0.20 or later)
- Familiarity with Flux resources (GitRepository, Kustomization, HelmRelease)
- Basic understanding of YAML and CUE configuration formats
- A Kubernetes cluster with Flux installed (for applying configurations)

## Step 1: Understand the Values Schema

Every Timoni module defines a values schema in CUE. View a module's schema:

```bash
timoni mod values oci://ghcr.io/stefanprodan/modules/flux-git-sync
```

The schema shows types, constraints, and defaults for each parameter. For example:

```cue
#Values: {
	git: {
		url:      string & =~"^(https|ssh)://"
		branch:   string | *"main"
		interval: string | *"5m"
	}
	sync: {
		prune: bool | *true
		wait:  bool | *true
	}
}
```

The `| *"main"` syntax means `"main"` is the default value, and `string & =~"^(https|ssh)://"` means the value must be a string matching the regex pattern.

## Step 2: Create YAML Values Files

Timoni accepts values in YAML format. Create a values file:

```yaml
# values.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    branch: "main"
    path: "./clusters/production"
    interval: "5m"
    secretRef:
      name: "git-credentials"
  sync:
    prune: true
    wait: true
    interval: "5m"
    targetNamespace: "production"
    timeout: "10m"
```

Apply the values:

```bash
timoni apply my-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values values.yaml \
  --namespace flux-system
```

## Step 3: Use Multiple Values Files

Layer values files for environment-specific configurations. Later files override earlier ones:

```yaml
# base-values.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    branch: "main"
  sync:
    prune: true
    wait: true
    timeout: "5m"
```

```yaml
# production-values.yaml
values:
  git:
    path: "./clusters/production"
    interval: "10m"
  sync:
    interval: "10m"
    targetNamespace: "production"
    timeout: "15m"
```

```yaml
# staging-values.yaml
values:
  git:
    path: "./clusters/staging"
    interval: "2m"
  sync:
    interval: "2m"
    targetNamespace: "staging"
    timeout: "5m"
```

Apply with layered values:

```bash
# Production deployment
timoni apply prod-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values base-values.yaml \
  --values production-values.yaml \
  --namespace flux-system

# Staging deployment
timoni apply staging-sync oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values base-values.yaml \
  --values staging-values.yaml \
  --namespace flux-system
```

## Step 4: Use CUE Values Files

For more powerful configuration, use CUE values files with computed values:

```cue
// values.cue
values: {
	_env: "production"

	git: {
		url:    "https://github.com/your-org/fleet-infra.git"
		branch: "main"
		path:   "./clusters/\(_env)"
		interval: "10m"
	}
	sync: {
		prune: true
		wait:  true
		interval: "10m"
		targetNamespace: _env
		postBuild: substitute: {
			ENVIRONMENT: _env
			CLUSTER:     "prod-us-east-1"
		}
	}
}
```

CUE values support string interpolation, conditional logic, and computed fields that YAML cannot express.

## Step 5: Configure Post-Build Substitution Values

Flux's post-build substitution is a common pattern. Configure it through Timoni values:

```yaml
# values-with-substitution.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    path: "./clusters/production"
  sync:
    prune: true
    wait: true
    postBuild:
      substitute:
        CLUSTER_NAME: "prod-us-east-1"
        ENVIRONMENT: "production"
        DOMAIN: "prod.example.com"
        REPLICAS: "3"
      substituteFrom:
        - kind: ConfigMap
          name: cluster-vars
        - kind: Secret
          name: cluster-secrets
          optional: true
```

## Step 6: Configure Health Check Values

Add health checks to your sync configuration:

```yaml
# values-with-health.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    path: "./apps/production"
  sync:
    prune: true
    wait: true
    timeout: "10m"
    targetNamespace: "production"
    healthChecks:
      - apiVersion: apps/v1
        kind: Deployment
        name: frontend
        namespace: production
      - apiVersion: apps/v1
        kind: Deployment
        name: backend
        namespace: production
      - apiVersion: apps/v1
        kind: StatefulSet
        name: database
        namespace: production
```

## Step 7: Configure Dependency Values

Set up dependencies between module instances:

```yaml
# app-values.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    path: "./apps/production"
  sync:
    prune: true
    wait: true
    targetNamespace: "production"
    dependsOn:
      - name: infra-controllers
      - name: database-sync
      - name: cache-sync
```

## Step 8: Validate Values Before Applying

Always validate your values before applying to a cluster:

```bash
# Build without applying to check for errors
timoni build test oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --values values.yaml \
  --namespace flux-system
```

If values violate the schema, Timoni reports specific errors:

```
Error: values.git.url: invalid value "not-a-url"
  (does not match =~"^(https|ssh)://")
```

## Step 9: Document Your Values

Maintain a values reference for your team:

```yaml
# values-reference.yaml
# Flux Git Sync Module Values Reference
#
# git.url (required): Git repository URL (https:// or ssh://)
# git.branch (default: "main"): Branch to track
# git.path (default: "./"): Path within the repository
# git.interval (default: "5m"): Source polling interval
# git.secretRef.name: Name of the authentication secret
#
# sync.prune (default: true): Enable garbage collection
# sync.wait (default: true): Wait for resources to be ready
# sync.interval (default: "5m"): Sync reconciliation interval
# sync.targetNamespace: Override namespace for deployed resources
# sync.timeout (default: "5m"): Timeout for health checks
# sync.dependsOn: List of dependency Kustomizations

values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    branch: "main"
    path: "./clusters/production"
  sync:
    prune: true
    wait: true
```

## Conclusion

Properly configuring Timoni module values is the key to effective Flux deployments. The CUE-based values schema provides type safety, defaults, and constraints that prevent misconfiguration. By using layered values files, you can maintain a clean separation between base configurations and environment-specific overrides. Whether you are configuring simple Git syncs or complex multi-dependency deployments with health checks and post-build substitution, the values system gives you a consistent, validated interface to Flux resource generation.
