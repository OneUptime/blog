# How to Create Custom Validation Rules for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Validation, OPA, Rego, Policy Enforcement, Kubernetes

Description: Build custom validation rules for Istio configurations using OPA Gatekeeper and Conftest to enforce organizational standards and prevent misconfigurations.

---

The built-in `istioctl validate` command catches syntax errors and schema violations, but it does not know about your team's specific requirements. Maybe you need all VirtualServices to have timeouts. Maybe you want to prevent anyone from creating a Gateway that accepts all hosts with `*`. Maybe retry counts should never exceed a certain threshold.

Custom validation rules let you encode these requirements as code, and enforce them automatically. There are two main approaches: OPA Conftest for CI-time validation, and OPA Gatekeeper for runtime enforcement in the cluster. Here is how to use both.

## Writing Rego Policies for Istio

Rego is the policy language used by Open Policy Agent (OPA). If you have not written Rego before, the syntax feels a bit unusual, but it is quite powerful once you get used to it.

A basic Rego policy for Istio follows this pattern:

```rego
package main

deny[msg] {
    # Match a specific resource kind
    input.kind == "VirtualService"

    # Check a condition
    some_condition_is_true

    # Return an error message
    msg := "Description of what went wrong"
}
```

The `deny` rule produces a set of error messages. If the set is empty, the resource passes validation. If it has any entries, validation fails.

## Common VirtualService Validations

Here are practical validation rules that address real problems teams run into.

### Require Timeouts on HTTP Routes

```rego
package main

deny[msg] {
    input.kind == "VirtualService"
    route := input.spec.http[i]
    not route.timeout
    msg := sprintf("VirtualService '%s': HTTP route %d must define a timeout", [input.metadata.name, i])
}
```

### Cap Retry Attempts

```rego
package main

deny[msg] {
    input.kind == "VirtualService"
    route := input.spec.http[_]
    route.retries.attempts > 3
    msg := sprintf("VirtualService '%s': retry attempts should not exceed 3 to avoid cascading failures", [input.metadata.name])
}
```

### Require Fault Injection Only in Non-Production Namespaces

```rego
package main

deny[msg] {
    input.kind == "VirtualService"
    input.metadata.namespace == "production"
    route := input.spec.http[_]
    route.fault
    msg := sprintf("VirtualService '%s': fault injection is not allowed in the production namespace", [input.metadata.name])
}
```

### Prevent Wildcard Hosts

```rego
package main

deny[msg] {
    input.kind == "VirtualService"
    host := input.spec.hosts[_]
    host == "*"
    msg := sprintf("VirtualService '%s': wildcard host '*' is not permitted", [input.metadata.name])
}
```

## DestinationRule Validations

### Require Connection Pool Settings

```rego
package main

deny[msg] {
    input.kind == "DestinationRule"
    not input.spec.trafficPolicy.connectionPool
    msg := sprintf("DestinationRule '%s': must define connectionPool settings in trafficPolicy", [input.metadata.name])
}
```

### Enforce Outlier Detection

```rego
package main

deny[msg] {
    input.kind == "DestinationRule"
    not input.spec.trafficPolicy.outlierDetection
    msg := sprintf("DestinationRule '%s': must define outlierDetection for circuit breaking", [input.metadata.name])
}
```

### Require mTLS Mode

```rego
package main

deny[msg] {
    input.kind == "DestinationRule"
    tls := input.spec.trafficPolicy.tls
    tls.mode != "ISTIO_MUTUAL"
    msg := sprintf("DestinationRule '%s': TLS mode must be ISTIO_MUTUAL, got '%s'", [input.metadata.name, tls.mode])
}
```

## Gateway Validations

### Prevent Catch-All Gateways

```rego
package main

deny[msg] {
    input.kind == "Gateway"
    server := input.spec.servers[_]
    host := server.hosts[_]
    host == "*"
    msg := sprintf("Gateway '%s': wildcard host '*' is not allowed. Specify explicit hosts.", [input.metadata.name])
}
```

### Require TLS on All Gateways

```rego
package main

deny[msg] {
    input.kind == "Gateway"
    server := input.spec.servers[_]
    server.port.protocol == "HTTP"
    not server.tls
    msg := sprintf("Gateway '%s': all servers must use TLS. Plain HTTP is not allowed.", [input.metadata.name])
}
```

## Running Policies with Conftest

Conftest is the CLI tool for testing structured data against Rego policies. Install it and organize your policies:

```text
policies/
  istio/
    virtualservice.rego
    destinationrule.rego
    gateway.rego
```

Run the checks:

```bash
conftest test -p policies/istio/ k8s/istio/virtual-service.yaml
```

Output for a failing resource:

```text
FAIL - k8s/istio/virtual-service.yaml - main - VirtualService 'my-service': HTTP route 0 must define a timeout
```

You can also test multiple files:

```bash
find k8s/istio -name '*.yaml' | xargs conftest test -p policies/istio/
```

## Enforcing at Runtime with OPA Gatekeeper

Conftest catches issues in CI, but someone could still `kubectl apply` a bad config directly. OPA Gatekeeper enforces policies inside the cluster using admission webhooks.

First, install Gatekeeper:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.14.0/deploy/gatekeeper.yaml
```

Then create a ConstraintTemplate. This defines the policy logic:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istioreqtimeout
spec:
  crd:
    spec:
      names:
        kind: IstioReqTimeout
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package istioreqtimeout

        violation[{"msg": msg}] {
            input.review.object.kind == "VirtualService"
            route := input.review.object.spec.http[i]
            not route.timeout
            msg := sprintf("VirtualService '%s': HTTP route %d must define a timeout", [input.review.object.metadata.name, i])
        }
```

Then create a Constraint that activates the template:

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioReqTimeout
metadata:
  name: require-vs-timeout
spec:
  match:
    kinds:
      - apiGroups: ["networking.istio.io"]
        kinds: ["VirtualService"]
```

Now, any attempt to create or update a VirtualService without timeouts will be rejected by the Kubernetes API server.

## Testing Your Policies

Write test cases for your Rego policies. Conftest supports this natively:

```rego
# policies/istio/virtualservice_test.rego
package main

test_deny_missing_timeout {
    result := deny with input as {
        "kind": "VirtualService",
        "metadata": {"name": "test-vs"},
        "spec": {
            "hosts": ["my-service"],
            "http": [{"route": [{"destination": {"host": "my-service"}}]}]
        }
    }
    count(result) > 0
}

test_allow_with_timeout {
    result := deny with input as {
        "kind": "VirtualService",
        "metadata": {"name": "test-vs"},
        "spec": {
            "hosts": ["my-service"],
            "http": [{"timeout": "5s", "route": [{"destination": {"host": "my-service"}}]}]
        }
    }
    count(result) == 0
}
```

Run tests with:

```bash
conftest verify -p policies/istio/
```

## Organizing Policies at Scale

As your policy library grows, organize it by resource type and concern:

```text
policies/
  istio/
    virtualservice/
      timeouts.rego
      retries.rego
      routing.rego
    destinationrule/
      connection-pool.rego
      outlier-detection.rego
      tls.rego
    gateway/
      tls.rego
      hosts.rego
    shared/
      naming.rego
      labels.rego
```

Use a shared package for cross-cutting concerns like naming conventions or required labels.

Custom validation rules are the bridge between "the config is syntactically correct" and "the config follows our best practices." Start with the most common mistakes your team makes, encode those as Rego policies, and gradually expand coverage. Between Conftest in CI and Gatekeeper in the cluster, you get a solid defense-in-depth approach to Istio configuration quality.
