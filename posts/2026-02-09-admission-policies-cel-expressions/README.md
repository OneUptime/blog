# How to Configure Kubernetes Admission Policies with CEL Expressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, CEL

Description: Learn how to use Common Expression Language (CEL) in Kubernetes ValidatingAdmissionPolicy to create flexible, code-free admission control policies for enhanced security.

---

Common Expression Language (CEL) brings powerful, declarative policy validation to Kubernetes without requiring custom webhook development. Introduced as a beta feature in Kubernetes 1.26, CEL-based admission policies allow you to define complex validation rules directly in YAML manifests, making policy management more accessible and maintainable.

This guide explores how to leverage CEL expressions for admission control, from basic field validation to complex security policies.

## Understanding CEL in Kubernetes

CEL is a non-Turing complete expression language designed for safe evaluation in security-sensitive environments. In Kubernetes, CEL expressions evaluate against incoming API requests and can accept or reject them based on validation logic.

Key advantages of CEL-based policies include:

- No need to write and maintain webhook servers
- Faster evaluation than external webhooks
- Built-in type safety and validation
- Declarative configuration that's easy to audit

## Prerequisites

Ensure you have:

- Kubernetes 1.26 or later with ValidatingAdmissionPolicy feature enabled
- kubectl with cluster admin access
- Basic understanding of Kubernetes API objects
- Familiarity with expression languages (helpful but not required)

For Kubernetes 1.26-1.27, enable the feature gate:

```yaml
# In kube-apiserver configuration
--feature-gates=ValidatingAdmissionPolicy=true
```

In Kubernetes 1.28+, this feature is enabled by default.

## Creating Your First CEL Admission Policy

Let's start with a simple policy that requires all pods to have resource limits defined:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-resource-limits
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: "object.spec.containers.all(c, has(c.resources) && has(c.resources.limits))"
    message: "All containers must define resource limits"
```

This policy uses the CEL expression to check that every container has resource limits defined. The `all()` function iterates over containers, and `has()` checks for field existence.

Bind the policy to apply it cluster-wide:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-resource-limits-binding
spec:
  policyName: require-resource-limits
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: production
```

This binding applies the policy only to namespaces labeled with `environment: production`.

## Working with CEL Variables

CEL policies have access to several built-in variables:

- `object`: The incoming object being created or updated
- `oldObject`: The existing object (for UPDATE operations)
- `request`: The admission request object containing user info, operation, etc.
- `params`: Parameters passed from the binding (covered later)

Here's a policy that uses multiple variables:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: prevent-image-tag-changes
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["UPDATE"]
      resources: ["deployments"]
  validations:
  - expression: |
      object.spec.template.spec.containers.all(newC,
        oldObject.spec.template.spec.containers.exists(oldC,
          oldC.name == newC.name && oldC.image == newC.image
        )
      )
    message: "Container image tags cannot be modified. Create a new deployment instead."
```

This policy prevents updating container images in deployments, enforcing immutable deployments.

## Parameterized Policies

Parameterized policies allow you to configure policy behavior through separate parameter resources:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: allowed-registries
  namespace: default
data:
  registries: |
    - "registry.example.com"
    - "gcr.io/my-project"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: restrict-image-registries
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  paramKind:
    apiVersion: v1
    kind: ConfigMap
  validations:
  - expression: |
      object.spec.containers.all(c,
        params.data.registries.split('\n').exists(r,
          c.image.startsWith(r.trim())
        )
      )
    message: "Container images must come from approved registries"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: restrict-image-registries-binding
spec:
  policyName: restrict-image-registries
  validationActions: ["Deny"]
  paramRef:
    name: allowed-registries
    namespace: default
```

This setup allows you to update allowed registries by modifying the ConfigMap without changing the policy itself.

## Advanced CEL Expressions

CEL supports complex logic including conditionals, string manipulation, and collection operations.

**Requiring labels based on namespace:**

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-labels-in-production
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE"]
      resources: ["deployments"]
  validations:
  - expression: |
      request.namespace.startsWith('prod-') ?
        has(object.metadata.labels.owner) &&
        has(object.metadata.labels.cost-center) :
        true
    message: "Deployments in production namespaces must have 'owner' and 'cost-center' labels"
```

**Enforcing naming conventions:**

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: enforce-naming-convention
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE"]
      resources: ["services"]
  validations:
  - expression: |
      object.metadata.name.matches('^[a-z][a-z0-9-]*[a-z0-9]$') &&
      object.metadata.name.size() <= 63
    message: "Service names must be lowercase alphanumeric with hyphens, starting with a letter"
```

**Validating resource ratios:**

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: validate-resource-ratios
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
        has(c.resources.requests.memory) &&
        has(c.resources.limits.memory) &&
        int(c.resources.limits.memory.replace('Mi', '').replace('Gi', '000')) <=
        int(c.resources.requests.memory.replace('Mi', '').replace('Gi', '000')) * 2
      )
    message: "Memory limits must not exceed 2x memory requests"
```

## Security Policies with CEL

CEL is particularly useful for enforcing security best practices:

**Block privileged containers:**

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: block-privileged-containers
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
        !has(c.securityContext.privileged) ||
        c.securityContext.privileged == false
      )
    message: "Privileged containers are not allowed"
  - expression: |
      !has(object.spec.hostNetwork) || object.spec.hostNetwork == false
    message: "Host network access is not allowed"
  - expression: |
      !has(object.spec.hostPID) || object.spec.hostPID == false
    message: "Host PID namespace access is not allowed"
```

**Enforce non-root users:**

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-non-root
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
        has(c.securityContext.runAsNonRoot) &&
        c.securityContext.runAsNonRoot == true
      )
    message: "Containers must run as non-root users"
```

## Audit Mode and Testing

Before enforcing policies, test them in audit mode:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: test-policy-binding
spec:
  policyName: require-resource-limits
  validationActions: ["Audit"]  # Only log violations, don't deny
```

Check audit logs to see what would have been blocked:

```bash
kubectl logs -n kube-system kube-apiserver-<node> | grep ValidatingAdmissionPolicy
```

## Handling Multiple Validations

You can define multiple validation rules within a single policy:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: comprehensive-pod-security
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: "object.spec.containers.all(c, has(c.resources.limits))"
    message: "All containers must have resource limits"
  - expression: "!has(object.spec.hostNetwork) || !object.spec.hostNetwork"
    message: "Host network is not allowed"
  - expression: "object.spec.containers.all(c, !c.image.endsWith(':latest'))"
    message: "Image tag 'latest' is not allowed"
  - expression: |
      object.spec.containers.all(c,
        has(c.securityContext.readOnlyRootFilesystem) &&
        c.securityContext.readOnlyRootFilesystem == true
      )
    message: "Containers must use read-only root filesystem"
```

Each validation is evaluated independently, and violations are reported separately.

## Performance Considerations

CEL policies are evaluated in-process by the API server, making them faster than webhook-based admission control. However, complex expressions can impact performance:

- Keep expressions concise and avoid nested loops where possible
- Use early termination with logical operators (`&&`, `||`)
- Cache results when evaluating the same expression multiple times
- Monitor API server latency after deploying new policies

## Conclusion

CEL-based admission policies provide a powerful, declarative approach to Kubernetes policy enforcement without the operational overhead of managing webhook servers. They're ideal for common validation scenarios like resource requirements, naming conventions, and security policies.

Start with simple policies in audit mode, validate their behavior in non-production environments, and gradually expand your policy coverage as teams become familiar with the validation requirements. Combined with proper monitoring through OneUptime, CEL policies become a foundational element of your Kubernetes governance strategy.
