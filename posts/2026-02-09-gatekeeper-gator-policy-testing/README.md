# How to Build Policy Testing Frameworks with Gatekeeper gator CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OPA Gatekeeper, Testing, Policy Validation, CI/CD

Description: Learn how to use the Gatekeeper gator CLI tool to test constraint templates and policies locally, build automated policy testing frameworks, integrate with CI/CD pipelines, and ensure policy correctness before deployment.

---

Testing policies before deploying them to production prevents broken policies from blocking legitimate workloads or allowing violations to slip through. The Gatekeeper gator CLI tool enables local policy testing without a running cluster, making it perfect for CI/CD integration. This guide shows you how to build comprehensive policy testing frameworks using gator.

## Installing Gator

Download and install the gator CLI:

```bash
# macOS with Homebrew
brew install gator

# Linux/macOS manual installation
VERSION=v3.15.0
ARCH=amd64
curl -L https://github.com/open-policy-agent/gatekeeper/releases/download/${VERSION}/gator-${VERSION}-linux-${ARCH}.tar.gz | tar xz
sudo mv gator /usr/local/bin/

# Verify installation
gator --version
```

## Basic Policy Testing

Create a simple test structure:

```bash
mkdir policy-tests
cd policy-tests

# Create directories
mkdir templates constraints resources
```

Create a constraint template:

```yaml
# templates/require-labels.yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequirelabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequireLabels
      validation:
        openAPIV3Schema:
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequirelabels

        violation[{"msg": msg, "details": {"missing_labels": missing}}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("You must provide labels: %v", [missing])
        }
```

Create a constraint:

```yaml
# constraints/require-team-label.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequireLabels
metadata:
  name: require-team-label
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    labels: ["team", "environment"]
```

Create test resources:

```yaml
# resources/valid-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: valid-pod
  labels:
    team: platform
    environment: production
spec:
  containers:
    - name: nginx
      image: nginx:1.21

---
# resources/invalid-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: invalid-pod
  labels:
    app: nginx
spec:
  containers:
    - name: nginx
      image: nginx:1.21
```

Run tests:

```bash
# Test policies against resources
gator test -f .

# Expected output:
# ok	templates/require-labels.yaml	0.5s
# FAIL	constraints/require-team-label.yaml
#   invalid-pod: You must provide labels: {"team", "environment"}
```

## Structured Test Suites

Create explicit test suites with expected results:

```yaml
# suite.yaml
kind: Suite
apiVersion: test.gatekeeper.sh/v1alpha1
tests:
  - name: require-team-label-tests
    template: templates/require-labels.yaml
    constraint: constraints/require-team-label.yaml
    cases:
      - name: pod-with-required-labels
        object: resources/valid-pod.yaml
        assertions:
          - violations: no

      - name: pod-missing-labels
        object: resources/invalid-pod.yaml
        assertions:
          - violations: yes
          - message: "You must provide labels"
```

Run the suite:

```bash
gator verify suite.yaml
```

## Testing Multiple Constraints

Test how multiple policies interact:

```yaml
# suite-multi.yaml
kind: Suite
apiVersion: test.gatekeeper.sh/v1alpha1
tests:
  - name: combined-policy-tests
    template: templates/require-labels.yaml
    constraint: constraints/require-team-label.yaml
    cases:
      - name: fully-compliant-pod
        object: |
          apiVersion: v1
          kind: Pod
          metadata:
            name: test-pod
            labels:
              team: platform
              environment: production
          spec:
            containers:
              - name: nginx
                image: registry.company.com/nginx:1.21
                securityContext:
                  runAsNonRoot: true
        assertions:
          - violations: no

  - name: security-context-tests
    template: templates/require-nonroot.yaml
    constraint: constraints/require-nonroot.yaml
    cases:
      - name: pod-without-security-context
        object: |
          apiVersion: v1
          kind: Pod
          metadata:
            name: test-pod
            labels:
              team: platform
              environment: production
          spec:
            containers:
              - name: nginx
                image: nginx:1.21
        assertions:
          - violations: yes
          - message: "must run as non-root"
```

## Integration with CI/CD

Create a GitLab CI pipeline:

```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy

policy-tests:
  stage: test
  image: openpolicyagent/gatekeeper:v3.15.0
  script:
    - gator test -f policies/
    - gator verify policies/suite.yaml
  only:
    changes:
      - policies/**/*
```

GitHub Actions workflow:

```yaml
# .github/workflows/policy-tests.yml
name: Policy Tests

on:
  pull_request:
    paths:
      - 'policies/**'
  push:
    branches:
      - main
    paths:
      - 'policies/**'

jobs:
  test-policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install gator
        run: |
          VERSION=v3.15.0
          curl -L https://github.com/open-policy-agent/gatekeeper/releases/download/${VERSION}/gator-${VERSION}-linux-amd64.tar.gz | tar xz
          sudo mv gator /usr/local/bin/

      - name: Run policy tests
        run: |
          gator test -f policies/
          gator verify policies/suite.yaml

      - name: Check for policy errors
        if: failure()
        run: echo "Policy tests failed. Review the output above."
```

## Testing with External Data

Test policies that use Gatekeeper sync data:

```yaml
# suite-with-data.yaml
kind: Suite
apiVersion: test.gatekeeper.sh/v1alpha1
tests:
  - name: unique-ingress-host
    template: templates/unique-ingress-host.yaml
    constraint: constraints/unique-ingress-host.yaml
    inventory:
      - |
        apiVersion: networking.k8s.io/v1
        kind: Ingress
        metadata:
          name: existing-ingress
          namespace: production
        spec:
          rules:
            - host: app.example.com
    cases:
      - name: duplicate-host
        object: |
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: new-ingress
            namespace: staging
          spec:
            rules:
              - host: app.example.com
        assertions:
          - violations: yes
          - message: "host is already in use"

      - name: unique-host
        object: |
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: new-ingress
            namespace: staging
          spec:
            rules:
              - host: staging.example.com
        assertions:
          - violations: no
```

## Expanding Test Coverage

Create comprehensive test matrices:

```yaml
# comprehensive-suite.yaml
kind: Suite
apiVersion: test.gatekeeper.sh/v1alpha1
tests:
  - name: pod-security-tests
    template: templates/pod-security.yaml
    constraint: constraints/pod-security.yaml
    cases:
      # Test each security control individually
      - name: missing-run-as-nonroot
        object: |
          apiVersion: v1
          kind: Pod
          metadata:
            name: test
          spec:
            containers:
              - name: nginx
                image: nginx
        assertions:
          - violations: yes

      - name: privileged-container
        object: |
          apiVersion: v1
          kind: Pod
          metadata:
            name: test
          spec:
            containers:
              - name: nginx
                image: nginx
                securityContext:
                  privileged: true
        assertions:
          - violations: yes

      - name: host-network
        object: |
          apiVersion: v1
          kind: Pod
          metadata:
            name: test
          spec:
            hostNetwork: true
            containers:
              - name: nginx
                image: nginx
        assertions:
          - violations: yes

      - name: fully-secure-pod
        object: |
          apiVersion: v1
          kind: Pod
          metadata:
            name: test
          spec:
            securityContext:
              runAsNonRoot: true
              runAsUser: 1000
            containers:
              - name: nginx
                image: nginx
                securityContext:
                  runAsNonRoot: true
                  allowPrivilegeEscalation: false
                  capabilities:
                    drop: ["ALL"]
        assertions:
          - violations: no
```

## Performance Testing

Test policy performance with gator:

```bash
# Generate large test suite
for i in {1..1000}; do
  cat <<EOF > resources/pod-$i.yaml
apiVersion: v1
kind: Pod
metadata:
  name: pod-$i
  labels:
    team: platform
    environment: dev
spec:
  containers:
    - name: nginx
      image: nginx:1.21
EOF
done

# Time the test execution
time gator test -f .
```

Optimize slow policies based on test results.

## Generating Test Reports

Create detailed test reports:

```bash
# Run tests with verbose output
gator test -f policies/ --verbose > test-results.txt

# Generate JUnit XML for CI integration
gator test -f policies/ --output=junit > test-results.xml
```

Parse results in CI:

```bash
# Check for failures
if grep -q "FAIL" test-results.txt; then
  echo "Policy tests failed"
  exit 1
fi

# Count violations
VIOLATIONS=$(grep -c "violations: yes" test-results.txt)
echo "Found $VIOLATIONS expected violations"
```

## Best Practices

Organize test files:

```
policies/
├── templates/
│   ├── require-labels.yaml
│   ├── require-security-context.yaml
│   └── unique-ingress.yaml
├── constraints/
│   ├── production/
│   │   ├── require-labels.yaml
│   │   └── require-security-context.yaml
│   └── development/
│       └── require-labels.yaml
├── tests/
│   ├── suites/
│   │   ├── labels-suite.yaml
│   │   ├── security-suite.yaml
│   │   └── ingress-suite.yaml
│   └── resources/
│       ├── valid/
│       └── invalid/
└── Makefile
```

Create a Makefile:

```makefile
.PHONY: test test-verbose test-ci

test:
	@echo "Running policy tests..."
	@gator test -f policies/

test-verbose:
	@gator test -f policies/ --verbose

test-ci:
	@gator test -f policies/ --output=junit > test-results.xml
	@gator verify policies/tests/suites/*.yaml

lint:
	@echo "Linting Rego policies..."
	@opa fmt -d policies/templates/
```

## Conclusion

The gator CLI enables comprehensive policy testing without a live cluster. Build structured test suites that verify expected violations and compliant resources, integrate testing into CI/CD pipelines, and test policies with external data using inventory. Create test matrices covering edge cases, measure policy performance, and generate reports for CI integration. Organize test files clearly and use Makefiles to standardize testing workflows.

Policy testing prevents production issues and gives confidence that governance rules work as intended before deployment.
