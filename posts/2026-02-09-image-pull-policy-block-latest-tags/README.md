# How to Implement Image Pull Policy Restrictions to Block Latest Tags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Container Image

Description: Learn how to enforce image pull policies and block the use of latest tags in Kubernetes to ensure reproducible deployments and prevent security vulnerabilities from untested images.

---

Using the `latest` tag for container images in production is a dangerous practice that leads to unpredictable deployments, difficult rollbacks, and potential security issues. When an image with the `latest` tag is updated, you can't guarantee which version of your application will run, making debugging nearly impossible and exposing your cluster to untested changes.

This guide demonstrates how to enforce policies that block latest tags and require specific image versions in Kubernetes.

## Why Latest Tags Are Problematic

The `latest` tag creates several issues:

- **Non-reproducible deployments**: Different nodes may pull different versions
- **Difficult rollbacks**: Can't easily return to a known-good state
- **Security risks**: Untested images may contain vulnerabilities
- **Compliance failures**: Auditors can't verify which code version ran
- **Debugging challenges**: Logs don't clearly indicate which version caused issues

## Prerequisites

Ensure you have:

- Kubernetes cluster (1.30+ for stable ValidatingAdmissionPolicy)
- kubectl with cluster admin access
- Alternative policy engine (Kyverno, OPA) if using older Kubernetes

## Blocking Latest Tags with ValidatingAdmissionPolicy

Create policies that reject pods and workload controllers using `latest` tags:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: block-latest-tag-pods
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  variables:
  - name: taggedImagePattern
    expression: "'^[^@]+:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}(@[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[0-9a-fA-F]{32,})?$'"
  validations:
  - expression: |
      object.spec.containers.all(c,
        !c.image.matches('^.*:latest(@.*)?$') &&
        c.image.matches(variables.taggedImagePattern)
      )
    message: "Container images must not use ':latest' tag and must specify explicit version tags"

  - expression: |
      !has(object.spec.initContainers) ||
      object.spec.initContainers.all(c,
        !c.image.matches('^.*:latest(@.*)?$') &&
        c.image.matches(variables.taggedImagePattern)
      )
    message: "Init container images must not use ':latest' tag and must specify explicit version tags"

  - expression: |
      !has(object.spec.ephemeralContainers) ||
      object.spec.ephemeralContainers.all(c,
        !c.image.matches('^.*:latest(@.*)?$') &&
        c.image.matches(variables.taggedImagePattern)
      )
    message: "Ephemeral container images must not use ':latest' tag and must specify explicit version tags"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: block-latest-tag-workloads
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments", "statefulsets", "daemonsets", "replicasets"]
  variables:
  - name: taggedImagePattern
    expression: "'^[^@]+:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}(@[A-Za-z][A-Za-z0-9]*(?:[+._-][A-Za-z][A-Za-z0-9]*)*:[0-9a-fA-F]{32,})?$'"
  validations:
  - expression: |
      object.spec.template.spec.containers.all(c,
        !c.image.matches('^.*:latest(@.*)?$') &&
        c.image.matches(variables.taggedImagePattern)
      )
    message: "Container images must not use ':latest' tag and must specify explicit version tags"

  - expression: |
      !has(object.spec.template.spec.initContainers) ||
      object.spec.template.spec.initContainers.all(c,
        !c.image.matches('^.*:latest(@.*)?$') &&
        c.image.matches(variables.taggedImagePattern)
      )
    message: "Init container images must not use ':latest' tag and must specify explicit version tags"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: block-latest-tag-pods-binding
spec:
  policyName: block-latest-tag-pods
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchExpressions:
      - key: environment
        operator: In
        values: ["production", "staging"]
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: block-latest-tag-workloads-binding
spec:
  policyName: block-latest-tag-workloads
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchExpressions:
      - key: environment
        operator: In
        values: ["production", "staging"]
```

These policies ensure all containers specify explicit version tags in production and staging environments.

Test the policy:

```bash
# Run these in a namespace labeled environment=production or environment=staging

# This should be rejected

kubectl run test --image=nginx:latest
# Error: ValidatingAdmissionPolicy 'block-latest-tag-pods' denied request

# This should succeed
kubectl run test --image=nginx:1.25.3
```

## Enforcing Semantic Versioning

Create a more sophisticated policy that requires proper semantic versioning:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-semver-tags
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments"]
  validations:
  - expression: |
      object.spec.template.spec.containers.all(c,
        c.image.matches('^[^@]+:v?[0-9]+\\.[0-9]+\\.[0-9]+(-[0-9A-Za-z.-]+)?(\\+[0-9A-Za-z.-]+)?$')
      )
    message: |
      Container images must use semantic versioning (e.g., v1.2.3 or 1.2.3).
      Tags like 'latest', 'dev', 'staging' are not allowed.
```

This enforces tags in the format: `1.2.3`, `v1.2.3`, or `1.2.3-alpha`.

## Blocking Mutable Tags

Some registries allow overwriting tags. Block commonly mutable patterns:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: block-mutable-tags
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: |
      object.spec.containers.all(c,
        !c.image.matches('^.*:(latest|dev|develop|master|main|staging|prod|production)(@.*)?$')
      )
    message: |
      Mutable image tags are not allowed. Use immutable tags like git commit SHAs or semantic versions.
      Blocked tags: latest, dev, develop, master, main, staging, prod, production
```

## Requiring Image Digests

For maximum immutability, require images to specify digests:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-image-digest
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments", "statefulsets"]
  validations:
  - expression: |
      object.spec.template.spec.containers.all(c,
        c.image.contains('@sha256:')
      )
    message: "Container images must specify digest (image@sha256:...)"
```

Deploy with digests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: app
        image: myregistry.azurecr.io/myapp@sha256:8f2a9b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8
```

## Image Pull Policy Enforcement

Ensure `imagePullPolicy` is set correctly:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: enforce-pull-policy
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: |
      object.spec.containers.all(c,
        !has(c.imagePullPolicy) ||
        c.imagePullPolicy == 'Always' ||
        c.imagePullPolicy == 'IfNotPresent'
      )
    message: "imagePullPolicy must be 'Always' or 'IfNotPresent', never 'Never'"

  - expression: |
      object.spec.containers.all(c,
        c.image.endsWith(':latest') ?
          (!has(c.imagePullPolicy) || c.imagePullPolicy == 'Always') :
          true
      )
    message: "Images with ':latest' tag must use imagePullPolicy: Always"
```

## Using Kyverno for Advanced Rules

If you're using Kyverno, create more flexible policies:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
spec:
  background: true
  rules:
  - name: require-image-tag
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      failureAction: Enforce
      message: "An image tag is required"
      foreach:
      - list: "request.object.spec.containers"
        pattern:
          image: "*:*"
      - list: "request.object.spec.initContainers"
        pattern:
          image: "*:*"
      - list: "request.object.spec.ephemeralContainers"
        pattern:
          image: "*:*"
  - name: disallow-latest-tag
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      failureAction: Enforce
      message: "Using 'latest' tag is not allowed"
      foreach:
      - list: "request.object.spec.containers"
        pattern:
          image: "!*:latest"
      - list: "request.object.spec.initContainers"
        pattern:
          image: "!*:latest"
      - list: "request.object.spec.ephemeralContainers"
        pattern:
          image: "!*:latest"
  - name: require-approved-registries
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      failureAction: Enforce
      message: "Images must come from approved registries"
      foreach:
      - list: "request.object.spec.containers"
        anyPattern:
        - image: "myregistry.azurecr.io/*:*"
        - image: "gcr.io/myproject/*:*"
```

## Registry-Level Controls

Combine Kubernetes policies with registry controls. For Harbor, configure project-level tag immutability rules:

```yaml
# Harbor tag immutability rule settings
repositories: "matching **"
tags: "matching **"
```

Harbor project configuration can also prevent pulling images with vulnerabilities at or above a selected severity and automatically scan images on push.

For Docker Registry (using Notary):

```bash
# Require signed images
export DOCKER_CONTENT_TRUST=1
export DOCKER_CONTENT_TRUST_SERVER=https://notary.example.com

# Push signed image
docker trust sign myregistry.azurecr.io/myapp:v1.2.3
```

## CI/CD Integration

Prevent latest tags in CI/CD pipelines:

```yaml
# GitLab CI
docker-build:
  script:
    - export IMAGE_TAG="${CI_COMMIT_TAG:-$CI_COMMIT_SHORT_SHA}"
    - |
      if [ "$IMAGE_TAG" == "latest" ]; then
        echo "Error: Cannot use 'latest' tag"
        exit 1
      fi
    - docker build -t myregistry.azurecr.io/myapp:$IMAGE_TAG .
    - docker push myregistry.azurecr.io/myapp:$IMAGE_TAG
```

## Monitoring Policy Violations

Track attempts to use latest tags:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: policy-violations-dashboard
data:
  queries.json: |
    {
      "latest_tag_attempts": {
        "query": "kube_audit_event{verb='CREATE',objectRef_resource='pods',responseStatus_code='403'} | json | select(message contains 'latest')",
        "description": "Count of blocked deployments using latest tag"
      }
    }
```

## Gradual Rollout Strategy

Roll out policies gradually to avoid breaking existing workloads:

```yaml
# Phase 1: Audit mode (warn but allow)
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: block-latest-audit
spec:
  policyName: block-latest-tag-pods
  validationActions: ["Audit", "Warn"]
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: production

# Phase 2: After 30 days, switch to enforcement
# Update validationActions to ["Deny"]
```

## Exception Handling

Allow exceptions for specific cases:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: block-latest-with-exceptions
spec:
  policyName: block-latest-tag-pods
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchExpressions:
      - key: allow-latest-tag
        operator: DoesNotExist
    objectSelector:
      matchExpressions:
      - key: allow-latest-tag
        operator: DoesNotExist
```

Label pods that need exceptions:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: debug-pod
  labels:
    allow-latest-tag: "true"
  annotations:
    justification: "Temporary debug pod, expires 2026-02-10"
spec:
  containers:
  - name: debug
    image: busybox:latest
```

## Conclusion

Blocking latest tags and enforcing explicit versioning is critical for maintaining reproducible, secure, and auditable Kubernetes deployments. By implementing admission policies that require semantic versioning or image digests, you eliminate a major source of deployment unpredictability and security risk.

Start with audit mode to identify workloads using latest tags, work with teams to migrate to explicit versions, and gradually enforce policies across environments. Monitor policy effectiveness with OneUptime to ensure compliance and track any attempts to bypass image versioning requirements.
