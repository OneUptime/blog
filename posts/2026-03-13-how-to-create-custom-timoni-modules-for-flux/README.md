# How to Create Custom Timoni Modules for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, cue, Modules, Custom

Description: A step-by-step guide to creating custom Timoni modules that generate Flux resources for your organization's deployment patterns.

---

## Introduction

While Timoni provides pre-built modules for common Flux patterns, your organization may have unique deployment requirements that demand custom modules. Creating custom Timoni modules lets you encapsulate your organization's best practices, enforce standards, and provide self-service deployment capabilities to development teams. Modules are written in CUE, a type-safe configuration language that validates configurations at build time.

This guide walks through creating a custom Timoni module that generates Flux resources, covering module structure, CUE templates, values schemas, and testing.

## Prerequisites

- Timoni CLI installed (v0.20 or later)
- Basic familiarity with CUE language concepts
- Understanding of Flux resources (GitRepository, Kustomization, HelmRelease)
- An OCI-compatible registry for publishing modules (optional for development)

## Step 1: Initialize a New Module

Create a new module using the Timoni scaffold command:

```bash
timoni mod init my-flux-app
cd my-flux-app
```

This generates the module structure:

```cue
my-flux-app/
  cue.mod/
    module.cue
    pkg/
  templates/
    config.cue
  values.cue
  timoni.cue
  README.md
```

## Step 2: Define the Values Schema

Edit `values.cue` to define your module's configurable parameters:

```cue
// values.cue
package main

import "strings"

#Values: {
	// Application metadata
	app: {
		name:      string & strings.MinRunes(1) & strings.MaxRunes(63)
		namespace: string | *"default"
		team:      string
		env:       "dev" | "staging" | "production"
	}

	// Git source configuration
	git: {
		url:      string & =~"^(https|ssh)://"
		branch:   string | *"main"
		path:     string | *"./"
		interval: string | *"5m"
		secretRef?: {
			name: string
		}
	}

	// Sync configuration
	sync: {
		interval:        string | *"5m"
		prune:           bool | *true
		wait:            bool | *true
		timeout:         string | *"5m"
		targetNamespace: string | *""
		serviceAccount:  string | *""
		dependsOn: [...{
			name:       string
			namespace?: string
		}]
		postBuild?: {
			substitute: [string]: string
			substituteFrom: [...{
				kind: "ConfigMap" | "Secret"
				name: string
			}]
		}
	}

	// Health check configuration
	healthChecks: [...{
		apiVersion: string
		kind:       string
		name:       string
		namespace:  string
	}]

	// Common labels applied to all resources
	commonLabels: [string]: string
}

// Default values
#Defaults: #Values & {
	app: {
		namespace: "default"
		env:       "dev"
	}
	git: {
		branch:   "main"
		interval: "5m"
	}
	sync: {
		interval: "5m"
		prune:    true
		wait:     true
		timeout:  "5m"
	}
}
```

## Step 3: Create Resource Templates

Create templates that generate Flux resources from the values.

GitRepository template:

```cue
// templates/gitrepository.cue
package templates

import (
	sourcev1 "source.toolkit.fluxcd.io/gitrepository/v1"
)

#GitRepository: sourcev1.#GitRepository & {
	_config: #Config

	metadata: {
		name:      _config.app.name
		namespace: _config.app.namespace
		labels:    _config.commonLabels
		labels: {
			"app.kubernetes.io/name":    _config.app.name
			"app.kubernetes.io/part-of": "flux-sync"
			"team":                      _config.app.team
		}
	}
	spec: {
		interval: _config.git.interval
		url:      _config.git.url
		ref: branch: _config.git.branch
		if _config.git.secretRef != _|_ {
			secretRef: name: _config.git.secretRef.name
		}
	}
}
```

Kustomization template:

```cue
// templates/kustomization.cue
package templates

import (
	kustomizev1 "kustomize.toolkit.fluxcd.io/kustomization/v1"
)

#Kustomization: kustomizev1.#Kustomization & {
	_config: #Config

	metadata: {
		name:      _config.app.name
		namespace: _config.app.namespace
		labels:    _config.commonLabels
		labels: {
			"app.kubernetes.io/name":    _config.app.name
			"app.kubernetes.io/part-of": "flux-sync"
			"team":                      _config.app.team
			"environment":               _config.app.env
		}
	}
	spec: {
		interval: _config.sync.interval
		sourceRef: {
			kind: "GitRepository"
			name: _config.app.name
		}
		path:  _config.git.path
		prune: _config.sync.prune
		wait:  _config.sync.wait
		if _config.sync.timeout != "" {
			timeout: _config.sync.timeout
		}
		if _config.sync.targetNamespace != "" {
			targetNamespace: _config.sync.targetNamespace
		}
		if _config.sync.serviceAccount != "" {
			serviceAccountName: _config.sync.serviceAccount
		}
		if len(_config.sync.dependsOn) > 0 {
			dependsOn: _config.sync.dependsOn
		}
		if _config.sync.postBuild != _|_ {
			postBuild: _config.sync.postBuild
		}
		if len(_config.healthChecks) > 0 {
			healthChecks: _config.healthChecks
		}
	}
}
```

## Step 4: Create the Config Template

Wire values to templates in the config:

```cue
// templates/config.cue
package templates

#Config: {
	app: {
		name:      string
		namespace: string
		team:      string
		env:       string
	}
	git: _
	sync: _
	healthChecks: _
	commonLabels: _
}
```

## Step 5: Define the Module Entry Point

Update `timoni.cue` to export the generated resources:

```cue
// timoni.cue
package main

import (
	templates "my-flux-app/templates"
)

values: #Values
config: templates.#Config & {
	app:          values.app
	git:          values.git
	sync:         values.sync
	healthChecks: values.healthChecks
	commonLabels: values.commonLabels
}

objects: {
	gitRepository: templates.#GitRepository & {_config: config}
	kustomization: templates.#Kustomization & {_config: config}
}
```

## Step 6: Test the Module Locally

Build the module with test values:

```yaml
# test-values.yaml
values:
  app:
    name: "my-service"
    namespace: "flux-system"
    team: "platform"
    env: "staging"
  git:
    url: "https://github.com/example/repo.git"
    branch: "main"
    path: "./deploy/staging"
  sync:
    prune: true
    wait: true
    targetNamespace: "staging"
  commonLabels:
    managed-by: "timoni"
```

```bash
timoni build test ./my-flux-app \
  --values test-values.yaml \
  --namespace flux-system
```

Verify the output contains valid GitRepository and Kustomization resources with all labels and configuration applied correctly.

## Step 7: Add Validation Tests

Create CUE tests to validate the module:

```cue
// tests/module_test.cue
package tests

import (
	main "my-flux-app"
)

testBasic: {
	values: main.#Values & {
		app: {
			name: "test-app"
			team: "test-team"
			env:  "dev"
		}
		git: {
			url: "https://github.com/test/repo.git"
		}
	}
	// Verify required fields
	assert: values.app.name != ""
	assert: values.git.url != ""
}
```

Run the tests:

```bash
cue vet ./tests/...
```

## Conclusion

Creating custom Timoni modules for Flux lets you encode your organization's deployment patterns into reusable, validated packages. By defining values schemas in CUE, you get type-safe configuration with defaults and constraints that prevent misconfiguration. The modules can be published to OCI registries and consumed by any team, providing self-service deployment capabilities while enforcing organizational standards. As your patterns evolve, module versioning ensures existing deployments remain stable while new deployments can adopt updated configurations.
