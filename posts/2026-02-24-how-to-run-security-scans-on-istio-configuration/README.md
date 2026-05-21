# How to Run Security Scans on Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Scanning, Kubernetes, DevSecOps

Description: How to use automated security scanning tools to find misconfigurations and vulnerabilities in your Istio service mesh setup.

---

Security misconfigurations in Istio can be subtle. A missing PeerAuthentication policy, an overly permissive AuthorizationPolicy, or a gateway with weak TLS settings can all create vulnerabilities that are hard to spot during code review. Automated security scanning catches these issues before they make it to production.

This guide covers the tools and techniques for scanning Istio configurations for security issues.

## Using istioctl analyze

The first tool you should reach for is built right into Istio. The `istioctl analyze` command checks your Istio configuration against a set of known best practices and common mistakes.

```bash
# Analyze the entire cluster

istioctl analyze --all-namespaces

# Analyze a specific namespace
istioctl analyze -n default

# Analyze local files before applying
istioctl analyze my-virtual-service.yaml my-destination-rule.yaml

# Output in JSON for parsing
istioctl analyze --all-namespaces -o json
```

Common issues it catches:
- VirtualServices referencing non-existent gateways
- DestinationRules with no matching services
- Conflicting traffic policies
- Missing sidecar injection labels
- Deprecated API versions

Integrate this into your CI pipeline:

```yaml
# .github/workflows/istio-check.yaml
name: Istio Configuration Check
on:
  pull_request:
    paths:
    - 'k8s/istio/**'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Install istioctl
      run: |
        curl -L https://istio.io/downloadIstio | sh -
        echo "$PWD"/istio-*/bin >> "$GITHUB_PATH"
    - name: Analyze Istio configs
      run: |
        istioctl analyze --use-kube=false k8s/istio/
```

## Scanning with Trivy

Trivy from Aqua Security can scan Kubernetes manifests, including Istio resources, for misconfigurations:

```bash
# Install Trivy
brew install trivy

# Scan Istio configuration files
trivy config k8s/istio/

# Scan with specific severity
trivy config --severity HIGH,CRITICAL k8s/istio/

# Output as JSON
trivy config --format json --output results.json k8s/istio/
```

Trivy checks for things like:
- Containers running as root
- Missing resource limits
- Privileged containers
- Missing security contexts
- Network policy gaps

Example output for an Istio gateway deployment:

```text
k8s/istio/gateway-deployment.yaml
==================================
Tests: 23 (SUCCESSES: 18, FAILURES: 5)
Failures: 5 (HIGH: 3, MEDIUM: 2)

HIGH: Container 'istio-proxy' should set securityContext.readOnlyRootFilesystem to true
LOW:  Container 'istio-proxy' should set resources.limits.cpu
```

## Using Kyverno for Policy Enforcement

Kyverno acts as a Kubernetes admission controller that can validate and enforce policies on Istio resources.

Install Kyverno:

```bash
helm repo add kyverno https://kyverno.github.io/kyverno/
helm repo update
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
```

**Require strict mTLS everywhere:**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-strict-mtls
spec:
  background: true
  rules:
  - name: check-peer-authentication
    match:
      any:
      - resources:
          kinds:
          - PeerAuthentication
    validate:
      failureAction: Enforce
      message: "PeerAuthentication must use STRICT mTLS mode"
      pattern:
        spec:
          mtls:
            mode: STRICT
```

**Require TLS on all gateways:**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-gateway-tls
spec:
  rules:
  - name: check-gateway-tls
    match:
      any:
      - resources:
          kinds:
          - Gateway
          namespaces:
          - istio-system
    validate:
      failureAction: Enforce
      message: "Gateway servers must use HTTPS or TLS protocol"
      deny:
        conditions:
          any:
          - key: "{{ request.object.spec.servers[].port.protocol }}"
            operator: AnyIn
            value: ["HTTP"]
```

**Require AuthorizationPolicy in every namespace:**

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-authz-policy
spec:
  background: true
  rules:
  - name: check-authz-exists
    match:
      any:
      - resources:
          kinds:
          - Namespace
    context:
    - name: allauthorizationpolicies
      apiCall:
        urlPath: /apis/security.istio.io/v1/authorizationpolicies
        jmesPath: items[].metadata.namespace
    validate:
      failureAction: Audit
      message: "Namespace must have at least one AuthorizationPolicy"
      deny:
        conditions:
          all:
          - key: "{{ request.object.metadata.labels.\"istio-injection\" || '' }}"
            operator: Equals
            value: "enabled"
          - key: "{{ request.object.metadata.name }}"
            operator: AnyNotIn
            value: "{{ allauthorizationpolicies }}"
```

## Using OPA/Gatekeeper

OPA Gatekeeper provides similar policy enforcement with a different policy language (Rego).

**Constraint template for Istio mTLS:**

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: istiomtls
spec:
  crd:
    spec:
      names:
        kind: IstioMTLS
      validation:
        openAPIV3Schema:
          type: object
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package istiomtls

      violation[{"msg": msg}] {
        input.review.object.kind == "PeerAuthentication"
        mode := object.get(input.review.object, ["spec", "mtls", "mode"], "UNSET")
        mode != "STRICT"
        msg := sprintf("PeerAuthentication %v must use STRICT mTLS, got %v", [input.review.object.metadata.name, mode])
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: IstioMTLS
metadata:
  name: require-strict-mtls
spec:
  match:
    kinds:
    - apiGroups: ["security.istio.io"]
      kinds: ["PeerAuthentication"]
```

## Scanning for Vulnerabilities in Istio Images

Regularly scan the container images used by Istio for known CVEs:

```bash
# Scan istiod image
trivy image registry.istio.io/pilot:1.30.0

# Scan proxy image
trivy image registry.istio.io/proxyv2:1.30.0

# Scan in CI pipeline
trivy image --exit-code 1 --severity CRITICAL registry.istio.io/pilot:1.30.0
```

## Custom Security Checks Script

Write a custom script that checks for common Istio security issues:

```bash
#!/bin/bash

echo "=== Istio Security Scan ==="
echo ""

# Check 1: Strict mTLS
echo "[Check] Mesh-wide strict mTLS..."
MTLS=$(kubectl get peerauthentications.security.istio.io -n istio-system -o json 2>/dev/null | \
  jq -r '.items[] | select(.metadata.name == "default") | .spec.mtls.mode')
if [ "$MTLS" = "STRICT" ]; then
  echo "  PASS: Mesh-wide strict mTLS is enabled"
else
  echo "  FAIL: Mesh-wide strict mTLS is not configured"
fi

# Check 2: Outbound traffic policy
echo "[Check] Outbound traffic policy..."
OUTBOUND=$(kubectl get cm istio -n istio-system -o json | \
  jq -r '.data.mesh' | grep -o 'REGISTRY_ONLY')
if [ "$OUTBOUND" = "REGISTRY_ONLY" ]; then
  echo "  PASS: Outbound traffic is restricted to registered services"
else
  echo "  FAIL: Outbound traffic allows all destinations"
fi

# Check 3: Namespaces without AuthorizationPolicy
echo "[Check] Namespaces without AuthorizationPolicy..."
INJECTED_NS=$(kubectl get ns -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}')
for ns in $INJECTED_NS; do
  POLICIES=$(kubectl get authorizationpolicies.security.istio.io -n "$ns" --no-headers 2>/dev/null | wc -l)
  if [ "$POLICIES" -eq 0 ]; then
    echo "  WARN: Namespace '$ns' has no AuthorizationPolicy"
  fi
done

# Check 4: Gateways without TLS
echo "[Check] Gateways without TLS..."
kubectl get gateways.networking.istio.io --all-namespaces -o json | \
  jq -r '.items[] | .spec.servers[] | select(.port.protocol == "HTTP" and (.tls.httpsRedirect // false) != true) | "  FAIL: Gateway server on port \(.port.number) uses HTTP without redirect"'

# Check 5: istiod running as non-root
echo "[Check] istiod running as non-root..."
ISTIOD_SECURITY=$(kubectl get pods -n istio-system -l app=istiod -o json | \
  jq -r '.items[0].spec.containers[0].securityContext')
ISTIOD_NONROOT=$(echo "$ISTIOD_SECURITY" | jq -r '.runAsNonRoot // false')
ISTIOD_USER=$(echo "$ISTIOD_SECURITY" | jq -r '.runAsUser // ""')
if [ "$ISTIOD_NONROOT" = "true" ] || { [ -n "$ISTIOD_USER" ] && [ "$ISTIOD_USER" != "0" ]; }; then
  echo "  PASS: istiod runs as non-root user"
else
  echo "  WARN: istiod security context should be verified"
fi

echo ""
echo "=== Scan Complete ==="
```

## Integrating Scans into CI/CD

The most effective approach is running security scans at multiple stages:

1. **Pre-commit**: Lint Istio YAML files locally
2. **PR checks**: Run `istioctl analyze` and Trivy on changed files
3. **Pre-deploy**: Validate against Kyverno/OPA policies in a staging cluster
4. **Post-deploy**: Run compliance scans on the live cluster
5. **Continuous**: Schedule regular scans and alert on drift

```yaml
# GitLab CI example
stages:
  - lint
  - analyze
  - scan

istio-lint:
  stage: lint
  script:
    - yamllint k8s/istio/

istio-analyze:
  stage: analyze
  script:
    - istioctl analyze --use-kube=false k8s/istio/

security-scan:
  stage: scan
  script:
    - trivy config --exit-code 1 --severity HIGH,CRITICAL k8s/istio/
```

Automated security scanning for Istio is not a one-time activity. New misconfigurations get introduced with every change, and new vulnerability patterns emerge over time. Build scanning into your workflow so that every configuration change goes through security checks before it reaches your cluster.
