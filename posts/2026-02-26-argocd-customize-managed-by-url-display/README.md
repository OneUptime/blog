# How to Customize Managed By URL Display in UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, UI, Customization

Description: Learn how to customize how managed-by URLs are displayed in the ArgoCD UI including link text, icons, and conditional display logic.

---

The managed-by annotation in ArgoCD adds a clickable link to resources in the UI, but the default display can be improved. By customizing how these URLs appear - with meaningful titles, appropriate icons, and conditional logic - you can make the ArgoCD UI more informative and navigable for your teams.

## Default Display Behavior

By default, when you add an `argocd.argoproj.io/managed-by` annotation, ArgoCD shows the raw URL as a link on the resource. This works, but a URL like `https://grafana.example.com/d/k8s-workloads?var-namespace=production&var-workload=api-server` is not very user-friendly.

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
    - url: "https://grafana.example.com/d/k8s-workloads?var-namespace={{.Namespace}}&var-workload={{.Name}}"
      title: "Grafana Metrics"
      description: "View resource metrics in Grafana"
      icon: "dashboard"
      if: "kind == 'Deployment'"

    - url: "https://runbooks.internal.company/services/{{.Name}}"
      title: "Runbook"
      description: "Operational runbook for this service"
      icon: "book"
      if: "kind == 'Deployment' || kind == 'StatefulSet'"

    - url: "https://github.com/myorg/{{.Name}}"
      title: "Source Code"
      description: "View source code on GitHub"
      icon: "github"
      if: "kind == 'Deployment'"
```

Each link has these properties:

- **url** - The URL template with Go template variables
- **title** - A short, readable title shown in the UI
- **description** - A tooltip shown on hover
- **icon** - An icon identifier
- **if** - A conditional expression for when to show the link

## Available Template Variables

The URL and conditional expressions can use these template variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{.Name}}` | Resource name | `api-server` |
| `{{.Namespace}}` | Resource namespace | `production` |
| `{{.Kind}}` | Resource kind | `Deployment` |
| `{{.Group}}` | API group | `apps` |
| `{{.Version}}` | API version | `v1` |
| `{{.UID}}` | Resource UID | `a1b2c3d4-...` |
| `{{.CreatedAt}}` | Creation time | `2026-02-26T...` |

## Conditional Display Logic

Show different links based on resource properties:

```yaml
data:
  resource.links: |
    # Only show for Deployments in production namespace
    - url: "https://pagerduty.com/services/{{.Name}}"
      title: "PagerDuty"
      icon: "bell"
      if: "kind == 'Deployment' && namespace == 'production'"

    # Show Kibana link only for StatefulSets (databases)
    - url: "https://kibana.example.com/app/discover?query={{.Name}}"
      title: "Database Logs"
      icon: "search"
      if: "kind == 'StatefulSet'"

    # Show for any resource in the monitoring namespace
    - url: "https://grafana.example.com/d/monitoring?var-component={{.Name}}"
      title: "Monitor Config"
      icon: "activity"
      if: "namespace == 'monitoring'"

    # Show for CRDs (Custom Resources)
    - url: "https://wiki.internal.company/crds/{{.Kind}}"
      title: "CRD Documentation"
      icon: "file-text"
      if: "group != '' && group != 'apps' && group != 'batch'"
```

## Application-Level Links

Configure links at the application level (shown on the application overview):

```yaml
data:
  application.links: |
    - url: "https://grafana.example.com/d/argocd-app?var-app={{.metadata.name}}"
      title: "Application Dashboard"
      description: "Grafana dashboard for this application"

    - url: "https://github.com/myorg/gitops-config/tree/main/apps/{{.metadata.name}}"
      title: "Git Configuration"
      description: "View the application's GitOps configuration"

    - url: "https://backstage.example.com/catalog/default/component/{{.metadata.name}}"
      title: "Service Catalog"
      description: "View in Backstage service catalog"

    - url: "https://jira.example.com/projects/{{.metadata.labels.team}}/board"
      title: "Team Board"
      description: "View the owning team's Jira board"
      if: ".metadata.labels.team != nil"
```

Application links have access to the full Application CRD spec:

```yaml
data:
  application.links: |
    # Link to the source repo
    - url: "{{.spec.source.repoURL}}"
      title: "Source Repository"

    # Link to the target cluster
    - url: "https://console.cloud.google.com/kubernetes/clusters"
      title: "Cluster Console"
      if: ".spec.destination.server contains 'gke'"
```

## Custom Icons

ArgoCD supports various icon identifiers. Common ones include:

```yaml
data:
  resource.links: |
    - url: "..."
      title: "GitHub"
      icon: "github"        # GitHub logo

    - url: "..."
      title: "Dashboard"
      icon: "dashboard"     # Dashboard icon

    - url: "..."
      title: "Logs"
      icon: "file-text"     # Document icon

    - url: "..."
      title: "Alert"
      icon: "bell"          # Bell/alert icon

    - url: "..."
      title: "Metrics"
      icon: "activity"      # Activity/chart icon

    - url: "..."
      title: "Search"
      icon: "search"        # Search icon

    - url: "..."
      title: "Terminal"
      icon: "terminal"      # Terminal icon

    - url: "..."
      title: "Cloud"
      icon: "cloud"         # Cloud icon

    - url: "..."
      title: "Documentation"
      icon: "book"          # Book icon

    - url: "..."
      title: "External"
      icon: "external-link" # External link icon
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
    - url: "https://grafana.example.com/d/workloads?var-namespace={{.Namespace}}&var-workload={{.Name}}"
      title: "Metrics"
      description: "View resource metrics in Grafana"
      icon: "activity"
      if: "kind == 'Deployment' || kind == 'StatefulSet'"

    - url: "https://grafana.example.com/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22Loki%22,%7B%22expr%22:%22%7Bnamespace%3D%5C%22{{.Namespace}}%5C%22,%20container%3D%5C%22{{.Name}}%5C%22%7D%22%7D%5D"
      title: "Logs"
      description: "View logs in Grafana Loki"
      icon: "file-text"
      if: "kind == 'Deployment' || kind == 'StatefulSet'"

    # Operations
    - url: "https://runbooks.internal.company/services/{{.Name}}"
      title: "Runbook"
      description: "Operational runbook"
      icon: "book"
      if: "kind == 'Deployment'"

    - url: "https://pagerduty.com/service-directory?query={{.Name}}"
      title: "On-Call"
      description: "View on-call schedule"
      icon: "bell"
      if: "kind == 'Deployment' && namespace == 'production'"

    # Source code
    - url: "https://github.com/myorg/{{.Name}}"
      title: "Source"
      description: "View source code"
      icon: "github"
      if: "kind == 'Deployment'"

    # Cloud console
    - url: "https://console.aws.amazon.com/eks/home#/clusters"
      title: "EKS Console"
      description: "View in AWS console"
      icon: "cloud"
      if: "kind == 'Node'"

  # Application-level links (shown on application overview)
  application.links: |
    - url: "https://grafana.example.com/d/argocd-app?var-app={{.metadata.name}}"
      title: "App Dashboard"

    - url: "{{.spec.source.repoURL}}/tree/{{.spec.source.targetRevision}}/{{.spec.source.path}}"
      title: "Git Source"

    - url: "https://backstage.example.com/catalog/default/component/{{.metadata.name}}"
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
# - Using {{.name}} instead of {{.Name}} (capitalization matters)
# - Using {{.metadata.namespace}} instead of {{.Namespace}} for resource links
# - Using dots in label names without proper escaping
```

Customizing the managed-by URL display in ArgoCD transforms raw URLs into a polished navigation experience. With meaningful titles, descriptive icons, and conditional logic, your teams get context-aware links that connect ArgoCD to your entire tool ecosystem. Invest time in setting up a comprehensive deep links configuration - it pays dividends every time someone uses the ArgoCD UI.
