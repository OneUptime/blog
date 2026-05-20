# How to Enforce Image Pull Policies with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Container Security, Policy Enforcement

Description: Learn how to enforce container image pull policies across your Kubernetes clusters using ArgoCD with admission controllers and GitOps workflows.

---

Container image pull policies might seem like a small detail, but they have a significant impact on security and reliability. Kubernetes defaults to `IfNotPresent` for images with an explicit non-`latest` tag, which can silently serve stale images, while `Always` adds registry dependency and a manifest lookup on container start. When you manage deployments through ArgoCD, you need a systematic approach to enforce the right pull policy across all your applications.

This guide covers how to enforce image pull policies consistently across your ArgoCD-managed clusters using a combination of GitOps practices, admission controllers, and ArgoCD features.

## Why Image Pull Policies Matter

Consider this scenario: your team pushes a new image tagged `v1.2.3` to your registry. A developer discovers a critical bug, builds a fix, and pushes it with the same tag. With `imagePullPolicy: IfNotPresent`, nodes that already have the old `v1.2.3` image cached will continue running the buggy version while new nodes pull the fixed version. You now have inconsistent behavior across your cluster with no obvious explanation.

The three Kubernetes pull policies each have trade-offs:

- `Always` - Safest but adds registry dependency and latency
- `IfNotPresent` - Faster but risks serving stale images
- `Never` - Only uses pre-pulled images, useful for air-gapped environments

For production environments, `Always` combined with immutable image tags is the recommended approach.

## Enforcing Pull Policies with Kyverno

The simplest way to enforce image pull policies is through a Kyverno mutation policy managed by ArgoCD.

```yaml
# enforce-image-pull-policy.yaml

apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: enforce-image-pull-policy
  annotations:
    policies.kyverno.io/title: Enforce Image Pull Policy
    policies.kyverno.io/category: Security
    policies.kyverno.io/severity: high
spec:
  rules:
    # Mutate: Set pull policy to Always for all containers
    - name: set-image-pull-policy
      match:
        any:
          - resources:
              kinds:
                - Pod
      mutate:
        patchStrategicMerge:
          spec:
            containers:
              - (name): "*"
                imagePullPolicy: Always
            initContainers:
              - (name): "*"
                imagePullPolicy: Always
    # Validate: Deny the 'latest' tag
    - name: deny-latest-tag
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
        message: "Using the 'latest' tag is not allowed. Use a specific version tag."
        foreach:
          - list: "request.object.spec.containers"
            pattern:
              image: "!*:latest"
          - list: "request.object.spec.initContainers"
            pattern:
              image: "!*:latest"
```

## Enforcing with OPA Gatekeeper

If you are using OPA Gatekeeper instead, here is the equivalent constraint template.

```yaml
# template-image-pull-policy.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8simagepullpolicy
spec:
  crd:
    spec:
      names:
        kind: K8sImagePullPolicy
      validation:
        openAPIV3Schema:
          type: object
          properties:
            allowedPolicies:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8simagepullpolicy

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not valid_pull_policy(container)
          msg := sprintf(
            "Container '%v' has imagePullPolicy '%v'. Allowed policies: %v",
            [container.name, container.imagePullPolicy, input.parameters.allowedPolicies]
          )
        }

        valid_pull_policy(container) {
          input.parameters.allowedPolicies[_] == container.imagePullPolicy
        }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sImagePullPolicy
metadata:
  name: require-always-pull
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
    excludedNamespaces:
      - kube-system
      - argocd
  parameters:
    allowedPolicies:
      - Always
```

## Enforcing Image Digest References

Tags are mutable - someone can push a different image under the same tag. For maximum security, enforce image digests instead of tags.

```yaml
# require-image-digest.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  rules:
    - name: check-digest
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        failureAction: Enforce
        message: "Images must use digest references (@sha256:...) in production."
        foreach:
          - list: "request.object.spec.containers"
            pattern:
              image: "*@sha256:*"
          - list: "request.object.spec.initContainers"
            pattern:
              image: "*@sha256:*"
```

When using this approach with ArgoCD, you will want to use the ArgoCD Image Updater to automatically update digests in your Git repository. See our guide on [implementing Image Updater in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-image-updater-argocd/view) for details.

## ArgoCD Application-Level Enforcement

ArgoCD projects do not inspect container image registries or image pull policies directly. You can still use AppProject boundaries to restrict which Git repositories, destinations, and Kubernetes resource kinds are allowed, then rely on Kyverno or Gatekeeper for the image-specific enforcement.

```yaml
# argocd-project.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production project with strict image policies
  sourceRepos:
    - https://github.com/myorg/*
  destinations:
    - namespace: "prod-*"
      server: https://kubernetes.default.svc
  # Allow only the resource kinds this project should manage
  clusterResourceWhitelist:
    - group: ""
      kind: Namespace
  namespaceResourceWhitelist:
    - group: apps
      kind: Deployment
    - group: ""
      kind: Service
    - group: ""
      kind: ConfigMap
```

## Combining with Image Signature Verification

For high-security environments, enforce image signatures using Kyverno's image verification feature.

```yaml
# verify-image-signatures.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "registry.myorg.com/*"
          attestors:
            - count: 1
              entries:
                - keys:
                    publicKeys: |
                      -----BEGIN PUBLIC KEY-----
                      MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
                      -----END PUBLIC KEY-----
```

This ensures that only images signed by your CI pipeline can be deployed through ArgoCD.

## Handling ArgoCD Image Pull Secrets

When enforcing `Always` pull policy, your nodes need valid credentials to pull images. A Kyverno generate policy, stored in Git and synced by ArgoCD, can copy image pull secrets across namespaces.

```yaml
# image-pull-secret-generator.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: sync-registry-credentials
spec:
  rules:
    - name: copy-registry-secret
      match:
        any:
          - resources:
              kinds:
                - Namespace
      generate:
        synchronize: true
        apiVersion: v1
        kind: Secret
        name: registry-credentials
        namespace: "{{request.object.metadata.name}}"
        clone:
          namespace: default
          name: registry-credentials
```

This Kyverno generate policy copies your registry credentials to every new namespace, helping prevent `Always` pull policy failures due to missing credentials.

## Monitoring Policy Readiness

Create an ArgoCD custom health check that monitors whether Kyverno reports your policy as ready.

```yaml
# In argocd-cm ConfigMap
data:
  resource.customizations.health.kyverno.io_ClusterPolicy: |
    hs = {}
    if obj.status ~= nil and obj.status.ready then
      hs.status = "Healthy"
      hs.message = "Policy is ready and enforcing"
    else
      hs.status = "Degraded"
      hs.message = "Policy is not ready"
    end
    return hs
```

## Conclusion

Enforcing image pull policies through ArgoCD is about building layers of protection. Start with basic pull policy enforcement using Kyverno or Gatekeeper, add tag restrictions to eliminate mutable references, graduate to digest-based references for immutability, and finally add image signature verification for supply chain security. Each layer is managed through GitOps, making your security posture auditable, reproducible, and version-controlled.
