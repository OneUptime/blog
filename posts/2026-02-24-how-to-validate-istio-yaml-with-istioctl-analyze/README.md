# How to Validate Istio YAML with istioctl analyze

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Validation, Istioctl, YAML, DevOps

Description: How to use istioctl analyze to validate Istio configuration files, catch misconfigurations early, and integrate validation into your CI pipeline.

---

Misconfigured Istio resources are one of the most common sources of mesh issues. A VirtualService that references a non-existent gateway, a DestinationRule with a subset that does not match any pod labels, or a conflicting AuthorizationPolicy can all cause problems that are hard to debug after deployment. The good news is that `istioctl analyze` can catch most of these issues before you apply them.

This guide covers how to use `istioctl analyze` effectively, what it checks for, and how to integrate it into your development workflow.

## Basic Usage

The simplest way to use `istioctl analyze` is to point it at your running cluster:

```bash
istioctl analyze
```

This checks the live cluster configuration and reports any issues it finds. The output looks something like:

```text
Warning [IST0101] (VirtualService default/reviews) Referenced host not found: "reviews"
Warning [IST0104] (Gateway default/my-gateway) The gateway refers to a server with a credential name that does not exist
Info [IST0118] (Service default/reviews) Port name "http" does not follow the naming convention
```

Each message includes a severity level (Error, Warning, Info), a message code, the affected resource, and a description.

## Analyzing Local Files

You do not need a running cluster to validate your configs. Use the `--use-kube=false` flag to analyze local files:

```bash
istioctl analyze my-virtualservice.yaml --use-kube=false
```

Or analyze an entire directory:

```bash
istioctl analyze istio-config/ --use-kube=false
```

This is particularly useful in CI pipelines where you may not have cluster access.

## Analyzing Specific Namespaces

To focus on a specific namespace:

```bash
istioctl analyze -n production
```

Or analyze all namespaces:

```bash
istioctl analyze --all-namespaces
```

## Common Issues istioctl analyze Catches

Here are some of the most useful checks that `istioctl analyze` performs.

### Referenced Host Not Found (IST0101)

This fires when a VirtualService references a host that does not have a corresponding Service or ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: bad-vs
spec:
  hosts:
  - nonexistent-service  # No Service with this name exists
  http:
  - route:
    - destination:
        host: nonexistent-service
```

Running analyze:

```bash
istioctl analyze bad-vs.yaml --use-kube=false
```

Output:

```text
Warning [IST0101] (VirtualService default/bad-vs) Referenced host not found: "nonexistent-service"
```

### Gateway Not Found (IST0132)

When a VirtualService references a Gateway that does not exist:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-vs
spec:
  hosts:
  - "*.example.com"
  gateways:
  - missing-gateway  # This gateway does not exist
  http:
  - route:
    - destination:
        host: my-service
```

### Conflicting Mesh Gateway Hosts (IST0109)

When multiple VirtualServices bound to the mesh gateway have overlapping hosts:

```yaml
# vs-1.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: vs-1
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
---
# vs-2.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: vs-2
spec:
  hosts:
  - reviews  # Same host as vs-1!
  http:
  - route:
    - destination:
        host: reviews
        subset: v2
```

This creates ambiguity about which VirtualService should handle traffic to "reviews".

### Port Name Convention (IST0118)

Istio relies on port naming conventions to determine the protocol. Ports should be named with a protocol prefix like `http`, `grpc`, `tcp`, etc:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: web      # Should be "http-web" or just "http"
    port: 80
  - name: grpc-api # This is correct
    port: 9090
```

### Mismatched Subset Labels (IST0107)

When a DestinationRule defines subsets with labels that do not match any running pods:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
spec:
  host: reviews
  subsets:
  - name: v3
    labels:
      version: v3  # No pods have version: v3
```

## Suppressing Specific Warnings

Sometimes you know about an issue and do not want it cluttering your output. Suppress specific messages:

```bash
istioctl analyze --suppress "IST0118=Service *.default"
```

This suppresses the port naming warning for all Services in the default namespace.

## Integrating into CI/CD

Add `istioctl analyze` to your CI pipeline to catch issues before they reach any cluster.

### GitHub Actions Example

```yaml
name: Validate Istio Config
on:
  pull_request:
    paths:
      - 'k8s/istio/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install istioctl
      run: |
        curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
        echo "$PWD/istio-1.24.0/bin" >> $GITHUB_PATH

    - name: Analyze Istio configuration
      run: |
        istioctl analyze k8s/istio/ --use-kube=false

    - name: Fail on errors
      run: |
        OUTPUT=$(istioctl analyze k8s/istio/ --use-kube=false 2>&1)
        if echo "$OUTPUT" | grep -q "Error"; then
          echo "Istio configuration has errors:"
          echo "$OUTPUT"
          exit 1
        fi
        echo "No errors found"
```

### Pre-commit Hook

Add a git pre-commit hook that runs analyze before allowing commits:

```bash
#!/bin/bash
# .git/hooks/pre-commit

CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ya?ml$')

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

echo "Running istioctl analyze on changed files..."
for file in $CHANGED_FILES; do
  OUTPUT=$(istioctl analyze "$file" --use-kube=false 2>&1)
  if echo "$OUTPUT" | grep -q "Error"; then
    echo "Error in $file:"
    echo "$OUTPUT"
    exit 1
  fi
done

echo "Istio configuration validated successfully"
```

## Combining with Kube-linter and OPA

For comprehensive validation, combine `istioctl analyze` with other tools:

```bash
# Validate Kubernetes resources
kube-linter lint k8s/

# Validate Istio-specific configuration
istioctl analyze k8s/istio/ --use-kube=false

# Check against custom policies with OPA
conftest test k8s/istio/ -p policy/
```

## Analyzing Against a Live Cluster

When you have access to the cluster, analyzing against the live state catches more issues because it can cross-reference resources:

```bash
# Analyze local files against the live cluster
istioctl analyze my-config.yaml

# This will check:
# - Do referenced Services exist in the cluster?
# - Do DestinationRule subsets match actual pod labels?
# - Are there conflicting VirtualServices already applied?
```

## Output Formats

The default output is human-readable text, but you can also get structured output:

```bash
# JSON output for programmatic processing
istioctl analyze -o json

# YAML output
istioctl analyze -o yaml
```

JSON output is useful when you want to parse the results in a script:

```bash
ERRORS=$(istioctl analyze -o json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
errors = [m for m in data if m.get('level') == 'Error']
print(len(errors))
")
echo "Found $ERRORS error(s)"
```

## Wrapping Up

Running `istioctl analyze` should be as automatic as running a linter on your application code. Add it to your CI pipeline, add it as a pre-commit hook, and run it manually whenever you change Istio configuration. It catches the easy mistakes before they become production incidents. The few seconds it takes to run is nothing compared to the hours you will spend debugging a misconfigured VirtualService in production.
