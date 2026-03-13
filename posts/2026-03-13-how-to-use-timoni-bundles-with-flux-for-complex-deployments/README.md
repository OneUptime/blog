# How to Use Timoni Bundles with Flux for Complex Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, Bundles, Multi-Module

Description: Learn how to use Timoni bundles to orchestrate multiple Flux modules for complex multi-component Kubernetes deployments.

---

## Introduction

Complex Kubernetes deployments often involve multiple interconnected components: databases, caches, message queues, application services, and monitoring stacks. While individual Timoni modules handle each component, Timoni bundles let you compose multiple modules into a single deployable unit with shared configuration and dependency ordering. When combined with Flux, bundles provide a powerful way to manage complete application stacks through GitOps.

This guide demonstrates how to create and use Timoni bundles for multi-component deployments with Flux, covering bundle structure, shared values, environment-specific overrides, and lifecycle management.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Timoni CLI installed (v0.20 or later)
- Access to OCI registries containing the modules you want to bundle
- `kubectl` configured for your cluster

## Step 1: Understand Bundle Structure

A Timoni bundle is a CUE file that declares multiple module instances with their values. Each instance references a module from an OCI registry and provides instance-specific configuration.

Create a bundle file:

```cue
// bundle.cue
bundle: {
	apiVersion: "v1alpha1"
	name:       "my-app-stack"
	instances: {
		"database": {
			module: {
				url:     "oci://ghcr.io/stefanprodan/modules/flux-helm-release"
				version: "latest"
			}
			namespace: "flux-system"
			values: {
				repository: {
					url: "https://charts.bitnami.com/bitnami"
				}
				chart: {
					name:    "postgresql"
					version: "15.x"
				}
				release: {
					interval:        "10m"
					targetNamespace: "database"
					createNamespace: true
					values: {
						auth: database: "myapp"
						primary: persistence: size: "50Gi"
					}
				}
			}
		}
		"cache": {
			module: {
				url:     "oci://ghcr.io/stefanprodan/modules/flux-helm-release"
				version: "latest"
			}
			namespace: "flux-system"
			values: {
				repository: {
					url: "https://charts.bitnami.com/bitnami"
				}
				chart: {
					name:    "redis"
					version: "18.x"
				}
				release: {
					interval:        "10m"
					targetNamespace: "cache"
					createNamespace: true
					values: {
						architecture: "replication"
						replica: replicaCount: 3
					}
				}
			}
		}
		"app": {
			module: {
				url:     "oci://ghcr.io/stefanprodan/modules/flux-git-sync"
				version: "latest"
			}
			namespace: "flux-system"
			values: {
				git: {
					url:  "https://github.com/your-org/my-app"
					path: "./deploy/production"
				}
				sync: {
					prune:           true
					wait:            true
					targetNamespace: "production"
					dependsOn: [
						{name: "database"},
						{name: "cache"},
					]
				}
			}
		}
	}
}
```

## Step 2: Build and Preview the Bundle

Preview all resources that the bundle will generate:

```bash
timoni bundle build -f bundle.cue
```

This outputs the Kubernetes resources for all instances, letting you review the complete deployment before applying.

## Step 3: Apply the Bundle

Deploy all instances in the bundle:

```bash
timoni bundle apply -f bundle.cue
```

Timoni applies instances in dependency order, ensuring the database and cache are deployed before the application.

Check the status of all instances:

```bash
timoni list -A
```

## Step 4: Use Runtime Values

Inject values at runtime for secrets and environment-specific settings:

```cue
// bundle.cue
bundle: {
	apiVersion: "v1alpha1"
	name:       "my-app-stack"

	_env:      string @timoni(runtime:string:ENV)
	_region:   string @timoni(runtime:string:REGION)
	_dbSize:   string @timoni(runtime:string:DB_SIZE)

	instances: {
		"database": {
			module: {
				url:     "oci://ghcr.io/stefanprodan/modules/flux-helm-release"
				version: "latest"
			}
			namespace: "flux-system"
			values: {
				repository: url: "https://charts.bitnami.com/bitnami"
				chart: {
					name:    "postgresql"
					version: "15.x"
				}
				release: {
					targetNamespace: "database-\(_env)"
					createNamespace: true
					values: {
						primary: persistence: size: _dbSize
					}
				}
			}
		}
		"app": {
			module: {
				url:     "oci://ghcr.io/stefanprodan/modules/flux-git-sync"
				version: "latest"
			}
			namespace: "flux-system"
			values: {
				git: {
					url:  "https://github.com/your-org/my-app"
					path: "./deploy/\(_env)"
				}
				sync: {
					targetNamespace: _env
					postBuild: substitute: {
						ENVIRONMENT: _env
						REGION:      _region
					}
				}
			}
		}
	}
}
```

Apply with runtime values:

```bash
ENV=production REGION=us-east-1 DB_SIZE=100Gi \
  timoni bundle apply -f bundle.cue
```

## Step 5: Environment-Specific Bundles

Create separate bundle files per environment that extend a base:

```cue
// bundles/base.cue
package bundles

#BaseBundle: {
	apiVersion: "v1alpha1"
	instances: {
		"database": {
			module: {
				url:     "oci://ghcr.io/stefanprodan/modules/flux-helm-release"
				version: "latest"
			}
			namespace: "flux-system"
			values: {
				repository: url: "https://charts.bitnami.com/bitnami"
				chart: name: "postgresql"
			}
		}
	}
}
```

```cue
// bundles/production.cue
package bundles

bundle: #BaseBundle & {
	name: "app-stack-production"
	instances: "database": values: {
		chart: version: "15.5.0"
		release: {
			targetNamespace: "database"
			values: primary: persistence: size: "100Gi"
		}
	}
}
```

## Step 6: Manage Bundle Lifecycle

Update a single instance within the bundle:

```bash
timoni bundle apply -f bundle.cue
```

Timoni detects changes and only updates the modified instances.

Delete the entire bundle:

```bash
timoni bundle delete -f bundle.cue
```

List all bundle instances:

```bash
timoni list -A
```

## Step 7: Bundle with Monitoring Stack

Add a monitoring stack to your bundle:

```cue
// full-stack-bundle.cue
bundle: {
	apiVersion: "v1alpha1"
	name:       "full-stack"
	instances: {
		"monitoring": {
			module: {
				url:     "oci://ghcr.io/stefanprodan/modules/flux-helm-release"
				version: "latest"
			}
			namespace: "flux-system"
			values: {
				repository: url: "https://prometheus-community.github.io/helm-charts"
				chart: {
					name:    "kube-prometheus-stack"
					version: "60.x"
				}
				release: {
					targetNamespace: "monitoring"
					createNamespace: true
					values: {
						grafana: enabled:        true
						prometheus: enabled:      true
						alertmanager: enabled:    true
					}
				}
			}
		}
		// ... other instances
	}
}
```

## Conclusion

Timoni bundles provide a composable way to manage multi-component deployments with Flux. By grouping related module instances into a single bundle with shared configuration and dependency ordering, you can deploy complete application stacks in a single operation. Runtime values and environment-specific overrides make bundles adaptable across environments, while the CUE type system catches configuration errors before deployment. This approach scales well for teams managing complex applications that span multiple Helm charts, Git repositories, and custom modules.
