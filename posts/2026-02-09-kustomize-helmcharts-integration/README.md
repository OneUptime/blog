# How to use Kustomize helmCharts for integrating Helm with Kustomize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Helm

Description: Learn how to integrate Helm charts into Kustomize workflows using the helmCharts field for unified configuration management across your Kubernetes deployments.

---

Kustomize and Helm are two popular tools for managing Kubernetes configurations, and each has distinct strengths. Kustomize excels at customizing raw Kubernetes manifests through overlays and patches, while Helm provides templating and package management. Rather than choosing between them, you can combine both approaches using Kustomize's helmCharts feature.

This integration allows you to reference Helm charts directly in your kustomization.yaml file, letting Kustomize inflate the chart and apply overlays or patches on top of the rendered manifests. This gives you the best of both worlds: Helm's rich ecosystem of charts and Kustomize's declarative customization model.

## Why integrate Helm with Kustomize

Many organizations start with Helm for deploying third-party applications but find that Kustomize offers better control for environment-specific customizations. Rather than maintaining complex Helm values files or creating wrapper charts, you can use Kustomize to patch Helm-generated resources.

This approach keeps your configurations DRY (Don't Repeat Yourself) while maintaining clear separation between upstream chart definitions and your custom requirements. You can upgrade charts independently from your customizations, reducing maintenance overhead.

## Basic helmCharts configuration

The helmCharts field in kustomization.yaml lets you specify Helm charts to inflate during the build process. Here's a basic example that deploys the ingress-nginx chart:

```yaml
# kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
- name: ingress-nginx
  repo: https://kubernetes.github.io/ingress-nginx
  version: 4.8.3
  releaseName: nginx-ingress
  namespace: ingress-nginx
  valuesInline:
    controller:
      service:
        type: LoadBalancer
```

When you run `kustomize build --enable-helm`, Kustomize downloads the chart, renders it with the provided values, and includes the resulting manifests in the output. Helm v3 must be installed and available to Kustomize, because Kustomize runs Helm as a subprocess for chart inflation.

## Using values files with helmCharts

Instead of inline values, you can reference external values files just like you would with Helm. This keeps your kustomization.yaml clean and allows you to manage complex configurations more easily:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
- name: prometheus
  repo: https://prometheus-community.github.io/helm-charts
  version: 25.8.0
  releaseName: prometheus
  namespace: monitoring
  valuesFile: prometheus-values.yaml
  additionalValuesFiles:
  - prometheus-production-values.yaml
  valuesInline:
    server:
      replicaCount: 2
```

```yaml
# prometheus-values.yaml
server:
  retention: 30d
  persistentVolume:
    size: 100Gi
    storageClass: fast-ssd

alertmanager:
  enabled: true
  persistentVolume:
    size: 10Gi
```

You can also combine multiple values files or mix files with inline values by using `additionalValuesFiles` and `valuesInline`. Values files are passed to Helm in order, and inline values are combined according to Kustomize's `valuesMerge` setting, which defaults to `override`.

## Applying patches to Helm-generated resources

The real power comes from combining helmCharts with Kustomize patches. After Helm renders the chart, you can modify the resulting resources using standard Kustomize techniques:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
- name: redis
  repo: https://charts.bitnami.com/bitnami
  version: 18.4.0
  releaseName: redis-cache
  namespace: cache

patches:
- target:
    kind: StatefulSet
    name: redis-cache-master
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          memory: "256Mi"
          cpu: "100m"
        limits:
          memory: "512Mi"
          cpu: "500m"
```

This example inflates the Redis chart and then patches the master StatefulSet to add specific resource limits. The patch runs after chart rendering, so you can customize any aspect of the generated manifests without forking the chart.

## Using local charts

You can also reference local Helm charts instead of remote repositories. This is useful for charts that aren't published publicly or when you need to work offline:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmGlobals:
  chartHome: ./charts  # Directory containing unpacked chart directories

helmCharts:
- name: myapp
  releaseName: myapp-prod
  namespace: production
  valuesInline:
    replicas: 3
    image:
      tag: v2.1.0
```

Place the unpacked chart in `charts/myapp`. Kustomize will render it just like it would with a chart that it had pulled from a remote repository.

## Managing multiple environments with helmCharts

A common pattern uses base and overlay directories to manage environment-specific configurations. The base defines the chart reference while overlays patch the rendered output:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
- name: postgresql
  repo: https://charts.bitnami.com/bitnami
  version: 13.2.24
  releaseName: postgres
  namespace: database
  valuesFile: common-values.yaml
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

patches:
- target:
    kind: StatefulSet
    labelSelector: app.kubernetes.io/instance=postgres,app.kubernetes.io/component=primary
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          memory: "512Mi"
          cpu: "250m"
        limits:
          memory: "1Gi"
          cpu: "1"
```

The production overlay inherits the rendered chart output from the base and then applies production-specific patches. Kustomize does not merge partial `helmCharts` entries from overlays into a chart definition in a base, so use patches for post-render changes or provide a complete chart entry in each overlay that needs different Helm values.

## Combining multiple charts

You can include multiple Helm charts in a single kustomization. This is perfect for deploying entire application stacks:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmCharts:
- name: nginx
  repo: https://charts.bitnami.com/bitnami
  version: 15.5.0
  releaseName: web
  namespace: frontend

- name: postgresql
  repo: https://charts.bitnami.com/bitnami
  version: 13.2.24
  releaseName: db
  namespace: backend

- name: redis
  repo: https://charts.bitnami.com/bitnami
  version: 18.4.0
  releaseName: cache
  namespace: backend

labels:
- pairs:
    app.kubernetes.io/part-of: myapp
  includeSelectors: true
```

All charts render during the same build, and you can apply common transformations like labels or namespace changes across all generated resources.

## Advanced: Using helmGlobals

The helmGlobals field lets you define default settings that apply to all charts in your kustomization:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

helmGlobals:
  chartHome: ./charts
  configHome: ./config

helmCharts:
- name: app1
  releaseName: app1

- name: app2
  releaseName: app2
```

This reduces repetition when managing multiple charts with similar configurations. Individual chart settings override the globals when specified.

## Troubleshooting common issues

If Kustomize cannot find your chart, verify that the repository URL is accessible and the version exists. Use `helm search repo` to confirm chart availability.

When patches don't apply correctly, remember that Kustomize uses the post-rendered resource names. If the chart uses name templates, you may need to check the rendered output first with `kustomize build --enable-helm` to identify the correct target names.

For performance issues with large charts, consider keeping pulled charts locally or using local chart directories. Kustomize pulls charts only when they are not already available under the configured chart home.

## Conclusion

Integrating Helm charts into Kustomize workflows through the helmCharts field provides a powerful way to manage Kubernetes configurations. You gain access to the vast Helm chart ecosystem while maintaining the declarative customization model that makes Kustomize so effective.

This approach works particularly well for third-party applications where you need standard deployments with specific customizations. Instead of maintaining forked charts or complex values files, you can patch the rendered manifests using familiar Kustomize techniques. The result is cleaner, more maintainable infrastructure code that adapts easily to changing requirements.
