# How to Build OPA Rego Policy Unit Tests for Kubernetes Admission Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OPA, Rego, Policy Testing, Admission Control

Description: Learn how to write unit tests for OPA Rego policies that enforce Kubernetes admission control rules, ensuring policies work correctly before deployment.

---

OPA Rego policies enforce admission control rules in Kubernetes, but incorrect policies can block legitimate workloads or fail to catch violations. Unit testing Rego policies validates logic before deployment, preventing policy errors from impacting production.

In this guide, we'll write comprehensive unit tests for Rego policies using OPA's testing framework, test admission scenarios, and integrate policy testing into CI/CD pipelines.

## Creating Rego Policy

```rego
# policy.rego
package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Pod"
  not input.request.object.spec.securityContext.runAsNonRoot
  msg := "Pods must run as non-root"
}

deny[msg] {
  input.request.kind.kind == "Pod"
  container := input.request.object.spec.containers[_]
  not container.resources.limits
  msg := sprintf("Container %v must have resource limits", [container.name])
}
```

## Writing Unit Tests

```rego
# policy_test.rego
package kubernetes.admission

test_pod_without_security_context {
  deny["Pods must run as non-root"] with input as {
    "request": {
      "kind": {"kind": "Pod"},
      "object": {"spec": {"containers": []}}
    }
  }
}

test_pod_with_security_context {
  not deny[_] with input as {
    "request": {
      "kind": {"kind": "Pod"},
      "object": {
        "spec": {
          "securityContext": {"runAsNonRoot": true},
          "containers": [{
            "name": "app",
            "resources": {"limits": {"cpu": "100m"}}
          }]
        }
      }
    }
  }
}
```

## Running Tests

```bash
# Run all tests
opa test . -v

# Run specific test file
opa test policy_test.rego

# Generate coverage report
opa test . --coverage
```

## Conclusion

Unit testing OPA Rego policies ensures admission control rules work correctly before deployment. Comprehensive test coverage catches policy errors early while CI/CD integration maintains policy quality as requirements evolve.

Test-driven policy development builds confidence in admission control enforcement and prevents policy bugs from blocking legitimate workloads or missing violations.
