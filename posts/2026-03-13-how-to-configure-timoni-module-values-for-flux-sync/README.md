# How to Configure Timoni Module Values for Flux Sync

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, Value, Configuration

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

Every Timoni module defines a configuration schema in CUE. After pulling a module locally, view its schema:

```bash
timoni mod pull oci://ghcr.io/stefanprodan/modules/flux-git-sync \
  --output ./flux-git-sync
timoni mod show config ./flux-git-sync
```

The schema shows types, constraints, and defaults for each parameter. For example:

```cue
#Config: {
	git: {
		url!:     string & =~"^https.*$"
		ref:      *"refs/heads/main" | string
		interval: *1 | int
	}
	sync: {
		prune:   *true | bool
		wait:    *true | bool
		timeout: *3 | int
	}
}
```

The `*"refs/heads/main"` syntax means `"refs/heads/main"` is the default value, `url!` marks the field as required, and `string & =~"^https.*$"` means the value must be a string matching the regex pattern.

## Step 2: Create YAML Values Files

Timoni accepts values in YAML format. Create a values file:

```yaml
# values.yaml

values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref: "refs/heads/main"
    path: "./clusters/production"
    interval: 5
    token: "github-token-value"
  sync:
    prune: true
    wait: true
    targetNamespace: "production"
    timeout: 10
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
    ref: "refs/heads/main"
  sync:
    prune: true
    wait: true
    timeout: 5
```

```yaml
# production-values.yaml
values:
  git:
    path: "./clusters/production"
    interval: 10
  sync:
    targetNamespace: "production"
    timeout: 15
```

```yaml
# staging-values.yaml
values:
  git:
    path: "./clusters/staging"
    interval: 2
  sync:
    targetNamespace: "staging"
    timeout: 5
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
	let env = "production"

	git: {
		url:    "https://github.com/your-org/fleet-infra.git"
		ref:    "refs/heads/main"
		path:   "./clusters/\(env)"
		interval: 10
	}
	sync: {
		prune: true
		wait:  true
		targetNamespace: env
	}
	substitute: {
		ENVIRONMENT: env
		CLUSTER:     "prod-us-east-1"
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

## Step 6: Configure Health Check Behavior

The `flux-git-sync` module does not expose Flux `healthChecks` directly. Configure readiness behavior with `wait`, `timeout`, and `retryInterval`:

```yaml
# values-with-health-behavior.yaml
values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    path: "./apps/production"
  sync:
    prune: true
    wait: true
    timeout: 10
    retryInterval: 2
    targetNamespace: "production"
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

```text
Error: values.git.url: invalid value "not-a-url"
  (does not match =~"^https.*$")
```

## Step 9: Document Your Values

Maintain a values reference for your team:

```yaml
# values-reference.yaml
# Flux Git Sync Module Values Reference
#
# git.url (required): Git repository HTTPS URL
# git.ref (default: "refs/heads/main"): Git reference to track
# git.path (default: "./"): Path within the repository
# git.interval (default: 1): Source polling interval in minutes
# git.token: Git token for a private HTTPS repository
#
# sync.prune (default: true): Enable garbage collection
# sync.wait (default: true): Wait for resources to be ready
# sync.targetNamespace: Override namespace for deployed resources
# sync.timeout (default: 3): Timeout for readiness checks in minutes
# sync.retryInterval (default: 5): Retry failed reconciliation interval in minutes
# dependsOn: List of dependency Kustomizations

values:
  git:
    url: "https://github.com/your-org/fleet-infra.git"
    ref: "refs/heads/main"
    path: "./clusters/production"
  sync:
    prune: true
    wait: true
```

## Conclusion

Properly configuring Timoni module values is the key to effective Flux deployments. The CUE-based values schema provides type safety, defaults, and constraints that prevent misconfiguration. By using layered values files, you can maintain a clean separation between base configurations and environment-specific overrides. Whether you are configuring simple Git syncs or complex multi-dependency deployments with readiness behavior and post-build substitution, the values system gives you a consistent, validated interface to Flux resource generation.
