# How to Manage Gatekeeper Constraint Templates with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, opa, gatekeeper, constraint templates, rego, gitops, kubernetes, policy

Description: Learn how to create, organize, and manage OPA Gatekeeper ConstraintTemplates using Flux CD for scalable policy-as-code workflows.

---

## Introduction

ConstraintTemplates are the building blocks of OPA Gatekeeper policies. They define reusable policy logic in Rego that can be parameterized through Constraint resources. Managing ConstraintTemplates with Flux CD allows teams to build a shared policy library that is version-controlled, tested, and automatically deployed across clusters.

This guide covers creating various ConstraintTemplates, organizing them into a policy library, and managing the lifecycle through Flux CD.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with OPA Gatekeeper installed
- Flux CD bootstrapped and connected to a Git repository
- kubectl access to the cluster
- Familiarity with the Rego policy language

## Repository Structure for Policy Libraries

Organize your policy library using a clear directory structure.

```
infrastructure/
  gatekeeper/
    templates/
      security/
        disallow-privileged.yaml
        require-readonly-rootfs.yaml
        require-non-root.yaml
      networking/
        require-network-policy.yaml
        restrict-host-ports.yaml
      general/
        required-labels.yaml
        required-annotations.yaml
        block-default-namespace.yaml
      mutations/
        inject-sidecar-label.yaml
    constraints/
      production/
        enforce-security.yaml
        enforce-labels.yaml
      staging/
        warn-security.yaml
        audit-labels.yaml
```

## Template: Disallow Privileged Containers

Prevent containers from running in privileged mode.

```yaml
# infrastructure/gatekeeper/templates/security/disallow-privileged.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sdisallowprivileged
  annotations:
    # Document the template purpose
    description: "Disallows containers from running in privileged mode"
    metadata.gatekeeper.sh/title: "Disallow Privileged Containers"
    metadata.gatekeeper.sh/version: "1.0.0"
spec:
  crd:
    spec:
      names:
        kind: K8sDisallowPrivileged
      validation:
        openAPIV3Schema:
          type: object
          properties:
            # Allow exempting specific containers by name
            exemptContainers:
              type: array
              items:
                type: string
              description: "Container names to exempt from this policy"
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sdisallowprivileged

        # Check regular containers
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not is_exempt(container.name)
          container.securityContext.privileged == true
          msg := sprintf("Container <%v> is running in privileged mode, which is not allowed", [container.name])
        }

        # Check init containers
        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not is_exempt(container.name)
          container.securityContext.privileged == true
          msg := sprintf("Init container <%v> is running in privileged mode", [container.name])
        }

        # Check ephemeral containers
        violation[{"msg": msg}] {
          container := input.review.object.spec.ephemeralContainers[_]
          not is_exempt(container.name)
          container.securityContext.privileged == true
          msg := sprintf("Ephemeral container <%v> is running in privileged mode", [container.name])
        }

        # Helper to check exemptions
        is_exempt(name) {
          exempt := input.parameters.exemptContainers[_]
          name == exempt
        }
```

## Template: Require Read-Only Root Filesystem

Enforce read-only root filesystem for containers.

```yaml
# infrastructure/gatekeeper/templates/security/require-readonly-rootfs.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sreadonlyrootfilesystem
  annotations:
    description: "Requires containers to run with a read-only root filesystem"
    metadata.gatekeeper.sh/title: "Read-Only Root Filesystem"
    metadata.gatekeeper.sh/version: "1.0.0"
spec:
  crd:
    spec:
      names:
        kind: K8sReadOnlyRootFilesystem
      validation:
        openAPIV3Schema:
          type: object
          properties:
            exemptContainers:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sreadonlyrootfilesystem

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not is_exempt(container.name)
          not container.securityContext.readOnlyRootFilesystem == true
          msg := sprintf("Container <%v> must set securityContext.readOnlyRootFilesystem to true", [container.name])
        }

        violation[{"msg": msg}] {
          container := input.review.object.spec.initContainers[_]
          not is_exempt(container.name)
          not container.securityContext.readOnlyRootFilesystem == true
          msg := sprintf("Init container <%v> must set securityContext.readOnlyRootFilesystem to true", [container.name])
        }

        is_exempt(name) {
          exempt := input.parameters.exemptContainers[_]
          name == exempt
        }
```

## Template: Require Non-Root User

Ensure containers do not run as root.

```yaml
# infrastructure/gatekeeper/templates/security/require-non-root.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequirenonroot
  annotations:
    description: "Requires containers to run as non-root user"
    metadata.gatekeeper.sh/title: "Require Non-Root User"
    metadata.gatekeeper.sh/version: "1.0.0"
spec:
  crd:
    spec:
      names:
        kind: K8sRequireNonRoot
      validation:
        openAPIV3Schema:
          type: object
          properties:
            exemptContainers:
              type: array
              items:
                type: string
            # Minimum allowed UID
            minRunAsUser:
              type: integer
              description: "Minimum allowed runAsUser UID"
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequirenonroot

        # Check that runAsNonRoot is set to true
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not is_exempt(container.name)
          not pod_or_container_nonroot(container)
          msg := sprintf("Container <%v> must set runAsNonRoot to true or specify a non-root runAsUser", [container.name])
        }

        # Check if runAsUser is below minimum
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not is_exempt(container.name)
          min_uid := object.get(input.parameters, "minRunAsUser", 1000)
          uid := container.securityContext.runAsUser
          uid < min_uid
          msg := sprintf("Container <%v> runAsUser <%v> is below minimum <%v>", [container.name, uid, min_uid])
        }

        # Helper to check pod or container level runAsNonRoot
        pod_or_container_nonroot(container) {
          container.securityContext.runAsNonRoot == true
        }
        pod_or_container_nonroot(container) {
          input.review.object.spec.securityContext.runAsNonRoot == true
        }
        pod_or_container_nonroot(container) {
          container.securityContext.runAsUser > 0
        }

        is_exempt(name) {
          exempt := input.parameters.exemptContainers[_]
          name == exempt
        }
```

## Template: Block Default Namespace

Prevent resources from being created in the default namespace.

```yaml
# infrastructure/gatekeeper/templates/general/block-default-namespace.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sblockdefaultnamespace
  annotations:
    description: "Blocks resources from being created in the default namespace"
    metadata.gatekeeper.sh/title: "Block Default Namespace"
    metadata.gatekeeper.sh/version: "1.0.0"
spec:
  crd:
    spec:
      names:
        kind: K8sBlockDefaultNamespace
      validation:
        openAPIV3Schema:
          type: object
          properties:
            # Allow exempting specific resource types
            exemptResources:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sblockdefaultnamespace

        violation[{"msg": msg}] {
          input.review.object.metadata.namespace == "default"
          not is_exempt_resource
          msg := sprintf("Resource <%v/%v> cannot be created in the default namespace. Please use a dedicated namespace.", [input.review.object.kind, input.review.object.metadata.name])
        }

        is_exempt_resource {
          exempt := input.parameters.exemptResources[_]
          input.review.object.kind == exempt
        }
```

## Template: Require Resource Limits

Enforce that all containers have resource limits defined.

```yaml
# infrastructure/gatekeeper/templates/general/require-resource-limits.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequireresourcelimits
  annotations:
    description: "Requires containers to have CPU and memory limits set"
    metadata.gatekeeper.sh/title: "Require Resource Limits"
    metadata.gatekeeper.sh/version: "1.0.0"
spec:
  crd:
    spec:
      names:
        kind: K8sRequireResourceLimits
      validation:
        openAPIV3Schema:
          type: object
          properties:
            # Which resource types to require
            requiredResources:
              type: array
              items:
                type: string
              description: "Resource types to require (cpu, memory)"
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequireresourcelimits

        # Check that limits are set for required resources
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          required := input.parameters.requiredResources[_]
          not has_limit(container, required)
          msg := sprintf("Container <%v> must have a %v limit set", [container.name, required])
        }

        # Check that requests are set for required resources
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          required := input.parameters.requiredResources[_]
          not has_request(container, required)
          msg := sprintf("Container <%v> must have a %v request set", [container.name, required])
        }

        has_limit(container, resource) {
          container.resources.limits[resource]
        }

        has_request(container, resource) {
          container.resources.requests[resource]
        }
```

## Template: Restrict Host Network and Ports

Prevent pods from using host networking and restrict host ports.

```yaml
# infrastructure/gatekeeper/templates/networking/restrict-host-network.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srestricthostnetwork
  annotations:
    description: "Restricts the use of host networking and host ports"
    metadata.gatekeeper.sh/title: "Restrict Host Network"
    metadata.gatekeeper.sh/version: "1.0.0"
spec:
  crd:
    spec:
      names:
        kind: K8sRestrictHostNetwork
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowHostNetwork:
              type: boolean
              description: "Whether to allow hostNetwork"
            allowedHostPorts:
              type: array
              items:
                type: object
                properties:
                  min:
                    type: integer
                  max:
                    type: integer
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srestricthostnetwork

        # Block host networking
        violation[{"msg": msg}] {
          not input.parameters.allowHostNetwork
          input.review.object.spec.hostNetwork == true
          msg := "Pods are not allowed to use host networking"
        }

        # Check host ports against allowed ranges
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          port := container.ports[_]
          port.hostPort > 0
          not port_in_allowed_range(port.hostPort)
          msg := sprintf("Container <%v> uses hostPort <%v> which is not in the allowed range", [container.name, port.hostPort])
        }

        port_in_allowed_range(port) {
          range := input.parameters.allowedHostPorts[_]
          port >= range.min
          port <= range.max
        }
```

## Creating Constraints for Different Environments

Apply different enforcement levels per environment.

```yaml
# infrastructure/gatekeeper/constraints/production/security-constraints.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sDisallowPrivileged
metadata:
  name: disallow-privileged-prod
spec:
  # Enforce strictly in production
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
    namespaces:
      - "production"
      - "production-*"
    excludedNamespaces:
      - kube-system
  parameters:
    exemptContainers:
      # Exempt only the Istio sidecar proxy
      - "istio-proxy"
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireNonRoot
metadata:
  name: require-non-root-prod
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
    namespaces:
      - "production"
      - "production-*"
  parameters:
    exemptContainers:
      - "istio-proxy"
    minRunAsUser: 1000
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireResourceLimits
metadata:
  name: require-resource-limits-prod
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
    namespaces:
      - "production"
      - "production-*"
  parameters:
    requiredResources:
      - "cpu"
      - "memory"
```

```yaml
# infrastructure/gatekeeper/constraints/staging/security-constraints.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sDisallowPrivileged
metadata:
  name: disallow-privileged-staging
spec:
  # Warn only in staging
  enforcementAction: warn
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet", "DaemonSet"]
    namespaces:
      - "staging"
      - "staging-*"
  parameters:
    exemptContainers:
      - "istio-proxy"
```

## Flux Kustomizations for Policy Lifecycle

Manage templates and constraints with separate Flux Kustomizations.

```yaml
# clusters/my-cluster/policies/kustomizations.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-templates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gatekeeper/templates
  prune: true
  wait: true
  timeout: 5m
  dependsOn:
    - name: gatekeeper
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-constraints-prod
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gatekeeper/constraints/production
  prune: true
  wait: true
  timeout: 5m
  dependsOn:
    - name: gatekeeper-templates
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: gatekeeper-constraints-staging
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/gatekeeper/constraints/staging
  prune: true
  wait: true
  timeout: 5m
  dependsOn:
    - name: gatekeeper-templates
```

## Auditing and Monitoring Constraints

Monitor policy compliance across the cluster.

```bash
# List all constraint templates
kubectl get constrainttemplates

# List all active constraints with violation counts
kubectl get constraints -o wide

# Get detailed violations for a specific constraint
kubectl get k8sdisallowprivileged disallow-privileged-prod -o json | \
  jq '.status.violations'

# Check the total number of violations across all constraints
kubectl get constraints -o json | \
  jq '[.items[].status.totalViolations] | add'

# View Flux reconciliation status for policies
flux get kustomizations | grep gatekeeper

# Force reconciliation of templates
flux reconcile kustomization gatekeeper-templates --with-source
```

## Summary

Managing Gatekeeper ConstraintTemplates with Flux CD creates a scalable policy-as-code workflow. By organizing templates into categories (security, networking, general), applying environment-specific constraints, and using Flux Kustomization dependencies to ensure proper deployment order, you build a robust policy library that can be shared across teams and clusters. The key practices include starting with dryrun enforcement, using exemptions judiciously, and monitoring violation counts to track compliance over time.
