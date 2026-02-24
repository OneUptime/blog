# How to Set Up Configuration Linting for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Linting, Validation, CI/CD, Configuration

Description: How to set up automated linting and validation for Istio configuration files to catch errors before they reach your cluster.

---

A typo in a VirtualService can send traffic to the wrong service. A misconfigured AuthorizationPolicy can block all traffic to a critical endpoint. These are the kinds of mistakes that linting catches before they ever reach production. Setting up automated validation for Istio configuration is one of the highest-value investments you can make in your mesh operations.

The good news is that Istio ships with a built-in analysis tool, and there are additional tools you can layer on top. The key is running these checks in your CI pipeline so that broken configuration never gets merged.

## Using istioctl analyze

The `istioctl analyze` command is the official linting tool for Istio configuration. It checks for common issues like references to non-existent resources, conflicting configurations, and deprecated fields.

Run it against your local files:

```bash
istioctl analyze --use-kube=false -f istio-config/ --recursive
```

The `--use-kube=false` flag means it does not need a live cluster. This is what you want in CI.

Run it against a live cluster:

```bash
istioctl analyze --all-namespaces
```

Common issues it catches:
- VirtualService referencing a non-existent Gateway
- VirtualService with no matching Service
- Conflicting VirtualService rules
- Missing sidecar injection labels
- Deprecated Istio API versions

## Setting Up CI Pipeline Validation

Add Istio linting to your CI pipeline. Here is a GitHub Actions example:

```yaml
# .github/workflows/istio-lint.yaml
name: Lint Istio Configuration
on:
  pull_request:
    paths:
      - 'istio-config/**'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install istioctl
        run: |
          ISTIO_VERSION=1.22.0
          curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
          sudo mv istio-$ISTIO_VERSION/bin/istioctl /usr/local/bin/

      - name: YAML syntax validation
        run: |
          pip install yamllint
          yamllint -d "{extends: default, rules: {line-length: disable, truthy: disable}}" \
            istio-config/

      - name: Kubernetes schema validation
        run: |
          pip install kubeval
          for FILE in $(find istio-config -name "*.yaml" -type f); do
            kubectl apply --dry-run=client -f "$FILE" 2>&1 || {
              echo "FAIL: $FILE"
              exit 1
            }
          done

      - name: Istio analysis
        run: |
          istioctl analyze --use-kube=false -f istio-config/ --recursive 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            echo "istioctl analyze found issues"
            exit 1
          fi

      - name: Custom policy checks
        run: |
          bash scripts/custom-lint.sh
```

## YAML Linting with yamllint

Before checking Istio-specific rules, make sure your YAML is syntactically valid:

```yaml
# .yamllint.yaml
extends: default
rules:
  line-length: disable
  truthy:
    check-keys: false
  document-start: disable
  comments:
    min-spaces-from-content: 1
  indentation:
    spaces: 2
    indent-sequences: true
```

Run it:

```bash
yamllint -c .yamllint.yaml istio-config/
```

## Custom Linting Rules

`istioctl analyze` catches structural issues, but you often need organization-specific rules. Write custom checks:

```bash
#!/bin/bash
# scripts/custom-lint.sh

ERRORS=0
WARNINGS=0

echo "=== Custom Istio Configuration Lint ==="

# Rule 1: All resources must have a namespace
for FILE in $(find istio-config -name "*.yaml" -type f); do
  RESOURCES=$(yq eval-all '.metadata.namespace // "MISSING"' "$FILE" 2>/dev/null)
  for NS in $RESOURCES; do
    if [ "$NS" = "MISSING" ] || [ "$NS" = "null" ]; then
      echo "ERROR: $FILE - resource missing explicit namespace"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

# Rule 2: No wildcard hosts in production VirtualServices
for FILE in $(find istio-config/production -name "*.yaml" -type f); do
  if grep -q "hosts:" "$FILE" && grep -q '\- "\*"' "$FILE"; then
    echo "ERROR: $FILE - wildcard host in production VirtualService"
    ERRORS=$((ERRORS + 1))
  fi
done

# Rule 3: All AuthorizationPolicies must have a selector
for FILE in $(find istio-config -name "*.yaml" -type f); do
  if grep -q "kind: AuthorizationPolicy" "$FILE"; then
    if ! grep -q "selector:" "$FILE"; then
      # Check if it is intentionally mesh-wide
      NS=$(yq eval '.metadata.namespace' "$FILE" 2>/dev/null)
      if [ "$NS" != "istio-system" ]; then
        echo "WARNING: $FILE - AuthorizationPolicy without selector (applies to entire namespace)"
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi
done

# Rule 4: Timeout must not exceed 60 seconds
for FILE in $(find istio-config -name "*.yaml" -type f); do
  TIMEOUTS=$(yq eval '.. | select(has("timeout")) | .timeout' "$FILE" 2>/dev/null)
  for TIMEOUT in $TIMEOUTS; do
    SECONDS=$(echo "$TIMEOUT" | sed 's/s$//')
    if [ "$SECONDS" -gt 60 ] 2>/dev/null; then
      echo "WARNING: $FILE - timeout of ${TIMEOUT} exceeds 60s limit"
      WARNINGS=$((WARNINGS + 1))
    fi
  done
done

# Rule 5: DestinationRule must have outlier detection in production
for FILE in $(find istio-config/production -name "*.yaml" -type f); do
  if grep -q "kind: DestinationRule" "$FILE"; then
    if ! grep -q "outlierDetection:" "$FILE"; then
      echo "WARNING: $FILE - DestinationRule missing outlierDetection in production"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
done

# Rule 6: Retries should have perTryTimeout
for FILE in $(find istio-config -name "*.yaml" -type f); do
  if grep -q "retries:" "$FILE"; then
    if ! grep -q "perTryTimeout:" "$FILE"; then
      echo "ERROR: $FILE - retries configured without perTryTimeout"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

echo ""
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
  exit 1
fi
```

## Using OPA/Conftest for Policy-as-Code

For more sophisticated validation, use Conftest with OPA policies:

```bash
# Install conftest
brew install conftest
```

Write policies in Rego:

```rego
# policy/istio/virtualservice.rego
package istio.virtualservice

deny[msg] {
  input.kind == "VirtualService"
  route := input.spec.http[_].route[_]
  not route.destination.port
  msg := sprintf("VirtualService %s: route destination must specify a port", [input.metadata.name])
}

deny[msg] {
  input.kind == "VirtualService"
  http := input.spec.http[_]
  http.retries
  not http.retries.perTryTimeout
  msg := sprintf("VirtualService %s: retries must include perTryTimeout", [input.metadata.name])
}

warn[msg] {
  input.kind == "VirtualService"
  http := input.spec.http[_]
  timeout := http.timeout
  contains(timeout, "s")
  seconds := to_number(trim_suffix(timeout, "s"))
  seconds > 30
  msg := sprintf("VirtualService %s: timeout %s is above recommended 30s", [input.metadata.name, timeout])
}
```

```rego
# policy/istio/destinationrule.rego
package istio.destinationrule

deny[msg] {
  input.kind == "DestinationRule"
  input.metadata.namespace == "production"
  not input.spec.trafficPolicy.outlierDetection
  msg := sprintf("DestinationRule %s: must have outlierDetection in production", [input.metadata.name])
}

deny[msg] {
  input.kind == "DestinationRule"
  pool := input.spec.trafficPolicy.connectionPool
  pool.tcp.maxConnections > 1000
  msg := sprintf("DestinationRule %s: maxConnections %d exceeds limit of 1000", [input.metadata.name, pool.tcp.maxConnections])
}
```

```rego
# policy/istio/authorizationpolicy.rego
package istio.authorizationpolicy

deny[msg] {
  input.kind == "AuthorizationPolicy"
  input.metadata.namespace != "istio-system"
  not input.spec.selector
  msg := sprintf("AuthorizationPolicy %s: must have a selector (non-mesh-wide)", [input.metadata.name])
}

deny[msg] {
  input.kind == "AuthorizationPolicy"
  input.spec.action == "ALLOW"
  rule := input.spec.rules[_]
  not rule.from
  msg := sprintf("AuthorizationPolicy %s: ALLOW policy without 'from' clause allows all sources", [input.metadata.name])
}
```

Run conftest:

```bash
conftest test istio-config/ --policy policy/istio/ --all-namespaces
```

## Pre-Commit Hook

Add a pre-commit hook so developers catch issues before pushing:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: istio-lint
        name: Istio Configuration Lint
        entry: bash -c 'istioctl analyze --use-kube=false -f istio-config/ --recursive'
        language: system
        files: 'istio-config/.*\.yaml$'
        pass_filenames: false

      - id: yaml-lint
        name: YAML Lint
        entry: yamllint -c .yamllint.yaml
        language: python
        additional_dependencies: ['yamllint']
        files: '\.yaml$'

      - id: conftest
        name: OPA Policy Check
        entry: conftest test --policy policy/istio/
        language: system
        files: 'istio-config/.*\.yaml$'
```

Install the hooks:

```bash
pip install pre-commit
pre-commit install
```

## Integrating with PR Comments

For a better developer experience, have your CI bot comment on PRs with lint results:

```yaml
# In your CI pipeline
- name: Run Istio Lint and Comment
  run: |
    RESULT=$(istioctl analyze --use-kube=false -f istio-config/ --recursive 2>&1)
    EXIT_CODE=$?

    if [ $EXIT_CODE -ne 0 ]; then
      gh pr comment ${{ github.event.pull_request.number }} --body "$(cat <<EOF
    ## Istio Configuration Lint Results

    \`\`\`
    $RESULT
    \`\`\`

    Please fix the issues above before merging.
    EOF
    )"
      exit 1
    fi
```

Configuration linting is not a nice-to-have. It is a requirement for any team that wants to maintain a reliable Istio mesh. The combination of YAML syntax checking, istioctl analysis, and custom OPA policies catches the vast majority of configuration mistakes before they can cause problems. Set it up once and it protects you forever.
