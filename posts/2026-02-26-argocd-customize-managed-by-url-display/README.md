# How to Customize Managed By URL Display in UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI, Customization

Description: Learn how to customize how managed-by URLs are displayed in the ArgoCD UI including link text, icons, and conditional display logic.

---

The `argocd.argoproj.io/managed-by-url` annotation in ArgoCD controls where child Application links point in multi-instance setups. For readable links from applications and resources to external tools, ArgoCD deep links give you meaningful titles, appropriate icons, and conditional logic so the UI is more informative and navigable for your teams.

## Default Display Behavior

By default, `argocd.argoproj.io/managed-by-url` only changes the base URL ArgoCD uses when linking to another Application. It does not let you set a custom title, description, or icon for links to tools such as `https://grafana.example.com/d/k8s-workloads?var-namespace=production&var-workload=api-server`.

## Using Deep Links for Better Display

ArgoCD's deep links feature (configured in `argocd-cm`) gives you full control over how external links appear:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.links: |
    - url: "https://grafana.example.com/d/k8s-workloads?var-namespace={{.resource.metadata.namespace}}&var-workload={{.resource.metadata.name}}"
      title: "Grafana Metrics"
      description: "View resource metrics in Grafana"
      icon.class: "fa-chart-line"
      if: resource.kind == "Deployment"

    - url: "https://runbooks.internal.company/services/{{.resource.metadata.name}}"
      title: "Runbook"
      description: "Operational runbook for this service"
      icon.class: "fa-book"
      if: resource.kind == "Deployment" || resource.kind == "StatefulSet"

    - url: "https://github.com/myorg/{{.resource.metadata.name}}"
      title: "Source Code"
      description: "View source code on GitHub"
      icon.class: "fa-github"
      if: resource.kind == "Deployment"
```

Each link has these properties:

- **url** - The URL template with Go template variables
- **title** - A short, readable title shown in the UI
- **description** - A tooltip shown on hover
- **icon.class** - A Font Awesome icon class
- **if** - A conditional expression for when to show the link

## Available Template Variables

The URL and conditional expressions can use these template variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{.resource.metadata.name}}` | Resource name | `api-server` |
| `{{.resource.metadata.namespace}}` | Resource namespace | `production` |
| `{{.resource.kind}}` | Resource kind | `Deployment` |
| `{{.resource.apiVersion}}` | API version | `apps/v1` |
| `{{.resource.metadata.uid}}` | Resource UID | `a1b2c3d4-...` |
| `{{.resource.metadata.creationTimestamp}}` | Creation time | `2026-02-26T...` |

## Conditional Display Logic

Show different links based on resource properties:

```yaml
data:
  resource.links: |
    # Only show for Deployments in production namespace
    - url: "https://pagerduty.com/services/{{.resource.metadata.name}}"
      title: "PagerDuty"
      icon.class: "fa-bell"
      if: resource.kind == "Deployment" && resource.metadata.namespace == "production"

    # Show Kibana link only for StatefulSets (databases)
    - url: "https://kibana.example.com/app/discover?query={{.resource.metadata.name}}"
      title: "Database Logs"
      icon.class: "fa-search"
      if: resource.kind == "StatefulSet"

    # Show for any resource in the monitoring namespace
    - url: "https://grafana.example.com/d/monitoring?var-component={{.resource.metadata.name}}"
      title: "Monitor Config"
      icon.class: "fa-chart-line"
      if: resource.metadata.namespace == "monitoring"

    # Show for CRDs (Custom Resources)
    - url: "https://wiki.internal.company/crds/{{.resource.kind}}"
      title: "CRD Documentation"
      icon.class: "fa-file-alt"
      if: resource.apiVersion != "v1" && !startsWith(resource.apiVersion, "apps/") && !startsWith(resource.apiVersion, "batch/")
```

## Application-Level Links

Configure links at the application level (shown on the application overview):

```yaml
data:
  application.links: |
    - url: "https://grafana.example.com/d/argocd-app?var-app={{.app.metadata.name}}"
      title: "Application Dashboard"
      description: "Grafana dashboard for this application"

    - url: "https://github.com/myorg/gitops-config/tree/main/apps/{{.app.metadata.name}}"
      title: "Git Configuration"
      description: "View the application's GitOps configuration"

    - url: "https://backstage.example.com/catalog/default/component/{{.app.metadata.name}}"
      title: "Service Catalog"
      description: "View in Backstage service catalog"

    - url: "https://jira.example.com/projects/{{.app.metadata.labels.team}}/board"
      title: "Team Board"
      description: "View the owning team's Jira board"
      if: app.metadata.labels.team != nil
```

Application links have access to the full Application CRD spec:

```yaml
data:
  application.links: |
    # Link to the source repo
    - url: "{{.app.spec.source.repoURL}}"
      title: "Source Repository"

    # Link to the target cluster
    - url: "https://console.cloud.google.com/kubernetes/clusters"
      title: "Cluster Console"
      if: contains(app.spec.destination.server, "gke")
```

## Custom Icons

ArgoCD supports Font Awesome icon classes through `icon.class`. Common ones include:

```yaml
data:
  resource.links: |
    - url: "..."
      title: "GitHub"
      icon.class: "fa-github"        # GitHub logo

    - url: "..."
      title: "Dashboard"
      icon.class: "fa-chart-line"    # Dashboard/chart icon

    - url: "..."
      title: "Logs"
      icon.class: "fa-file-alt"      # Document icon

    - url: "..."
      title: "Alert"
      icon.class: "fa-bell"          # Bell/alert icon

    - url: "..."
      title: "Metrics"
      icon.class: "fa-chart-line"    # Activity/chart icon

    - url: "..."
      title: "Search"
      icon.class: "fa-search"        # Search icon

    - url: "..."
      title: "Terminal"
      icon.class: "fa-terminal"      # Terminal icon

    - url: "..."
      title: "Cloud"
      icon.class: "fa-cloud"         # Cloud icon

    - url: "..."
      title: "Documentation"
      icon.class: "fa-book"          # Book icon

    - url: "..."
      title: "External"
      icon.class: "fa-external-link-alt" # External link icon
```

## Complete Production Configuration

Here is a comprehensive production setup:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Resource-level links (shown on individual resources)
  resource.links: |
    # Monitoring
    - url: "https://grafana.example.com/d/workloads?var-namespace={{.resource.metadata.namespace}}&var-workload={{.resource.metadata.name}}"
      title: "Metrics"
      description: "View resource metrics in Grafana"
      icon.class: "fa-chart-line"
      if: resource.kind == "Deployment" || resource.kind == "StatefulSet"

    - url: "https://grafana.example.com/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Loki%22,%7B%22expr%22:%22%7Bnamespace%3D%5C%22{{.resource.metadata.namespace}}%5C%22,%20container%3D%5C%22{{.resource.metadata.name}}%5C%22%7D%22%7D%5D"
      title: "Logs"
      description: "View logs in Grafana Loki"
      icon.class: "fa-file-alt"
      if: resource.kind == "Deployment" || resource.kind == "StatefulSet"

    # Operations
    - url: "https://runbooks.internal.company/services/{{.resource.metadata.name}}"
      title: "Runbook"
      description: "Operational runbook"
      icon.class: "fa-book"
      if: resource.kind == "Deployment"

    - url: "https://pagerduty.com/service-directory?query={{.resource.metadata.name}}"
      title: "On-Call"
      description: "View on-call schedule"
      icon.class: "fa-bell"
      if: resource.kind == "Deployment" && resource.metadata.namespace == "production"

    # Source code
    - url: "https://github.com/myorg/{{.resource.metadata.name}}"
      title: "Source"
      description: "View source code"
      icon.class: "fa-github"
      if: resource.kind == "Deployment"

    # Cloud console
    - url: "https://console.aws.amazon.com/eks/home#/clusters"
      title: "EKS Console"
      description: "View in AWS console"
      icon.class: "fa-cloud"
      if: resource.kind == "Node"

  # Application-level links (shown on application overview)
  application.links: |
    - url: "https://grafana.example.com/d/argocd-app?var-app={{.app.metadata.name}}"
      title: "App Dashboard"

    - url: "{{.app.spec.source.repoURL}}/tree/{{.app.spec.source.targetRevision}}/{{.app.spec.source.path}}"
      title: "Git Source"

    - url: "https://backstage.example.com/catalog/default/component/{{.app.metadata.name}}"
      title: "Service Catalog"
```

## Verifying Link Configuration

After updating the ConfigMap, verify links appear correctly:

```bash
# Restart the ArgoCD server to pick up ConfigMap changes

kubectl rollout restart deployment argocd-server -n argocd

# Check the ConfigMap is applied
kubectl get configmap argocd-cm -n argocd -o yaml | grep -A 50 "resource.links"

# Open the ArgoCD UI and navigate to any application
# Click on a Deployment resource - you should see the configured links
```

## Troubleshooting

### Links Not Appearing

```bash
# 1. Check the ConfigMap syntax
kubectl get configmap argocd-cm -n argocd -o yaml

# 2. Verify YAML is valid
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data.resource\.links}' | \
  python3 -c "import yaml, sys; yaml.safe_load(sys.stdin.read()); print('Valid YAML')"

# 3. Check the server logs for parsing errors
kubectl logs deployment/argocd-server -n argocd --tail=50 | grep -i "link\|error"

# 4. Ensure the 'if' condition matches your resources
# Test conditions by checking resource attributes
kubectl get deployment my-app -n production -o jsonpath='{.kind}'
```

### Template Variables Not Rendering

```bash
# Verify the template variable names are correct
# Common mistakes:
# - Using {{.metadata.name}} instead of {{.resource.metadata.name}} for resource links
# - Using {{.metadata.namespace}} instead of {{.resource.metadata.namespace}} for resource links
# - Using dots in label names without proper escaping
```

Customizing external link display in ArgoCD transforms raw URLs into a polished navigation experience. With meaningful titles, descriptive icons, and conditional logic, your teams get context-aware links that connect ArgoCD to your entire tool ecosystem. Invest time in setting up a comprehensive deep links configuration - it pays dividends every time someone uses the ArgoCD UI.
