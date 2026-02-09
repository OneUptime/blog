# How to Implement Kyverno Mutate Policies to Inject Default Values

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Mutation, Policy Automation, DevOps

Description: Learn how to use Kyverno mutate policies to automatically inject default values, labels, annotations, and configuration into Kubernetes resources, reducing manual configuration and enforcing organizational standards.

---

Kyverno mutate policies let you automatically modify resources during creation or updates, injecting default values that align with organizational standards. Instead of rejecting non-compliant resources, mutation policies fix them automatically, reducing friction for developers while maintaining consistency. This guide shows you how to implement effective mutation policies for common use cases.

## Understanding Mutation Strategies

Kyverno supports three mutation strategies. Strategic merge patches work like kubectl patch, merging values into existing structures. JSON patches use RFC 6902 operations for precise modifications. JSON Patch 6902 provides ordered operations for complex transformations.

Most use cases work well with strategic merge, which is the simplest approach. Use JSON patches when you need precise control over array elements or conditional logic based on existing values.

## Setting Up Your First Mutation Policy

Start with a simple policy that adds labels to all pods. Labels enable resource organization, cost tracking, and policy targeting:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
  annotations:
    policies.kyverno.io/title: Add Default Labels
    policies.kyverno.io/category: Other
    policies.kyverno.io/description: >-
      Automatically add environment and team labels to all pods.
spec:
  background: false  # Mutations only work on new/updated resources
  rules:
    - name: add-labels
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        patchStrategicMerge:
          metadata:
            labels:
              +(environment): production
              +(team): platform
```

The `+()` syntax means "add this field if it does not exist". Without the plus, Kyverno would overwrite any existing value. This preserves developer-specified labels while ensuring defaults exist.

## Injecting Security Context Defaults

Automatically add security contexts to containers that don't specify them, improving cluster security without developer effort:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-security-context
  annotations:
    policies.kyverno.io/title: Add Default Security Context
    policies.kyverno.io/category: Pod Security
spec:
  background: false
  rules:
    - name: set-container-security-context
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - (name): "{{ element.name }}"
                    securityContext:
                      +(runAsNonRoot): true
                      +(allowPrivilegeEscalation): false
                      +(runAsUser): 1000
                      +(capabilities):
                        drop:
                          - ALL
```

The `foreach` block iterates over all containers in the pod. The `(name)` anchor ensures each patch applies to the correct container. Security defaults get added only when not already specified.

## Adding Resource Limits and Requests

Prevent resource exhaustion by automatically adding resource limits to containers that don't define them:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-resource-limits
  annotations:
    policies.kyverno.io/title: Add Default Resource Limits
    policies.kyverno.io/category: Other
spec:
  background: false
  rules:
    - name: add-default-resources
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - (name): "{{ element.name }}"
                    resources:
                      +(limits):
                        +(memory): "512Mi"
                        +(cpu): "500m"
                      +(requests):
                        +(memory): "256Mi"
                        +(cpu): "250m"
```

This policy sets conservative defaults that prevent runaway resource consumption while allowing developers to override with higher values when needed.

## Injecting Environment Variables

Add common environment variables to all containers, such as cluster information or service mesh settings:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-env-vars
  annotations:
    policies.kyverno.io/title: Inject Environment Variables
    policies.kyverno.io/category: Other
spec:
  background: false
  rules:
    - name: add-cluster-info
      match:
        any:
          - resources:
              kinds:
                - Pod
              namespaces:
                - app-*  # Only apply to app namespaces
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - (name): "{{ element.name }}"
                    env:
                      - name: CLUSTER_NAME
                        value: "production-us-east-1"
                      - name: ENVIRONMENT
                        value: "production"
                      - name: LOG_LEVEL
                        value: "info"
```

The namespace pattern `app-*` limits mutation to application namespaces, avoiding interference with system components.

## Automatic Sidecar Injection

Inject sidecar containers for logging, monitoring, or service mesh functionality without manual configuration:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-logging-sidecar
  annotations:
    policies.kyverno.io/title: Inject Logging Sidecar
    policies.kyverno.io/category: Other
spec:
  background: false
  rules:
    - name: add-fluentbit-sidecar
      match:
        any:
          - resources:
              kinds:
                - Pod
              selector:
                matchLabels:
                  logging: enabled
      mutate:
        patchStrategicMerge:
          spec:
            containers:
              - name: fluentbit
                image: fluent/fluent-bit:2.0
                volumeMounts:
                  - name: varlog
                    mountPath: /var/log
                resources:
                  limits:
                    memory: "128Mi"
                    cpu: "100m"
                  requests:
                    memory: "64Mi"
                    cpu: "50m"
            volumes:
              - name: varlog
                hostPath:
                  path: /var/log
```

This policy only affects pods with the `logging: enabled` label, giving developers control over which workloads get the sidecar.

## Using Context for Dynamic Values

Fetch values from ConfigMaps or other resources to inject into pods:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: inject-config-from-configmap
  annotations:
    policies.kyverno.io/title: Inject Config from ConfigMap
    policies.kyverno.io/category: Other
spec:
  background: false
  rules:
    - name: add-config-env-vars
      match:
        any:
          - resources:
              kinds:
                - Pod
      context:
        - name: appconfig
          configMap:
            name: app-defaults
            namespace: kyverno
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchStrategicMerge:
              spec:
                containers:
                  - (name): "{{ element.name }}"
                    env:
                      - name: API_ENDPOINT
                        value: "{{ appconfig.data.apiEndpoint }}"
                      - name: REGION
                        value: "{{ appconfig.data.region }}"
```

The `context` block loads the ConfigMap once, then uses its values in the mutation. This centralizes configuration management while distributing values to all pods.

## Conditional Mutations Based on Annotations

Apply mutations only when specific annotations are present:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: conditional-mutation
  annotations:
    policies.kyverno.io/title: Conditional Mutation
    policies.kyverno.io/category: Other
spec:
  background: false
  rules:
    - name: add-init-container
      match:
        any:
          - resources:
              kinds:
                - Pod
              annotations:
                init-container: required
      mutate:
        patchStrategicMerge:
          spec:
            initContainers:
              - name: init-permissions
                image: busybox:1.35
                command:
                  - sh
                  - -c
                  - chmod -R 777 /data
                volumeMounts:
                  - name: data
                    mountPath: /data
```

This pattern gives developers fine-grained control. Set the annotation to trigger the mutation, omit it to skip.

## Mutating Service Resources

Mutation works on any Kubernetes resource, not just pods. Add default annotations to services:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-service-annotations
  annotations:
    policies.kyverno.io/title: Add Service Annotations
    policies.kyverno.io/category: Other
spec:
  background: false
  rules:
    - name: annotate-services
      match:
        any:
          - resources:
              kinds:
                - Service
      mutate:
        patchStrategicMerge:
          metadata:
            annotations:
              +(prometheus.io/scrape): "true"
              +(prometheus.io/port): "9090"
              +(prometheus.io/path): "/metrics"
```

These annotations enable automatic Prometheus scraping without manual service configuration.

## Using JSON Patch for Complex Modifications

When strategic merge is insufficient, use JSON patches for precise operations:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: prepend-image-registry
  annotations:
    policies.kyverno.io/title: Prepend Image Registry
    policies.kyverno.io/category: Other
spec:
  background: false
  rules:
    - name: prepend-registry
      match:
        any:
          - resources:
              kinds:
                - Pod
      preconditions:
        all:
          - key: "{{ request.object.spec.containers[].image }}"
            operator: NotIn
            value:
              - "*registry.company.com*"
      mutate:
        foreach:
          - list: "request.object.spec.containers"
            patchesJson6902: |-
              - path: "/spec/containers/{{elementIndex}}/image"
                op: replace
                value: "registry.company.com/{{ element.image }}"
```

The precondition ensures the policy only runs when images don't already have the registry prefix. The JSON patch replaces the image with the prefixed version.

## Testing Mutation Policies

Test mutations before deploying them cluster-wide. Create a test pod and verify the mutations:

```bash
# Create a simple pod
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: test-mutation
spec:
  containers:
    - name: nginx
      image: nginx:1.21
EOF

# Check the pod spec to see injected values
kubectl get pod test-mutation -o yaml
```

Look for the labels, security context, resource limits, or other values your policy should have added.

## Monitoring Mutation Activity

Check Kyverno metrics to see how many resources are being mutated:

```bash
# Get mutation counts
kubectl get policyreport -A

# View detailed policy reports
kubectl describe policyreport -n default
```

High mutation counts might indicate policies that are too broad or developers who need better documentation about defaults.

## Conclusion

Kyverno mutate policies reduce manual configuration while enforcing organizational standards. Start with simple label and annotation injection, then add security context and resource limit defaults. Use foreach loops to handle containers consistently, and leverage context for dynamic values from ConfigMaps. Test policies thoroughly in non-production environments before enforcing them cluster-wide, and monitor mutation activity to ensure policies are working as intended.

Mutation policies create a better developer experience by automatically applying best practices while preserving the ability to override defaults when needed.
