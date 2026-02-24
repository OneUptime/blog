# How to Set Up Istio Policy Guardrails for Developers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Policy, OPA, Gatekeeper, Kubernetes, Security

Description: How to implement policy guardrails that prevent Istio misconfigurations and enforce organizational standards using OPA Gatekeeper and admission webhooks.

---

Giving developers access to Istio configuration is great for velocity, but it comes with risk. A misconfigured VirtualService can route all traffic to a non-existent service. An overly permissive AuthorizationPolicy can expose internal APIs to the internet. Policy guardrails prevent these mistakes by validating configurations before they reach the cluster.

## Why Guardrails Instead of Gatekeeping

The old model was having a platform team review every configuration change. This creates bottlenecks and slows everyone down. Guardrails flip the model: developers submit configurations freely, and automated policies catch problems instantly. Good guardrails are fast, specific, and provide clear error messages that tell developers exactly how to fix the issue.

## Using OPA Gatekeeper for Istio Policies

OPA Gatekeeper is the most popular policy engine for Kubernetes. It lets you define constraints that are enforced by an admission webhook. Install Gatekeeper:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.14.0/deploy/gatekeeper.yaml
```

## Policy: Require Timeouts on VirtualServices

Every VirtualService should have an explicit timeout to prevent indefinite hangs:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istiorequiretimeout
spec:
  crd:
    spec:
      names:
        kind: IstioRequireTimeout
      validation:
        openAPIV3Schema:
          type: object
          properties:
            maxTimeout:
              type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package istiorequiretimeout

      violation[{"msg": msg}] {
        input.review.object.kind == "VirtualService"
        route := input.review.object.spec.http[_]
        not route.timeout
        msg := sprintf("VirtualService '%v' must have an explicit timeout on all HTTP routes", [input.review.object.metadata.name])
      }

      violation[{"msg": msg}] {
        input.review.object.kind == "VirtualService"
        route := input.review.object.spec.http[_]
        route.timeout
        timeout_seconds := time_to_seconds(route.timeout)
        max_seconds := time_to_seconds(input.parameters.maxTimeout)
        timeout_seconds > max_seconds
        msg := sprintf("VirtualService '%v' timeout %v exceeds maximum allowed %v", [input.review.object.metadata.name, route.timeout, input.parameters.maxTimeout])
      }

      time_to_seconds(t) = seconds {
        endswith(t, "s")
        seconds := to_number(trim_suffix(t, "s"))
      }

      time_to_seconds(t) = seconds {
        endswith(t, "m")
        minutes := to_number(trim_suffix(t, "m"))
        seconds := minutes * 60
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioRequireTimeout
metadata:
  name: require-vs-timeout
spec:
  match:
    kinds:
    - apiGroups: ["networking.istio.io"]
      kinds: ["VirtualService"]
    namespaces:
    - team-frontend
    - team-backend
    - team-checkout
  parameters:
    maxTimeout: "60s"
```

Now if a developer tries to create a VirtualService without a timeout, they get a clear error:

```
Error from server: admission webhook "validation.gatekeeper.sh" denied the request:
VirtualService 'my-service' must have an explicit timeout on all HTTP routes
```

## Policy: Restrict AuthorizationPolicy Actions

Prevent developers from creating overly permissive authorization policies:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istiosafeauthpolicy
spec:
  crd:
    spec:
      names:
        kind: IstioSafeAuthPolicy
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package istiosafeauthpolicy

      # Deny ALLOW policies with no rules (allows everything)
      violation[{"msg": msg}] {
        input.review.object.kind == "AuthorizationPolicy"
        input.review.object.spec.action == "ALLOW"
        not input.review.object.spec.rules
        msg := sprintf("AuthorizationPolicy '%v' with ALLOW action must have at least one rule", [input.review.object.metadata.name])
      }

      # Deny policies that allow all namespaces
      violation[{"msg": msg}] {
        input.review.object.kind == "AuthorizationPolicy"
        rule := input.review.object.spec.rules[_]
        source := rule.from[_].source
        ns := source.namespaces[_]
        ns == "*"
        msg := sprintf("AuthorizationPolicy '%v' cannot use wildcard namespace", [input.review.object.metadata.name])
      }
```

```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioSafeAuthPolicy
metadata:
  name: safe-auth-policies
spec:
  match:
    kinds:
    - apiGroups: ["security.istio.io"]
      kinds: ["AuthorizationPolicy"]
    excludedNamespaces:
    - istio-system
```

## Policy: Require Circuit Breakers

Ensure every DestinationRule has circuit breaking configured:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istiorequirecircuitbreaker
spec:
  crd:
    spec:
      names:
        kind: IstioRequireCircuitBreaker
      validation:
        openAPIV3Schema:
          type: object
          properties:
            maxConnections:
              type: integer
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package istiorequirecircuitbreaker

      violation[{"msg": msg}] {
        input.review.object.kind == "DestinationRule"
        not input.review.object.spec.trafficPolicy.connectionPool
        msg := sprintf("DestinationRule '%v' must have connectionPool settings configured", [input.review.object.metadata.name])
      }

      violation[{"msg": msg}] {
        input.review.object.kind == "DestinationRule"
        pool := input.review.object.spec.trafficPolicy.connectionPool
        pool.tcp.maxConnections > input.parameters.maxConnections
        msg := sprintf("DestinationRule '%v' maxConnections %v exceeds limit of %v", [input.review.object.metadata.name, pool.tcp.maxConnections, input.parameters.maxConnections])
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioRequireCircuitBreaker
metadata:
  name: require-circuit-breaker
spec:
  match:
    kinds:
    - apiGroups: ["networking.istio.io"]
      kinds: ["DestinationRule"]
  parameters:
    maxConnections: 500
```

## Policy: Prevent Direct EnvoyFilter Usage

EnvoyFilters are powerful and dangerous. Restrict them to the platform team:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istioblockenvoyfilter
spec:
  crd:
    spec:
      names:
        kind: IstioBlockEnvoyFilter
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package istioblockenvoyfilter

      violation[{"msg": msg}] {
        input.review.object.kind == "EnvoyFilter"
        not input.review.object.metadata.namespace == "istio-system"
        msg := sprintf("EnvoyFilter resources are not allowed in namespace '%v'. Contact the platform team for custom proxy configuration.", [input.review.object.metadata.namespace])
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioBlockEnvoyFilter
metadata:
  name: block-envoyfilter
spec:
  match:
    kinds:
    - apiGroups: ["networking.istio.io"]
      kinds: ["EnvoyFilter"]
```

## Policy: Validate Traffic Weights

Ensure traffic weights in VirtualServices add up to 100:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istiovalidateweights
spec:
  crd:
    spec:
      names:
        kind: IstioValidateWeights
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package istiovalidateweights

      violation[{"msg": msg}] {
        input.review.object.kind == "VirtualService"
        route := input.review.object.spec.http[i]
        weights := [w | w := route.route[_].weight]
        count(weights) > 0
        total := sum(weights)
        total != 100
        msg := sprintf("VirtualService '%v' route %v has weights that sum to %v (must be 100)", [input.review.object.metadata.name, i, total])
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioValidateWeights
metadata:
  name: validate-traffic-weights
spec:
  match:
    kinds:
    - apiGroups: ["networking.istio.io"]
      kinds: ["VirtualService"]
```

## Auditing Existing Configurations

Gatekeeper can audit resources that already exist in the cluster:

```bash
kubectl get istiorequiretimeout require-vs-timeout -o yaml
```

Check the status section for violations:

```yaml
status:
  totalViolations: 3
  violations:
  - enforcementAction: deny
    kind: VirtualService
    message: "VirtualService 'old-service' must have an explicit timeout on all HTTP routes"
    name: old-service
    namespace: team-backend
```

This helps you identify existing misconfigurations that need fixing.

## Testing Policies Locally

Before deploying policies, test them with `gator`:

```bash
# Install gator
go install github.com/open-policy-agent/gatekeeper/v3/cmd/gator@latest

# Test a constraint against a resource
gator test --filename constraint.yaml --filename template.yaml --filename test-virtualservice.yaml
```

Create test fixtures for expected pass and fail cases:

```yaml
# test-good-vs.yaml (should pass)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: good-service
spec:
  hosts:
  - good-service
  http:
  - timeout: 10s
    route:
    - destination:
        host: good-service
      weight: 100
---
# test-bad-vs.yaml (should fail)
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: bad-service
spec:
  hosts:
  - bad-service
  http:
  - route:
    - destination:
        host: bad-service
      weight: 100
```

## Summary

Policy guardrails turn Istio best practices into enforceable rules. OPA Gatekeeper lets you write constraints that validate VirtualServices, DestinationRules, AuthorizationPolicies, and any other Istio CRD before they are applied. Start with the most impactful policies: require timeouts, validate traffic weights, enforce circuit breakers, and restrict dangerous resources like EnvoyFilters to the platform team. Test policies locally with gator, audit existing resources for violations, and give developers clear error messages that explain both what is wrong and how to fix it.
