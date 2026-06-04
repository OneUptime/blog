# How to implement Kustomize transformers for custom resource modification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Infrastructure

Description: Learn how to create and use Kustomize transformers to apply custom modifications across multiple resources automatically for consistent configuration management.

---

Transformers in Kustomize modify resources systematically during the build process. Unlike patches that target specific resources, transformers apply changes across multiple resources based on rules you define. This makes them perfect for organization-wide standards like adding labels, modifying namespaces, or injecting sidecars.

Kustomize includes several built-in transformers and lets you create custom ones through plugins. Understanding how to leverage transformers effectively can dramatically reduce configuration duplication and enforce consistency across your Kubernetes deployments.

## Built-in transformer types

Kustomize provides several built-in transformers that cover common modification scenarios. These transformers apply to all resources in your kustomization automatically.

The namespace transformer changes the namespace field on all resources that support it:

```yaml
# kustomization.yaml

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

resources:
- deployment.yaml
- service.yaml
- ingress.yaml
```

Every namespaced resource will be set to "production". This is simpler than patching each resource individually and ensures consistency across your entire stack.

## Adding common labels and annotations

The labels and commonAnnotations transformers add metadata to all resources. Labels can also be added to selectors when you ask Kustomize to do so, which is useful for tracking and organizing resources:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

labels:
- pairs:
    app.kubernetes.io/name: myapp
    app.kubernetes.io/managed-by: kustomize
    environment: staging
  includeSelectors: true

commonAnnotations:
  contact: devops@example.com
  documentation: https://docs.example.com/myapp
```

These labels get added to resource metadata and, with `includeSelectors: true`, injected into label selectors for Deployments, Services, and other resources that use them. Kustomize is smart enough to maintain selector consistency.

Be careful with selector labels on existing resources. Changing labels that are part of selectors can cause Kubernetes to reject the update or require resources to be recreated.

## Using the namePrefix and nameSuffix transformers

Adding prefixes or suffixes to resource names helps distinguish between different deployments of the same application:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namePrefix: dev-
nameSuffix: -v2

resources:
- deployment.yaml
- service.yaml
```

If your deployment is named "api", the output will have "dev-api-v2" as the name. References between resources update automatically, so a Service pointing to the Deployment will use the transformed name.

## Implementing the replicas transformer

The replicas transformer overrides replica counts in Deployments and StatefulSets:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

replicas:
- name: web-deployment
  count: 5

- name: api-deployment
  count: 3

resources:
- deployments.yaml
```

This is cleaner than patching each deployment individually and makes it obvious how many replicas each component should have in a given environment.

## Transforming images

The images transformer is particularly powerful for updating container images without modifying the original manifests:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

images:
- name: nginx
  newName: nginx
  newTag: 1.24-alpine

- name: myapp
  newName: registry.example.com/myapp
  newTag: v2.3.1
  digest: sha256:24a0c4b4a4c0eb97a1aabb8e29f18e917d05abfe1b7a7c07857230879ce7d3d3

resources:
- deployment.yaml
```

You can change the image name, tag, or both. Using digest ensures you deploy exactly the image you tested, preventing issues from tag mutations. This transformer updates all containers and init containers that use the specified image.

## Creating custom transformer plugins

For more complex modifications, you can create transformer plugins. These are executables that receive resources as input and output modified versions.

Here's the structure for a custom transformer:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

transformers:
- |-
  apiVersion: transformers.example.com/v1
  kind: ResourceLimitAdder
  metadata:
    name: add-limits
    annotations:
      config.kubernetes.io/function: |
        exec:
          path: ./resource-limit-adder.py
  spec:
    limits:
      cpu: "4"
      memory: 8Gi

resources:
- deployment.yaml
```

The executable must exist at the path declared in the function annotation. When Kustomize encounters this configuration, it passes the resources to the function and uses the modified output.

## Building a Python transformer plugin

Here's a practical example of a transformer plugin that adds resource limits to all containers:

```python
#!/usr/bin/env python3
import sys
import yaml

def add_resource_limits(resources, cpu_limit, memory_limit):
    """Add resource limits to all app and init containers in workload resources."""
    for resource in resources:
        if resource.get('kind') in ['Deployment', 'StatefulSet', 'DaemonSet']:
            spec = resource.get('spec', {})
            template = spec.get('template', {})
            pod_spec = template.get('spec', {})

            for field in ('initContainers', 'containers'):
                for container in pod_spec.get(field, []):
                    if 'resources' not in container:
                        container['resources'] = {}
                    if 'limits' not in container['resources']:
                        container['resources']['limits'] = {}

                    container['resources']['limits']['cpu'] = cpu_limit
                    container['resources']['limits']['memory'] = memory_limit

    return resources

def main():
    # KRM exec functions receive a ResourceList on stdin.
    resource_list = yaml.safe_load(sys.stdin)

    config = resource_list['functionConfig']
    cpu_limit = config['spec']['limits']['cpu']
    memory_limit = config['spec']['limits']['memory']

    # Apply transformation
    resource_list['items'] = add_resource_limits(
        resource_list.get('items', []),
        cpu_limit,
        memory_limit
    )

    # Output the modified ResourceList
    yaml.safe_dump(resource_list, sys.stdout, default_flow_style=False)

if __name__ == '__main__':
    main()
```

Save this as the executable referenced by the transformer annotation. The function receives a KRM `ResourceList` via stdin and must output the modified `ResourceList` to stdout.

## Using transformer configurations

Kustomize transformer behavior can be customized through configuration files. These define which fields transformers should modify:

```yaml
# kustomizeconfig.yaml
nameReference:
- kind: Service
  version: v1
  fieldSpecs:
  - path: spec/rules/http/paths/backend/service/name
    kind: Ingress
    group: networking.k8s.io
    version: v1
  - path: spec/defaultBackend/service/name
    kind: Ingress
    group: networking.k8s.io
    version: v1

commonLabels:
- path: spec/template/spec/affinity/podAffinity/requiredDuringSchedulingIgnoredDuringExecution/labelSelector/matchLabels
  create: true
  kind: Deployment
```

This configuration tells Kustomize to update service references in Ingress resources and to add common labels to pod affinity selectors. Include this configuration in your kustomization:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configurations:
- kustomizeconfig.yaml

resources:
- deployment.yaml
```

## Chaining multiple transformers

Transformers execute in a specific order, and their effects stack. Understanding this order helps you predict the final output:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namePrefix: prod-
namespace: production

labels:
- pairs:
    env: prod
    team: platform
  includeSelectors: true

images:
- name: app
  newTag: v2.0.0

replicas:
- name: app-deployment
  count: 10

resources:
- app.yaml
```

Name transformations and replicas both apply during the build. Kustomize can match the replicas entry by the original resource name or the transformed name, but using the original manifest name is usually clearer in overlays. Order matters when transformers affect resource names or selectors.

## Environment-specific transformers

Overlays can apply different transformers to the same base resources. This is the standard pattern for managing multiple environments:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base

namespace: production
namePrefix: prod-

replicas:
- name: app-deployment
  count: 20

images:
- name: app
  newTag: v1.5.2
```

Each overlay applies its own transformers without modifying the base. This keeps environment-specific concerns separated.

## Debugging transformer behavior

Use `kustomize build` to see how transformers modify your resources. For raw exec functions, include both `--enable-alpha-plugins` and `--enable-exec`:

```bash
kustomize build --enable-alpha-plugins --enable-exec overlays/production > output.yaml
```

Review the output to verify that transformers applied as expected. Common issues include selector mismatches or transformers not applying to custom resources.

For custom transformers, add debug output to stderr. Kustomize passes this through, helping you understand what your plugin is doing:

```python
import sys

# Debug output goes to stderr
print(f"Transforming {len(resource_list.get('items', []))} resources", file=sys.stderr)
```

## Best practices for transformers

Use built-in transformers whenever possible. They're well-tested and handle edge cases you might not consider. Only write custom transformers for organization-specific requirements that built-ins can't address.

Keep transformer configurations in version control alongside your kustomizations. This ensures that transformer behavior is reproducible across different environments and team members.

Test transformer changes thoroughly before applying to production. Use `kustomize build` to generate manifests and review them carefully. Transformers that modify selectors or labels can cause resource recreation if not handled properly.

## Conclusion

Kustomize transformers provide a powerful way to apply consistent modifications across all your Kubernetes resources. The built-in transformers handle common scenarios like namespace changes, label additions, and image updates, while the plugin system lets you implement custom transformation logic for specific organizational needs.

By combining transformers with overlays and patches, you can build sophisticated configuration management systems that maintain consistency while allowing necessary environment-specific variations. This approach scales well from small applications to large multi-environment deployments with hundreds of resources.
