# How to use Kustomize buildMetadata for tracking overlay information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Metadata

Description: Learn how to leverage Kustomize buildMetadata field to track build information and overlay origins in generated resources for better traceability and debugging.

---

Understanding which overlay generated specific resources becomes challenging in complex Kustomize setups with multiple layers of inheritance. The buildMetadata field addresses this by injecting metadata about the build process into generated resources. This information helps with debugging, auditing, and understanding the provenance of deployed configurations.

Build metadata particularly helps when troubleshooting issues in production. Rather than tracing through multiple overlay layers manually, you can inspect resource annotations to see exactly which kustomization produced them and when.

## Understanding buildMetadata

The buildMetadata field accepts several values that control what information gets added to resources:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [managedByLabel, originAnnotations]

resources:
- deployment.yaml
```

This configuration adds both a managed-by label and origin annotations to all generated resources.

## Available buildMetadata options

Kustomize supports several buildMetadata values:

- `managedByLabel`: Adds app.kubernetes.io/managed-by label
- `originAnnotations`: Adds config.kubernetes.io/origin annotation
- `transformerAnnotations`: Adds config.kubernetes.io/transformations annotation

You can combine multiple options in an array:

```yaml
buildMetadata: [managedByLabel, originAnnotations, transformerAnnotations]
```

## Adding managed-by labels

The managedByLabel option marks resources as Kustomize-managed:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [managedByLabel]

resources:
- deployment.yaml
```

Generated resources include this label:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app.kubernetes.io/managed-by: kustomize-v5.0.0
spec:
  # ...
```

This helps identify which resources Kustomize controls, useful when mixing managed and unmanaged resources.

## Tracking origin with annotations

Origin annotations show where a resource came from in your kustomization structure:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [originAnnotations]

bases:
- ../../base

namespace: production
```

Resources get annotated with their origin:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    config.kubernetes.io/origin: |
      path: base/deployment.yaml
      ref: overlays/production
spec:
  # ...
```

The annotation shows the original file path and the overlay that included it. This makes it easy to locate the source manifest when debugging.

## Recording transformations

The transformerAnnotations option tracks which transformations modified each resource:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [transformerAnnotations]

namespace: production

commonLabels:
  environment: prod

images:
- name: myapp
  newTag: v2.1.0

resources:
- deployment.yaml
```

Resources include details about applied transformations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    config.kubernetes.io/transformations: |
      - namespace: production
      - commonLabels: {environment: prod}
      - images: {myapp: newTag=v2.1.0}
spec:
  # ...
```

This audit trail shows exactly how the resource was modified from its original form.

## Environment-specific build metadata

Different environments might need different metadata tracking:

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Development doesn't need detailed tracking
buildMetadata: [managedByLabel]

bases:
- ../../base
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Production tracks everything for audit compliance
buildMetadata: [managedByLabel, originAnnotations, transformerAnnotations]

bases:
- ../../base
```

Production environments benefit from comprehensive metadata, while development keeps it minimal to reduce noise.

## Integrating with CI/CD pipelines

Combine buildMetadata with CI/CD information for complete traceability:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [managedByLabel, originAnnotations]

commonAnnotations:
  build-number: "${BUILD_NUMBER}"
  git-commit: "${GIT_COMMIT}"
  build-timestamp: "${BUILD_TIMESTAMP}"
  deployed-by: "${DEPLOYER}"

resources:
- deployment.yaml
```

Set these environment variables in your pipeline:

```bash
#!/bin/bash
export BUILD_NUMBER="${CI_BUILD_NUMBER}"
export GIT_COMMIT="$(git rev-parse HEAD)"
export BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
export DEPLOYER="${CI_USERNAME}"

envsubst < kustomization.yaml.template > kustomization.yaml
kustomize build . | kubectl apply -f -
```

Resources carry complete deployment context:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app.kubernetes.io/managed-by: kustomize-v5.0.0
  annotations:
    config.kubernetes.io/origin: |
      path: base/deployment.yaml
    build-number: "12345"
    git-commit: "abc123def456"
    build-timestamp: "2026-02-09T15:30:00Z"
    deployed-by: "ci-bot"
```

## Querying resources by build metadata

Use kubectl to find resources based on build metadata:

```bash
# Find all Kustomize-managed resources
kubectl get all -A -l app.kubernetes.io/managed-by=kustomize-v5.0.0

# Find resources from specific build
kubectl get deploy -o jsonpath='{.items[?(@.metadata.annotations.build-number=="12345")].metadata.name}'

# Find resources deployed by specific user
kubectl get deploy -o yaml | grep "deployed-by: alice"
```

This metadata enables powerful filtering and analysis of your deployed resources.

## Debugging with build metadata

When troubleshooting issues, build metadata provides valuable context:

```bash
# Get deployment details including metadata
kubectl get deploy my-app -o yaml

# Extract origin information
kubectl get deploy my-app -o jsonpath='{.metadata.annotations.config\.kubernetes\.io/origin}'

# View transformation history
kubectl get deploy my-app -o jsonpath='{.metadata.annotations.config\.kubernetes\.io/transformations}'
```

The metadata reveals the exact path through your kustomization structure, making it easier to identify where issues were introduced.

## Build metadata in multi-layer overlays

In complex hierarchies, build metadata tracks the full chain:

```
base/
└── kustomization.yaml

overlays/
├── shared/
│   └── kustomization.yaml
└── production/
    └── kustomization.yaml
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [originAnnotations]

bases:
- ../shared
```

The origin annotation shows the complete inheritance:

```yaml
annotations:
  config.kubernetes.io/origin: |
    path: base/deployment.yaml
    ref: overlays/shared
    ref: overlays/production
```

This reveals that the resource passed through both the shared overlay and production overlay.

## Compliance and audit requirements

For regulated environments, build metadata supports audit requirements:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [managedByLabel, originAnnotations, transformerAnnotations]

commonAnnotations:
  compliance-framework: "SOC2"
  audit-required: "true"
  change-ticket: "${CHANGE_TICKET}"
  approved-by: "${APPROVER}"

resources:
- ../../base
```

These annotations provide an audit trail showing who approved changes and when they were deployed.

## Monitoring and alerting based on metadata

Use build metadata for monitoring and alerting:

```yaml
# Prometheus ServiceMonitor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kustomize-deployments
spec:
  selector:
    matchLabels:
      app.kubernetes.io/managed-by: kustomize-v5.0.0
```

Or create alerts for resources missing expected metadata:

```yaml
# PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: kustomize-metadata-check
spec:
  groups:
  - name: kustomize
    rules:
    - alert: MissingBuildMetadata
      expr: |
        count(kube_deployment_labels{label_app_kubernetes_io_managed_by=""}) > 0
      annotations:
        description: "Deployment missing managed-by label"
```

## Performance impact of build metadata

Build metadata adds annotations and labels to resources, increasing their size slightly. For most deployments, this impact is negligible:

```bash
# Compare resource sizes
kustomize build --enable-alpha-plugins . > without-metadata.yaml
kustomize build --enable-alpha-plugins -o buildMetadata=all . > with-metadata.yaml

wc -l without-metadata.yaml with-metadata.yaml
```

Even with all metadata options enabled, the size increase is typically less than 5%. The benefits for debugging and auditing far outweigh this minor cost.

## Excluding metadata from specific resources

Sometimes you need to exclude metadata from certain resources:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

buildMetadata: [managedByLabel, originAnnotations]

resources:
- deployment.yaml
- service.yaml

patches:
- target:
    kind: Secret
  patch: |-
    - op: remove
      path: /metadata/annotations/config.kubernetes.io~1origin
```

This removes origin annotations from Secrets after they're added, useful when annotation size matters.

## Best practices for build metadata

Enable comprehensive build metadata in production environments. The overhead is minimal and the benefits for troubleshooting are substantial.

Combine build metadata with CI/CD annotations for complete traceability. Knowing both the Kustomize source and the build context provides full deployment history.

Use managed-by labels for resource discovery. This makes it easy to find all Kustomize-managed resources in a cluster with mixed management tools.

Document your metadata schema. If you add custom annotations, document what they mean and how to use them for debugging.

Review metadata requirements for compliance. Ensure your build metadata satisfies any audit or compliance requirements your organization has.

## Conclusion

Kustomize's buildMetadata field provides valuable context about resource origins and transformations. This metadata supports debugging, auditing, and operational visibility into your Kubernetes deployments. By tracking where resources came from and how they were modified, you create an audit trail that simplifies troubleshooting and meets compliance requirements.

The minimal overhead of build metadata is well worth the benefits it provides. Whether you're debugging an issue in production, conducting a security audit, or simply trying to understand your infrastructure, build metadata gives you the information you need to work effectively. Combine it with CI/CD integration and monitoring tools to build a comprehensive view of your deployment lifecycle.
