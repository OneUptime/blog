# How to Create Custom Timoni Modules for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, Cue, Module, Custom

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
timoni mod vendor crd -f https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
```

This generates the module structure:

```cue
my-flux-app/
  cue.mod/
    gen/
    module.cue
    pkg/
  templates/
    config.cue
  values.cue
  timoni.cue
  timoni.ignore
  LICENSE
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
		dependsOn: *[] | [...{
			name:       string
			namespace?: string
		}]
		postBuild?: {
			substitute?: [string]: string
			substituteFrom?: [...{
				kind: "ConfigMap" | "Secret"
				name:      string
				optional?: bool
			}]
		}
	}

	// Health check configuration
	healthChecks: *[] | [...{
		apiVersion: string
		kind:       string
		name:       string
		namespace?: string
	}]

	// Common labels applied to all resources
	commonLabels: *{} | {
		[string]: string
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
	#config: #Config

	apiVersion: "source.toolkit.fluxcd.io/v1"
	kind:       "GitRepository"

	metadata: {
		name:      #config.app.name
		namespace: #config.app.namespace
		labels:    #config.commonLabels
		labels: {
			"app.kubernetes.io/name":    #config.app.name
			"app.kubernetes.io/part-of": "flux-sync"
			"team":                      #config.app.team
		}
	}
	spec: {
		interval: #config.git.interval
		url:      #config.git.url
		ref: branch: #config.git.branch
		if #config.git.secretRef != _|_ {
			secretRef: name: #config.git.secretRef.name
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
	#config: #Config

	apiVersion: "kustomize.toolkit.fluxcd.io/v1"
	kind:       "Kustomization"

	metadata: {
		name:      #config.app.name
		namespace: #config.app.namespace
		labels:    #config.commonLabels
		labels: {
			"app.kubernetes.io/name":    #config.app.name
			"app.kubernetes.io/part-of": "flux-sync"
			"team":                      #config.app.team
			"environment":               #config.app.env
		}
	}
	spec: {
		interval: #config.sync.interval
		sourceRef: {
			kind: "GitRepository"
			name: #config.app.name
		}
		path:  #config.git.path
		prune: #config.sync.prune
		wait:  #config.sync.wait
		if #config.sync.timeout != "" {
			timeout: #config.sync.timeout
		}
		if #config.sync.targetNamespace != "" {
			targetNamespace: #config.sync.targetNamespace
		}
		if #config.sync.serviceAccount != "" {
			serviceAccountName: #config.sync.serviceAccount
		}
		if len(#config.sync.dependsOn) > 0 {
			dependsOn: #config.sync.dependsOn
		}
		if #config.sync.postBuild != _|_ {
			postBuild: #config.sync.postBuild
		}
		if len(#config.healthChecks) > 0 {
			healthChecks: #config.healthChecks
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

#Instance: {
	config: #Config
	objects: {
		gitRepository: #GitRepository & {#config: config}
		kustomization: #Kustomization & {#config: config}
	}
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

timoni: {
	instance: templates.#Instance & {
		config: values
	}

	apply: app: [for obj in instance.objects {obj}]
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
timoni build my-service ./my-flux-app \
  --values test-values.yaml \
  --namespace flux-system
```

Verify the output contains valid GitRepository and Kustomization resources with all labels and configuration applied correctly.

## Step 7: Add Validation Tests

Validate the module with the same test values:

```bash
timoni mod vet ./my-flux-app \
  --name my-service \
  --namespace flux-system \
  --values test-values.yaml
```

## Conclusion

Creating custom Timoni modules for Flux lets you encode your organization's deployment patterns into reusable, validated packages. By defining values schemas in CUE, you get type-safe configuration with defaults and constraints that prevent misconfiguration. The modules can be published to OCI registries and consumed by any team, providing self-service deployment capabilities while enforcing organizational standards. As your patterns evolve, module versioning ensures existing deployments remain stable while new deployments can adopt updated configurations.
