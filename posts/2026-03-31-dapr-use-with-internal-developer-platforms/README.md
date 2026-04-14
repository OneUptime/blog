# How to Use Dapr with Internal Developer Platforms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Internal Developer Platform, IdP, Automation, Self-Service

Description: Learn how to integrate Dapr into an Internal Developer Platform (IDP) using tools like Port, Cortex, or custom tooling to automate component provisioning and service onboarding.

---

An Internal Developer Platform (IDP) abstracts infrastructure complexity behind a self-service interface. Integrating Dapr into your IDP means developers can provision Dapr components, deploy Dapr-enabled services, and access observability dashboards through a single portal without writing YAML or opening Kubernetes tickets.

## What an IDP Does for Dapr

A Dapr-aware IDP:

- Provides a service catalog with Dapr component dependencies visible
- Lets developers provision state stores, pub/sub topics, and secret access through UI forms
- Triggers GitOps workflows to apply Dapr component YAML to the correct namespace
- Shows Dapr health status and metrics per service on the service's detail page
- Enforces organizational Dapr standards automatically

## IDP Architecture for Dapr

```text
Developer (UI/API)
     |
Internal Developer Platform (Port / Cortex / custom)
     |
     +---> GitHub Actions / Argo CD (component provisioning)
     |           |
     |           v
     |     Kubernetes Namespace
     |     [Dapr Component YAML applied]
     |
     +---> Prometheus / Grafana (metrics display)
     +---> Jaeger / Zipkin (traces display)
```

## Port-Based Dapr Integration

Port is a popular IDP platform. Define a Dapr Component blueprint:

```json
{
  "identifier": "daprComponent",
  "title": "Dapr Component",
  "schema": {
    "properties": {
      "componentType": {
        "type": "string",
        "enum": ["state-store", "pubsub", "secret-store", "binding"],
        "title": "Component Type"
      },
      "backingService": {
        "type": "string",
        "title": "Backing Service"
      },
      "environment": {
        "type": "string",
        "enum": ["staging", "production"],
        "title": "Environment"
      },
      "certificationTier": {
        "type": "string",
        "enum": ["Alpha", "Beta", "Stable"],
        "title": "Certification Tier"
      }
    }
  },
  "relations": {
    "usedByServices": {
      "target": "service",
      "many": true
    }
  }
}
```

## Self-Service Component Provisioning Action

Define a Port self-service action that triggers a GitHub Actions workflow:

```json
{
  "identifier": "provisionDaprComponent",
  "title": "Provision Dapr Component",
  "trigger": {
    "type": "self-service"
  },
  "invocationMethod": {
    "type": "GITHUB",
    "org": "myorg",
    "repo": "platform-automation",
    "workflow": "provision-dapr-component.yml"
  },
  "requiredApproval": false
}
```

The triggered GitHub Actions workflow applies the component YAML:

```yaml
# provision-dapr-component.yml
on:
  workflow_dispatch:
    inputs:
      componentType:
        type: choice
        options: [state-store, pubsub, secret-store]
      namespace:
        type: string
      team:
        type: string

jobs:
  provision:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate Component YAML
        run: |
          helm template dapr-components ./charts/dapr-components \
            --set type=${{ inputs.componentType }} \
            --set namespace=${{ inputs.namespace }} \
            > /tmp/component.yaml

      - name: Apply to Kubernetes
        run: |
          kubectl apply -f /tmp/component.yaml -n ${{ inputs.namespace }}
```

## Embedding Dapr Metrics in the IDP

Pull Dapr sidecar metrics into your IDP service pages using the Port metrics integration:

```yaml
# Port data source configuration
integrations:
  - type: prometheus
    queries:
      dapr_request_rate:
        query: 'sum(rate(dapr_http_server_request_count{app_id="{{service.daprAppId}}"}[5m]))'
      dapr_error_rate:
        query: 'sum(rate(dapr_http_server_request_count{app_id="{{service.daprAppId}}", status=~"5.*"}[5m]))'
```

## Automated Dapr Standards Enforcement

Run nightly checks from the IDP to flag services that violate Dapr standards:

```bash
#!/bin/bash
# check-dapr-standards.sh

kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.metadata.annotations["dapr.io/enabled"] == "true") |
  {
    service: .metadata.name,
    hasConfig: (.metadata.annotations["dapr.io/config"] != null),
    logLevel: .metadata.annotations["dapr.io/log-level"]
  } |
  select(.hasConfig == false or .logLevel == "debug") |
  "VIOLATION: \(.service)"
'
```

Post violations to your IDP dashboard for the platform team to review.

## Summary

Integrating Dapr into an Internal Developer Platform involves defining Dapr component blueprints in your IDP catalog, creating self-service provisioning actions that trigger GitOps workflows to apply component YAML, embedding Dapr metrics on service detail pages, and running automated standards compliance checks. This makes Dapr invisible to developers while ensuring consistent configuration across the organization.
