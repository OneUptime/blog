# How to configure Kustomize commonLabels and commonAnnotations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Learn how to use Kustomize commonLabels and commonAnnotations to consistently apply metadata across all resources in your Kubernetes manifests.

---

Kustomize commonLabels and commonAnnotations transformers automatically add labels and annotations to all resources and their selectors. This ensures consistent metadata across your entire application without manually editing each resource. These transformers are essential for governance, monitoring, and resource organization.

## Understanding commonLabels

CommonLabels adds labels to all resources and updates selectors to match. This includes Deployment selectors, Service selectors, and any other label-based selection mechanism. The transformer understands Kubernetes semantics and applies labels appropriately to both resource metadata and pod templates.

This automatic propagation ensures your labels remain consistent even as you add new resources or modify existing ones.

## Basic commonLabels usage

Apply labels to all resources:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
- configmap.yaml

commonLabels:
  app: web-application
  team: platform
  environment: production
```

Every resource gets these labels in metadata.labels and appropriate selectors update automatically.

## Label propagation to selectors

Labels apply to both resources and selectors:

```yaml
# base/deployment.yaml (before)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
```

After applying commonLabels:

```yaml
# Kustomize output
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    app: web-application
    team: platform
    environment: production
spec:
  selector:
    matchLabels:
      app: web
      team: platform
      environment: production
  template:
    metadata:
      labels:
        app: web
        team: platform
        environment: production
```

## Service selector updates

Services automatically select pods with common labels:

```yaml
# base/service.yaml (before)
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 8080
```

After commonLabels:

```yaml
# Kustomize output
apiVersion: v1
kind: Service
metadata:
  name: web-app
  labels:
    app: web-application
    team: platform
    environment: production
spec:
  selector:
    app: web
    team: platform
    environment: production
  ports:
  - port: 80
    targetPort: 8080
```

## Common annotations usage

Apply annotations consistently:

```yaml
commonAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  deployment-date: "2026-02-09"
  managed-by: kustomize
```

Annotations apply to all resource metadata.

## Combining labels and annotations

Use both transformers together:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
- ingress.yaml

commonLabels:
  app: web-app
  version: v2.1.0
  tier: frontend

commonAnnotations:
  prometheus.io/scrape: "true"
  monitoring.enabled: "true"
  contact: platform-team@example.com
```

## Environment-specific labels

Different labels per environment:

```yaml
# overlays/development/kustomization.yaml
commonLabels:
  environment: development
  cost-center: engineering
  auto-delete: "true"

# overlays/production/kustomization.yaml
commonLabels:
  environment: production
  cost-center: operations
  critical: "true"
```

## Team ownership labels

Track resource ownership:

```yaml
commonLabels:
  team: platform
  owner: john.doe@example.com
  cost-allocation: team-platform
  slack-channel: platform-team
```

## Compliance and governance labels

Add required compliance labels:

```yaml
commonLabels:
  compliance: pci-dss
  data-classification: confidential
  backup-required: "true"
  retention-policy: 7-years

commonAnnotations:
  security-scan: passed
  last-audit: "2026-02-01"
  compliance-officer: compliance@example.com
```

## Monitoring and alerting annotations

Configure monitoring systems:

```yaml
commonAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "9090"
  prometheus.io/path: "/metrics"
  alert-slack-channel: "#platform-alerts"
  pager-duty-service: "web-app-prod"
```

## Release tracking labels

Track releases and versions:

```yaml
commonLabels:
  release: v2.1.0
  release-date: "2026-02-09"
  git-commit: abc123def456

commonAnnotations:
  release-notes: "https://github.com/org/repo/releases/v2.1.0"
  changelog: "Added new features X, Y, Z"
```

## Cost allocation tags

Enable cloud cost tracking:

```yaml
commonLabels:
  cost-center: engineering
  project: web-platform
  budget-owner: jane.smith@example.com
  billing-code: ENG-2024-001
```

## Network policy labels

Labels for network policies:

```yaml
# base/kustomization.yaml
commonLabels:
  network-zone: dmz
  allow-internet: "true"
  allow-database: "true"
---
# base/networkpolicy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: app-network-policy
spec:
  podSelector:
    matchLabels:
      network-zone: dmz  # Matches common label
  policyTypes:
  - Ingress
  - Egress
```

## Service mesh labels

Configure service mesh behavior:

```yaml
commonLabels:
  version: v1
  app: web-app

commonAnnotations:
  sidecar.istio.io/inject: "true"
  traffic.sidecar.istio.io/includeOutboundIPRanges: "*"
  proxy.istio.io/config: |
    holdApplicationUntilProxyStarts: true
```

## Avoiding label conflicts

Don't override existing selectors:

```yaml
# base/deployment.yaml
spec:
  selector:
    matchLabels:
      app: specific-app  # Keep this specific
  template:
    metadata:
      labels:
        app: specific-app  # Keep this specific

# base/kustomization.yaml
commonLabels:
  team: platform  # Add additional labels
  environment: prod  # Don't change app label
```

## Using labels for queries

Query resources by common labels:

```bash
# List all resources for a team
kubectl get all -l team=platform

# Get production resources
kubectl get deployments -l environment=production

# Find resources by cost center
kubectl get all -A -l cost-center=engineering

# Query with multiple labels
kubectl get pods -l app=web-app,environment=production,version=v2.1.0
```

## Annotation-based automation

Trigger automation with annotations:

```yaml
commonAnnotations:
  backup.velero.io/enabled: "true"
  backup.velero.io/schedule: "daily"
  cert-manager.io/issuer: "letsencrypt-prod"
  external-dns.alpha.kubernetes.io/hostname: "app.example.com"
```

## Multi-cluster labels

Label for multi-cluster management:

```yaml
commonLabels:
  cluster: us-west-prod
  region: us-west-2
  cluster-type: production
  multi-cluster: "true"
```

## CI/CD pipeline labels

Track deployment metadata:

```yaml
commonLabels:
  ci-pipeline: jenkins
  build-number: "1234"
  deployed-by: ci-automation

commonAnnotations:
  pipeline-url: "https://jenkins.example.com/job/deploy/1234"
  git-branch: main
  git-sha: abc123def456
  deployment-timestamp: "2026-02-09T10:30:00Z"
```

## Resource quotas and limits

Label for quota tracking:

```yaml
commonLabels:
  quota-pool: team-platform
  priority: high
  qos-class: guaranteed
```

## Testing label application

Verify labels are applied:

```bash
# Build and check labels
kustomize build base/ | yq eval 'select(.kind == "Deployment") | .metadata.labels' -

# Verify selector labels
kustomize build base/ | yq eval 'select(.kind == "Deployment") | .spec.selector.matchLabels' -

# Check pod template labels
kustomize build base/ | yq eval 'select(.kind == "Deployment") | .spec.template.metadata.labels' -

# Verify annotations
kustomize build base/ | yq eval 'select(.kind == "Service") | .metadata.annotations' -
```

## Label naming conventions

Follow Kubernetes label conventions:

```yaml
commonLabels:
  # Recommended key format
  app.kubernetes.io/name: web-app
  app.kubernetes.io/instance: web-app-prod
  app.kubernetes.io/version: "2.1.0"
  app.kubernetes.io/component: frontend
  app.kubernetes.io/part-of: e-commerce-platform
  app.kubernetes.io/managed-by: kustomize

  # Organization-specific
  example.com/team: platform
  example.com/cost-center: engineering
```

## Validation

Validate label and annotation syntax:

```bash
# Check for invalid label characters
kustomize build base/ | yq eval '.metadata.labels | keys[]' - | grep -E '[^a-zA-Z0-9._-]'

# Verify label length (max 63 chars)
kustomize build base/ | yq eval '.metadata.labels | keys[]' - | awk 'length > 63'

# Check annotation format
kustomize build base/ | yq eval '.metadata.annotations | keys[]' -
```

## Combining with other transformers

Use with namePrefix and namespace:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

namePrefix: prod-

commonLabels:
  environment: production
  team: platform

commonAnnotations:
  managed-by: kustomize
  deployment-tool: kustomize-v5.0
```

## Best practices

Use consistent label schemas across your organization. Define standard labels for team, environment, cost center, and application.

Keep labels short and meaningful. Remember the 63-character limit for label values.

Use annotations for non-identifying metadata. Labels are for selection and organization, annotations for supplementary information.

Document your labeling strategy in a team runbook or configuration guide.

Use label selectors in monitoring and alerting rules to filter by environment or team.

## Conclusion

Kustomize commonLabels and commonAnnotations provide consistent metadata management across all Kubernetes resources. By automatically updating selectors and propagating labels, they eliminate manual configuration errors and enable powerful resource queries. Use these transformers to implement governance policies, enable cost tracking, configure monitoring, and organize resources across teams and environments. Consistent labeling is foundational to effective Kubernetes resource management at scale.
