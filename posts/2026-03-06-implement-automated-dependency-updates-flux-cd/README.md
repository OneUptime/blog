# How to Implement Automated Dependency Updates with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, dependency updates, automation, renovate, dependabot, helm, kubernetes, gitops

Description: A practical guide to automating Helm chart, container image, and infrastructure dependency updates in Flux CD repositories using Renovate and image automation controllers.

---

## Introduction

Keeping dependencies up to date is critical for security and stability, but manually tracking and updating Helm chart versions, container images, and infrastructure components across multiple environments is tedious and error-prone. Flux CD provides built-in image update automation, and tools like Renovate can handle Helm chart and other dependency updates.

This guide covers how to set up a fully automated dependency update pipeline for your Flux CD repositories, including image automation, Helm chart updates, and safe rollout strategies.

## Prerequisites

- A Kubernetes cluster (v1.24+)
- Flux CD v2 installed with image automation controllers
- A Git repository connected to Flux CD
- Renovate or Dependabot configured (for Helm chart updates)
- A container registry accessible from your cluster

## Setting Up Flux CD Image Automation

Flux CD's image automation controllers automatically detect new container image versions and update your Git repository.

### Installing Image Automation Controllers

```yaml
# clusters/production/flux-system/gotk-components.yaml
# Ensure image automation components are included in your Flux installation
# Bootstrap with: flux bootstrap github --components-extra=image-reflector-controller,image-automation-controller
```

### Configuring Image Repository Scanning

```yaml
# clusters/production/image-automation/image-repos.yaml
# ImageRepository tells Flux which container registries to scan
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: api-server
  namespace: flux-system
spec:
  # Container image to scan for new tags
  image: myregistry.io/myapp/api-server
  # How frequently to check for new images
  interval: 5m
  # Optional: authenticate with the registry
  secretRef:
    name: registry-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: worker
  namespace: flux-system
spec:
  image: myregistry.io/myapp/worker
  interval: 5m
  secretRef:
    name: registry-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: frontend
  namespace: flux-system
spec:
  image: myregistry.io/myapp/frontend
  interval: 5m
  secretRef:
    name: registry-credentials
```

### Defining Image Update Policies

```yaml
# clusters/production/image-automation/image-policies.yaml
# ImagePolicy defines which image tags are considered for updates
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: api-server
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-server
  policy:
    semver:
      # Only update to patch versions automatically (e.g., 1.2.3 -> 1.2.4)
      range: "1.2.x"
  filterTags:
    # Only consider tags matching semantic versioning
    pattern: '^(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: worker
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: worker
  policy:
    semver:
      # Allow minor version updates for non-critical services
      range: ">=1.0.0 <2.0.0"
  filterTags:
    pattern: '^(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: frontend
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: frontend
  policy:
    # Use alphabetical sorting for timestamp-based tags
    alphabetical:
      order: asc
  filterTags:
    # Match tags like main-20260306-abc1234
    pattern: '^main-(?P<ts>[0-9]+)-[a-f0-9]+$'
    extract: '$ts'
```

### Configuring Image Update Automation

```yaml
# clusters/production/image-automation/image-update.yaml
# ImageUpdateAutomation commits image updates back to Git
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      # Author information for automated commits
      author:
        name: flux-image-updater
        email: flux@mycompany.com
      # Commit message template
      messageTemplate: |
        chore(deps): update container images

        Automated image update:
        {{ range .Changed.Changes }}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end }}
    # Push to a separate branch for review (recommended for production)
    push:
      branch: image-updates
  update:
    path: ./apps
    strategy: Setters
```

### Marking Deployments for Image Updates

```yaml
# apps/production/api-server/deployment.yaml
# Deployment with image update markers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          # The marker comment tells Flux which ImagePolicy to use
          image: myregistry.io/myapp/api-server:1.2.3 # {"$imagepolicy": "flux-system:api-server"}
          ports:
            - containerPort: 8080
```

## Automating Helm Chart Updates with Renovate

Renovate can automatically detect and update Helm chart versions in your Flux CD repository.

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended"
  ],
  "flux": {
    "fileMatch": [
      "(^|/)clusters/.+\\.yaml$",
      "(^|/)apps/.+\\.yaml$",
      "(^|/)infrastructure/.+\\.yaml$"
    ]
  },
  "packageRules": [
    {
      "description": "Auto-merge patch updates for stable Helm charts",
      "matchDatasources": ["helm"],
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr",
      "labels": ["helm-update", "auto-merge"]
    },
    {
      "description": "Group minor Helm chart updates for review",
      "matchDatasources": ["helm"],
      "matchUpdateTypes": ["minor"],
      "groupName": "helm-minor-updates",
      "labels": ["helm-update", "needs-review"]
    },
    {
      "description": "Require manual review for major Helm chart updates",
      "matchDatasources": ["helm"],
      "matchUpdateTypes": ["major"],
      "labels": ["helm-update", "breaking-change"],
      "automerge": false
    },
    {
      "description": "Auto-merge Flux CD component updates",
      "matchPackageNames": ["fluxcd/*"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true,
      "labels": ["flux-update"]
    }
  ],
  "customManagers": [
    {
      "customType": "regex",
      "fileMatch": ["(^|/)clusters/.+\\.yaml$"],
      "matchStrings": [
        "registryUrl=(?<registryUrl>[^\\s]+)\\s+chart:\\s+(?<depName>[^\\s]+)\\s+version:\\s+(?<currentValue>[^\\s]+)"
      ],
      "datasourceTemplate": "helm"
    }
  ]
}
```

## HelmRelease with Automated Version Updates

```yaml
# apps/production/monitoring/helmrelease.yaml
# HelmRelease that Renovate will automatically update
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      # Renovate will automatically update this version
      version: "56.6.2"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
      interval: 12h
  # Upgrade configuration for safe rollouts
  upgrade:
    # Clean up old resources on upgrade
    cleanupOnFail: true
    # Remediation strategy if upgrade fails
    remediation:
      retries: 3
  # Automatic rollback if upgrade fails health checks
  test:
    enable: true
  values:
    prometheus:
      prometheusSpec:
        retention: 30d
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
```

## Setting Up Dependency Update Notifications

```yaml
# clusters/production/notifications/dependency-alerts.yaml
# Notify the team about dependency update events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: deps-slack
  namespace: flux-system
spec:
  type: slack
  channel: dependency-updates
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: image-update-alerts
  namespace: flux-system
spec:
  providerRef:
    name: deps-slack
  eventSeverity: info
  eventSources:
    # Alert on image policy and automation events
    - kind: ImagePolicy
      name: "*"
      namespace: flux-system
    - kind: ImageUpdateAutomation
      name: "*"
      namespace: flux-system
    # Alert on HelmRelease upgrade events
    - kind: HelmRelease
      name: "*"
      namespace: "*"
  inclusionList:
    - ".*update.*"
    - ".*upgrade.*"
```

## Implementing Safe Update Strategies

Configure Flux CD to safely roll out dependency updates with health checks and rollback.

```yaml
# apps/production/api-server/kustomization-with-health.yaml
# Flux Kustomization with health checks for safe dependency rollouts
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production/api-server
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Wait for deployment to be healthy before considering reconciliation successful
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: production
  # Timeout for health checks - if deployment is not healthy within this time,
  # Flux will report the reconciliation as failed
  timeout: 5m
  # Retry on failure
  retryInterval: 2m
```

## Summary

Automated dependency updates with Flux CD reduce manual toil and improve security posture by ensuring your infrastructure components stay current. The key practices covered include:

- Setting up Flux CD image automation controllers for container image updates
- Defining image policies with semantic versioning constraints for safe updates
- Using Renovate for automated Helm chart version updates with tiered auto-merge rules
- Marking deployments with image policy annotations for automated updates
- Configuring notifications for dependency update events
- Implementing safe rollout strategies with health checks and rollback

By automating dependency updates, you maintain a secure and up-to-date infrastructure while freeing your team to focus on higher-value work.
