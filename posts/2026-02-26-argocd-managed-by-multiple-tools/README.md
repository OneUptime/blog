# How to Use Managed By Annotation with Multiple Tools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Annotation, Multi-Tool

Description: Learn how to link ArgoCD resources to multiple management tools using annotations, deep links, and custom resource configurations for complex toolchains.

---

Real-world Kubernetes resources rarely have a single management tool. A Deployment might be provisioned by Terraform, deployed by ArgoCD, monitored by Datadog, and documented in Confluence. When multiple tools are involved, a single external link annotation is not enough. This guide covers strategies for linking ArgoCD resources to multiple tools simultaneously.

## The Multi-Tool Challenge

Consider a typical production deployment:

```mermaid
graph TD
    A[Kubernetes Deployment] --> B[ArgoCD - Deployment Orchestration]
    A --> C[Terraform - Infrastructure Provisioning]
    A --> D[Datadog - Monitoring and APM]
    A --> E[PagerDuty - Incident Management]
    A --> F[Jira - Issue Tracking]
    A --> G[Confluence - Documentation]
    A --> H[GitHub - Source Code]
    A --> I[Jenkins - CI Pipeline]
```

A single per-resource external link annotation only represents one URL. Here is how to handle multiple tools.

## Strategy 1: Deep Links for Tool-Specific Links

The most powerful approach is using ArgoCD's deep links feature, which supports multiple links per resource:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.links: |
    # Source Code
    - url: "https://github.com/myorg/{{.resource.metadata.name}}"
      title: "Source Code"
      description: "View source on GitHub"
      icon.class: "fa-github"
      if: resource.kind == "Deployment"

    # Monitoring
    - url: "https://app.datadoghq.com/apm/services/{{.resource.metadata.name}}?env=production"
      title: "Datadog APM"
      description: "Application performance monitoring"
      icon.class: "fa-line-chart"
      if: resource.kind == "Deployment"

    # Logging
    - url: "https://grafana.example.com/explore?query={{.resource.metadata.namespace}}/{{.resource.metadata.name}}"
      title: "Logs"
      description: "View logs in Grafana Loki"
      icon.class: "fa-file-text-o"
      if: resource.kind == "Deployment" || resource.kind == "StatefulSet"

    # Infrastructure
    - url: "https://app.terraform.io/app/myorg/workspaces?search={{.resource.metadata.name}}"
      title: "Terraform"
      description: "Infrastructure workspace"
      icon.class: "fa-cloud"
      if: resource.kind == "Deployment" && resource.metadata.namespace == "production"

    # Incidents
    - url: "https://myorg.pagerduty.com/service-directory?query={{.resource.metadata.name}}"
      title: "PagerDuty"
      description: "On-call and incidents"
      icon.class: "fa-bell"
      if: resource.kind == "Deployment" && resource.metadata.namespace == "production"

    # CI/CD
    - url: "https://github.com/myorg/{{.resource.metadata.name}}/actions"
      title: "CI Pipelines"
      description: "GitHub Actions workflows"
      icon.class: "fa-play"
      if: resource.kind == "Deployment"

    # Documentation
    - url: "https://wiki.internal.company/services/{{.resource.metadata.name}}"
      title: "Documentation"
      description: "Service documentation and runbooks"
      icon.class: "fa-book"
      if: resource.kind == "Deployment"
```

This gives every Deployment in production seven clickable links in the ArgoCD UI.

## Strategy 2: Combined Annotation Approach

Use an Argo CD external link annotation for the primary tool and custom annotations for supplementary links:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  annotations:
    # Primary management link
    link.argocd.argoproj.io/source-code: "https://github.com/myorg/api-server"

    # Custom annotations for other tools (used by deep links)
    myorg.com/monitoring-url: "https://app.datadoghq.com/apm/services/api-server"
    myorg.com/terraform-workspace: "https://app.terraform.io/app/myorg/workspaces/api-server-infra"
    myorg.com/runbook-url: "https://runbooks.internal.company/api-server"
    myorg.com/oncall-url: "https://myorg.pagerduty.com/services/api-server"
```

Then reference these custom annotations in deep links:

```yaml
data:
  resource.links: |
    - url: "{{index .resource.metadata.annotations \"myorg.com/monitoring-url\"}}"
      title: "Monitoring"
      icon.class: "fa-line-chart"
      if: resource.metadata.annotations["myorg.com/monitoring-url"] != nil

    - url: "{{index .resource.metadata.annotations \"myorg.com/runbook-url\"}}"
      title: "Runbook"
      icon.class: "fa-book"
      if: resource.metadata.annotations["myorg.com/runbook-url"] != nil
```

## Strategy 3: Central Link Registry

For organizations with many tools, maintain a central registry that maps services to tool URLs:

```yaml
# ConfigMap acting as a link registry

apiVersion: v1
kind: ConfigMap
metadata:
  name: service-links-registry
  namespace: argocd
data:
  api-server.json: |
    {
      "github": "https://github.com/myorg/api-server",
      "datadog": "https://app.datadoghq.com/apm/services/api-server",
      "terraform": "https://app.terraform.io/app/myorg/workspaces/api-server",
      "pagerduty": "https://myorg.pagerduty.com/services/P1234567",
      "confluence": "https://myorg.atlassian.net/wiki/spaces/ENG/pages/123456789",
      "jira": "https://myorg.atlassian.net/jira/software/projects/API/boards/10",
      "grafana": "https://grafana.example.com/d/api-server-dashboard"
    }
  payment-service.json: |
    {
      "github": "https://github.com/myorg/payment-service",
      "datadog": "https://app.datadoghq.com/apm/services/payment-service",
      "pagerduty": "https://myorg.pagerduty.com/services/P7654321",
      "grafana": "https://grafana.example.com/d/payment-dashboard"
    }
```

## Strategy 4: Labels for Tool Association

Use labels to drive tool-specific deep links:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  labels:
    app: api-server
    team: backend
    tier: api
    monitoring: datadog
    infra-managed-by: terraform
    ci-tool: github-actions
```

Then create conditional deep links based on labels:

```yaml
data:
  resource.links: |
    # Show Datadog link only for resources with monitoring=datadog label
    - url: "https://app.datadoghq.com/apm/services/{{.resource.metadata.name}}"
      title: "Datadog"
      icon.class: "fa-line-chart"
      if: resource.metadata.labels["monitoring"] == "datadog"

    # Show New Relic link for resources with monitoring=newrelic
    - url: "https://one.newrelic.com/launcher?query={{.resource.metadata.name}}"
      title: "New Relic"
      icon.class: "fa-line-chart"
      if: resource.metadata.labels["monitoring"] == "newrelic"

    # Show Terraform for infra-managed resources
    - url: "https://app.terraform.io/app/myorg/workspaces?search={{.resource.metadata.name}}"
      title: "Terraform"
      icon.class: "fa-cloud"
      if: resource.metadata.labels["infra-managed-by"] == "terraform"

    # Show Pulumi for pulumi-managed resources
    - url: "https://app.pulumi.com/myorg/{{.resource.metadata.name}}"
      title: "Pulumi"
      icon.class: "fa-cloud"
      if: resource.metadata.labels["infra-managed-by"] == "pulumi"
```

## Organizing Links by Category

Group your deep links into logical categories for better UX:

```yaml
data:
  resource.links: |
    # === Development ===
    - url: "https://github.com/myorg/{{.resource.metadata.name}}"
      title: "[Dev] Source Code"
      icon.class: "fa-github"
      if: resource.kind == "Deployment"

    - url: "https://github.com/myorg/{{.resource.metadata.name}}/actions"
      title: "[Dev] CI/CD"
      icon.class: "fa-play"
      if: resource.kind == "Deployment"

    # === Operations ===
    - url: "https://grafana.example.com/d/k8s?var-workload={{.resource.metadata.name}}&var-namespace={{.resource.metadata.namespace}}"
      title: "[Ops] Metrics"
      icon.class: "fa-line-chart"
      if: resource.kind == "Deployment"

    - url: "https://grafana.example.com/explore?query={{.resource.metadata.name}}"
      title: "[Ops] Logs"
      icon.class: "fa-file-text-o"
      if: resource.kind == "Deployment"

    - url: "https://runbooks.internal.company/{{.resource.metadata.name}}"
      title: "[Ops] Runbook"
      icon.class: "fa-book"
      if: resource.kind == "Deployment"

    # === Infrastructure ===
    - url: "https://app.terraform.io/app/myorg/workspaces?search={{.resource.metadata.name}}"
      title: "[Infra] Terraform"
      icon.class: "fa-cloud"
      if: resource.kind == "Deployment" && resource.metadata.namespace == "production"

    # === Business ===
    - url: "https://myorg.atlassian.net/wiki/search?text={{.resource.metadata.name}}"
      title: "[Docs] Confluence"
      icon.class: "fa-book"
      if: resource.kind == "Deployment"
```

## Per-Team Tool Configurations

Different teams may use different tools. Handle this with conditional logic:

```yaml
data:
  resource.links: |
    # Backend team uses Datadog
    - url: "https://app.datadoghq.com/apm/services/{{.resource.metadata.name}}"
      title: "Datadog APM"
      icon.class: "fa-line-chart"
      if: resource.metadata.labels["team"] == "backend"

    # Frontend team uses Sentry
    - url: "https://sentry.io/organizations/myorg/issues/?query=service:{{.resource.metadata.name}}"
      title: "Sentry Errors"
      icon.class: "fa-exclamation-triangle"
      if: resource.metadata.labels["team"] == "frontend"

    # Data team uses Datadog + custom dashboards
    - url: "https://grafana.example.com/d/data-pipelines?var-pipeline={{.resource.metadata.name}}"
      title: "Pipeline Dashboard"
      icon.class: "fa-line-chart"
      if: resource.metadata.labels["team"] == "data"

    # Platform team uses different monitoring
    - url: "https://oneuptime.com/dashboard/monitors?query={{.resource.metadata.name}}"
      title: "OneUptime Monitor"
      icon.class: "fa-line-chart"
      if: resource.metadata.labels["team"] == "platform"
```

## Auditing Multi-Tool Links

Verify all resources have the expected tool links:

```bash
#!/bin/bash
# audit-tool-links.sh - Audit which tools are linked to which resources

NAMESPACE="${1:-production}"

echo "=== Tool Link Audit for $NAMESPACE ==="
echo ""

# Check primary external link annotations
echo "Resources with source-code link annotation:"
kubectl get all -n "$NAMESPACE" -o json | \
  jq -r '.items[] |
    select(.metadata.annotations["link.argocd.argoproj.io/source-code"] != null) |
    "  \(.kind)/\(.metadata.name) -> \(.metadata.annotations["link.argocd.argoproj.io/source-code"])"'

echo ""

# Check custom tool annotations
echo "Resources with monitoring-url annotation:"
kubectl get all -n "$NAMESPACE" -o json | \
  jq -r '.items[] |
    select(.metadata.annotations["myorg.com/monitoring-url"] != null) |
    "  \(.kind)/\(.metadata.name) -> \(.metadata.annotations["myorg.com/monitoring-url"])"'

echo ""

# Check resources missing tool links
echo "Resources WITHOUT source-code link annotation:"
kubectl get deployments -n "$NAMESPACE" -o json | \
  jq -r '.items[] |
    select(.metadata.annotations["link.argocd.argoproj.io/source-code"] == null) |
    "  \(.metadata.name)"'
```

## Best Practices for Multi-Tool Linking

1. **Prioritize links** - Put the most important links first (monitoring, then runbooks, then source code)
2. **Use consistent naming** - Prefix link titles with categories like [Dev], [Ops], [Infra]
3. **Limit link count** - Having too many links per resource creates clutter. Aim for 5 to 7 maximum
4. **Use conditional logic** - Not every resource needs every link. Use conditions wisely
5. **Validate URLs periodically** - Automated checks catch broken links before engineers do
6. **Document your convention** - Create a team guide explaining which tools are linked and why
7. **Use labels for flexibility** - Labels let you vary tool links without changing the deep links config

Managing resources with multiple tools is the reality of modern infrastructure. By leveraging ArgoCD's deep links, custom annotations, and conditional display logic, you can create a unified navigation experience that connects all your tools through the ArgoCD UI. This reduces context-switching, speeds up incident response, and gives every team member a clear picture of the entire toolchain behind each resource.
