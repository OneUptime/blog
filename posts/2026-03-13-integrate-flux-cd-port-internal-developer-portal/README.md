# How to Integrate Flux CD with Port Internal Developer Portal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Port, Platform Engineering, IdP, Developer Portal

Description: Integrate Flux CD with Port IDP for developer self-service so teams can view GitOps deployment state and trigger Flux operations directly from the Port developer portal.

---

## Introduction

Port is a modern internal developer portal that lets platform teams build custom software catalog experiences without writing frontend code. Its entity model, scorecards, and action framework make it particularly well-suited for surfacing GitOps state from Flux CD. Unlike Backstage which requires code to add custom functionality, Port achieves the same result through configuration.

By integrating Flux CD with Port, platform teams can expose Kustomization status, HelmRelease health, and image policy state as Port entities. Developers see current deployment information in a clean UI, and platform teams can build self-service actions that trigger Flux operations - like forcing a reconciliation or suspending a deployment - through Port's action framework.

In this guide you will configure Port's Kubernetes exporter to ingest Flux objects, build a blueprint for Flux services, and create self-service actions for common Flux operations.

## Prerequisites

- A Port account (port.io) with admin access
- Flux CD v2 bootstrapped in your cluster
- Port's Kubernetes exporter deployed in your cluster
- kubectl access to configure the exporter

## Step 1: Deploy Port's Kubernetes Exporter

Port provides a Helm chart for the Kubernetes exporter that syncs cluster resources to Port's catalog.

```yaml
# infrastructure/port/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: port-k8s-exporter
  namespace: port-system
spec:
  interval: 10m
  chart:
    spec:
      chart: port-k8s-exporter
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: port
        namespace: flux-system
  values:
    secret:
      secrets:
        portClientId: ${PORT_CLIENT_ID}
        portClientSecret: ${PORT_CLIENT_SECRET}
    configMap:
      config:
        resources:
          # Sync Flux Kustomizations
          - kind: kustomize.toolkit.fluxcd.io/v1/kustomizations
            selector:
              query: .metadata.namespace != "flux-system" or true
            port:
              entity:
                mappings:
                  - identifier: .metadata.namespace + "-" + .metadata.name
                    title: .metadata.name
                    blueprint: '"fluxKustomization"'
                    properties:
                      namespace: .metadata.namespace
                      sourceRef: .spec.sourceRef.name
                      path: .spec.path
                      interval: .spec.interval
                      ready: .status.conditions[] | select(.type == "Ready") | .status == "True"
                      message: .status.conditions[] | select(.type == "Ready") | .message
                      lastAppliedRevision: .status.lastAppliedRevision
                      suspended: .spec.suspend // false

          # Sync Flux HelmReleases
          - kind: helm.toolkit.fluxcd.io/v2/helmreleases
            port:
              entity:
                mappings:
                  - identifier: .metadata.namespace + "-" + .metadata.name
                    title: .metadata.name
                    blueprint: '"fluxHelmRelease"'
                    properties:
                      namespace: .metadata.namespace
                      chart: .spec.chart.spec.chart
                      chartVersion: .spec.chart.spec.version
                      ready: .status.conditions[] | select(.type == "Ready") | .status == "True"
                      lastAppliedRevision: .status.lastAppliedRevision
```

## Step 2: Create Port Blueprints for Flux Objects

In the Port UI, create blueprints (schema definitions) for Flux resources.

```json
// Port Blueprint: fluxKustomization
{
  "identifier": "fluxKustomization",
  "title": "Flux Kustomization",
  "icon": "GitOps",
  "schema": {
    "properties": {
      "namespace": {
        "type": "string",
        "title": "Namespace"
      },
      "sourceRef": {
        "type": "string",
        "title": "Source Repository"
      },
      "path": {
        "type": "string",
        "title": "Kustomize Path"
      },
      "ready": {
        "type": "boolean",
        "title": "Ready"
      },
      "message": {
        "type": "string",
        "title": "Status Message"
      },
      "lastAppliedRevision": {
        "type": "string",
        "title": "Last Applied Revision"
      },
      "suspended": {
        "type": "boolean",
        "title": "Suspended"
      }
    }
  },
  "relations": {
    "service": {
      "title": "Service",
      "target": "service",
      "required": false,
      "many": false
    }
  }
}
```

## Step 3: Map Flux Kustomizations to Services

Link Flux Kustomizations to their owning service entities using Port relations. Add a label to your Flux Kustomizations that Port can use for mapping.

```yaml
# tenants/overlays/team-alpha/kustomization-my-service.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-service
  namespace: team-alpha
  labels:
    port.io/entity-identifier: my-service   # Links to Port service entity
    port.io/blueprint: service
spec:
  interval: 5m
  path: ./deploy
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
```

Update the exporter config to use this label for relations:

```yaml
relations:
  service:
    value: .metadata.labels["port.io/entity-identifier"]
```

## Step 4: Create Self-Service Actions

Port actions let developers trigger Flux operations without kubectl access.

```json
// Port Action: Force Reconciliation
{
  "identifier": "flux_reconcile",
  "title": "Force Reconcile",
  "icon": "Sync",
  "trigger": {
    "type": "self-service",
    "operation": "DAY-2",
    "userInputs": {
      "properties": {},
      "required": []
    },
    "blueprintIdentifier": "fluxKustomization"
  },
  "invocationMethod": {
    "type": "WEBHOOK",
    "url": "https://platform-api.acme.example.com/api/v1/flux/reconcile",
    "agent": false,
    "synchronized": false,
    "method": "POST",
    "headers": {
      "Authorization": "Bearer {{ secrets.PLATFORM_API_TOKEN }}"
    },
    "body": {
      "name": "{{ .entity.identifier }}",
      "namespace": "{{ .entity.properties.namespace }}",
      "triggeredBy": "{{ .trigger.by.user.email }}"
    }
  }
}
```

```json
// Port Action: Suspend Reconciliation
{
  "identifier": "flux_suspend",
  "title": "Suspend Reconciliation",
  "icon": "Pause",
  "trigger": {
    "type": "self-service",
    "operation": "DAY-2",
    "userInputs": {
      "properties": {
        "reason": {
          "type": "string",
          "title": "Reason for suspension"
        }
      },
      "required": ["reason"]
    },
    "blueprintIdentifier": "fluxKustomization"
  },
  "invocationMethod": {
    "type": "WEBHOOK",
    "url": "https://platform-api.acme.example.com/api/v1/flux/suspend",
    "method": "POST",
    "body": {
      "name": "{{ .entity.identifier }}",
      "namespace": "{{ .entity.properties.namespace }}",
      "reason": "{{ .inputs.reason }}"
    }
  }
}
```

## Step 5: Build a Flux Deployment Scorecard

Port scorecards let you define quality gates and track adoption of platform standards.

```json
// Port Scorecard: Flux Deployment Health
{
  "identifier": "fluxDeploymentHealth",
  "title": "GitOps Deployment Health",
  "levels": [
    { "color": "red", "title": "Basic" },
    { "color": "orange", "title": "Bronze" },
    { "color": "green", "title": "Gold" }
  ],
  "rules": [
    {
      "identifier": "kustomizationExists",
      "title": "Has Flux Kustomization",
      "level": "Basic",
      "query": {
        "combinator": "and",
        "conditions": [
          {
            "operator": "relatedTo",
            "blueprint": "fluxKustomization"
          }
        ]
      }
    },
    {
      "identifier": "kustomizationReady",
      "title": "Kustomization is Ready",
      "level": "Bronze",
      "query": {
        "combinator": "and",
        "conditions": [
          {
            "property": "ready",
            "operator": "=",
            "value": true
          }
        ]
      }
    },
    {
      "identifier": "notSuspended",
      "title": "Reconciliation is Active",
      "level": "Gold",
      "query": {
        "combinator": "and",
        "conditions": [
          {
            "property": "suspended",
            "operator": "=",
            "value": false
          }
        ]
      }
    }
  ]
}
```

## Best Practices

- Use Port's relations model to create clear ownership chains: Service → FluxKustomization → GitRepository
- Restrict self-service actions (like suspend) to service owners using Port's ownership-based permissions
- Surface Flux audit events in Port's activity log by posting to Port's audit API from Flux notifications
- Build scorecards that incentivize teams to keep their Kustomizations healthy and up-to-date
- Use Port's `ttl` feature to automatically expire entities for deleted Flux resources
- Combine the Kubernetes exporter with Port's GitHub integration to link commits to deployments

## Conclusion

Port's flexible blueprint and exporter model makes it straightforward to build a rich GitOps dashboard on top of Flux CD without writing custom frontend code. Developers get real-time deployment visibility and self-service day-2 actions directly in their developer portal, while platform teams use scorecards to measure and improve GitOps adoption across the organization.
