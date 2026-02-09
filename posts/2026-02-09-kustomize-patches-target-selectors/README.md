# How to use Kustomize patches with target selectors for precise updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Configuration

Description: Master Kustomize target selectors to apply patches precisely to specific resources using kind, name, namespace, labels, and annotations for fine-grained control.

---

Patches in Kustomize let you modify Kubernetes resources without changing the original manifests. When working with multiple similar resources, you need precision in targeting which resources get patched. Target selectors provide this control by letting you specify exactly which resources should receive modifications based on various criteria.

Understanding target selectors is essential for building maintainable Kustomize overlays. Rather than creating separate patches for each resource, you can write one patch that applies to multiple resources matching specific criteria. This reduces duplication and makes your configuration easier to maintain.

## Basic patch structure with targets

Every patch in Kustomize can include a target section that specifies which resources the patch should modify:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml

patches:
- target:
    kind: Deployment
    name: api-server
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 5
```

This patch only affects the Deployment named "api-server". Other Deployments and other resource types remain unchanged. This precision prevents accidental modifications to unrelated resources.

## Selecting by resource kind

The kind selector matches all resources of a specific type. This is useful for applying the same modification across multiple similar resources:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployments/

patches:
- target:
    kind: Deployment
  patch: |-
    - op: add
      path: /spec/template/spec/securityContext
      value:
        runAsNonRoot: true
        runAsUser: 1000
```

This patch adds a security context to all Deployments in the kustomization. You don't need to know the specific names of each Deployment, making it perfect for applying organization-wide security policies.

## Combining multiple selectors

You can combine multiple selector criteria to narrow down matches. Only resources matching all specified criteria will be patched:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    kind: Deployment
    namespace: production
    name: web-.*
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          memory: "512Mi"
          cpu: "250m"
        limits:
          memory: "1Gi"
          cpu: "1000m"
```

This patch matches Deployments in the production namespace whose names start with "web-". The name field supports regular expressions, giving you powerful pattern matching capabilities.

## Selecting by labels

Label selectors let you target resources based on their metadata labels. This is particularly useful when working with resources that follow labeling conventions:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    labelSelector: "tier=frontend"
  patch: |-
    - op: add
      path: /metadata/annotations/prometheus.io~1scrape
      value: "true"
```

The labelSelector uses the same syntax as Kubernetes label selectors. You can use equality-based (=, ==, !=) and set-based (in, notin, exists) operators:

```yaml
patches:
- target:
    labelSelector: "environment in (staging, production), tier=backend"
  patch: |-
    - op: add
      path: /spec/template/spec/nodeSelector
      value:
        workload-type: compute-intensive
```

This patch applies to resources labeled with tier=backend and environment set to either staging or production.

## Selecting by annotations

Annotation selectors work similarly to label selectors but match on annotations instead:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    annotationSelector: "config-version=v2"
  patch: |-
    - op: add
      path: /spec/template/spec/volumes/-
      value:
        name: config-v2
        configMap:
          name: app-config-v2
```

This is useful when you use annotations to track versions or other metadata that should trigger specific configurations.

## Using group and version selectors

For custom resources or specific API versions, you can target by group and version:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    group: apps
    version: v1
    kind: Deployment
  patch: |-
    - op: add
      path: /metadata/labels/deployed-by
      value: kustomize
```

This explicitly targets Deployments from the apps/v1 API group. This is important when you have multiple API versions of the same resource kind and want to patch only specific versions.

## Namespace-scoped targeting

The namespace selector limits patches to resources in specific namespaces:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    kind: Service
    namespace: monitoring
  patch: |-
    - op: add
      path: /metadata/annotations/external-dns.alpha.kubernetes.io~1hostname
      value: monitoring.example.com
```

This ensures your patches only affect resources in the intended namespace, preventing accidental modifications to similarly named resources elsewhere.

## Using strategic merge patches with targets

Target selectors work with both JSON patches and strategic merge patches. Strategic merge patches are often more readable for complex modifications:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    kind: Deployment
    labelSelector: "app=api"
  patch: |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: not-important
    spec:
      template:
        spec:
          containers:
          - name: api
            env:
            - name: LOG_LEVEL
              value: debug
            - name: TRACE_ENABLED
              value: "true"
```

The metadata.name in the patch doesn't matter because the target selector determines which resources get patched. The strategic merge understands Kubernetes resource semantics, so this patch adds or updates the specified environment variables without removing existing ones.

## Patching multiple resources with one definition

A single patch with broad selectors can modify many resources at once:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    kind: Deployment|StatefulSet|DaemonSet
    labelSelector: "requires-monitoring=true"
  patch: |-
    - op: add
      path: /spec/template/spec/containers/-
      value:
        name: metrics-exporter
        image: prometheus/node-exporter:latest
        ports:
        - containerPort: 9100
          name: metrics
```

The pipe symbol (|) in the kind field acts as an OR operator, matching any of the listed kinds. This patch adds a metrics exporter sidecar to all workload resources labeled for monitoring.

## Excluding resources from patches

Sometimes it's easier to specify what shouldn't be patched. While Kustomize doesn't have an explicit exclude mechanism, you can use negative label selectors:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    kind: Service
    labelSelector: "type!=LoadBalancer"
  patch: |-
    - op: add
      path: /spec/type
      value: ClusterIP
```

This patches all Services except those already labeled as LoadBalancer type.

## Using regex for name matching

The name selector supports regular expressions, enabling powerful pattern-based targeting:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
- target:
    kind: Deployment
    name: ".*-worker"
  patch: |-
    - op: add
      path: /spec/template/spec/containers/0/resources/requests
      value:
        cpu: "500m"
        memory: "1Gi"
```

This matches all Deployments whose names end with "-worker", applying consistent resource requests across all worker components.

## Combining patches with different targets

You can layer multiple patches with different selectors to build complex configurations:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

patches:
# Add monitoring to all deployments
- target:
    kind: Deployment
  patch: |-
    - op: add
      path: /metadata/annotations/prometheus.io~1scrape
      value: "true"

# Extra configuration for frontend deployments
- target:
    kind: Deployment
    labelSelector: "tier=frontend"
  patch: |-
    - op: add
      path: /spec/template/spec/affinity
      value:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - topologyKey: kubernetes.io/hostname
            labelSelector:
              matchLabels:
                tier: frontend

# Specific configuration for one deployment
- target:
    kind: Deployment
    name: critical-api
  patch: |-
    - op: replace
      path: /spec/replicas
      value: 10
```

Patches apply in order, and later patches can modify resources that earlier patches already changed. This layering approach lets you build from general to specific configurations.

## Debugging target selectors

When patches don't apply as expected, use `kustomize build` to see the output and verify which resources match your selectors:

```bash
kustomize build . | grep -A 20 "kind: Deployment"
```

If a patch isn't applying, check that your target selector criteria actually match the resource. Common issues include typos in label names, incorrect namespaces, or regex patterns that don't match as expected.

## Best practices for target selectors

Use the most specific selector that accomplishes your goal. Over-broad selectors can accidentally modify resources you didn't intend to change. When in doubt, test with `kustomize build` before applying to a cluster.

Prefer label selectors over name-based selectors when possible. Labels communicate intent and are less brittle than name patterns. If you find yourself using complex name regex patterns, consider whether better labeling would be clearer.

Document your selector logic in comments, especially for complex patches with multiple criteria. Future maintainers will thank you for explaining why specific resources need specific modifications.

## Conclusion

Kustomize target selectors provide fine-grained control over which resources receive patches. By combining kind, name, namespace, label, and annotation selectors, you can precisely target resources for modification without affecting others. This precision is essential for maintaining clean, understandable configuration management at scale.

The ability to apply one patch to multiple resources through label selectors reduces duplication and makes your configurations easier to maintain. Whether you're enforcing security policies, adding monitoring sidecars, or customizing resources for specific environments, target selectors give you the control you need while keeping your kustomizations DRY and maintainable.
