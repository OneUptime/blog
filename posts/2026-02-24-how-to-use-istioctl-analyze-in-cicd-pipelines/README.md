# How to Use istioctl analyze in CI/CD Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istioctl, CI/CD, Validation, Service Mesh

Description: A deep look at using istioctl analyze in CI/CD pipelines for automated Istio configuration validation with message codes, suppressions, and output parsing.

---

`istioctl analyze` is the built-in linter for Istio configuration. It checks your resources against a set of analysis rules and reports errors, warnings, and informational messages. Running it in CI/CD catches configuration problems before they can cause outages. But there is more to it than just running the command and checking the exit code. You can customize which checks run, suppress known issues, parse the output programmatically, and integrate it into different CI systems.

This post goes deep on getting the most out of `istioctl analyze` in automated pipelines.

## Basic Usage

The simplest form checks files without a cluster:

```bash
istioctl analyze k8s/istio/
```

This reads all YAML files in the directory and runs analysis rules against them. It does not need a running Kubernetes cluster, making it perfect for CI environments.

The exit code tells you the result:
- 0: No errors (warnings and info messages are still displayed)
- Non-zero: Errors found

## Analyzing Specific Namespaces

When connected to a cluster, analyze specific namespaces:

```bash
istioctl analyze -n production
istioctl analyze -n staging
istioctl analyze --all-namespaces
```

## Combining Local Files with Cluster State

The most powerful mode combines your local changes with the live cluster:

```bash
istioctl analyze k8s/istio/ --use-kube=true -n app
```

This catches issues like:
- Your VirtualService references a Service that does not exist in the cluster
- Your DestinationRule references a subset label that no Deployment has
- Your Gateway references a credential Secret that is missing

Without `--use-kube`, the analyzer only checks internal consistency of the provided files.

## Understanding Message Codes

Each message from `istioctl analyze` has a code. Here are the common ones you will encounter:

| Code | Severity | Description |
|------|----------|-------------|
| IST0101 | Warning | Referenced host not found |
| IST0104 | Warning | Referenced credential not found |
| IST0106 | Warning | Namespace not injected |
| IST0108 | Warning | Unknown annotation |
| IST0113 | Error | DestinationRule with conflicting outlier detection |
| IST0128 | Warning | Missing sidecar |
| IST0132 | Warning | Deprecated field usage |
| IST0134 | Warning | Gateway selector matches no pods |
| IST0145 | Warning | Conflicting inbound ports |

## Suppressing Known Issues

Sometimes you have known issues that you do not want to fail the build. Use the `--suppress` flag:

```bash
istioctl analyze k8s/istio/ \
  --suppress "IST0106=Namespace no-mesh" \
  --suppress "IST0128=Pod some-legacy-pod.default"
```

This suppresses the "namespace not injected" warning for the `no-mesh` namespace and the "missing sidecar" warning for a specific pod.

For CI pipelines, maintain a suppressions file:

```yaml
# .istio-analyze-suppress.yaml
- code: IST0106
  resource: Namespace no-mesh
- code: IST0108
  resource: Pod legacy-app.default
```

And use it:

```bash
while IFS= read -r line; do
  SUPPRESS_ARGS="$SUPPRESS_ARGS --suppress \"$line\""
done < <(python3 -c "
import yaml
with open('.istio-analyze-suppress.yaml') as f:
    for item in yaml.safe_load(f):
        print(f\"{item['code']}={item['resource']}\")
")

eval istioctl analyze k8s/istio/ $SUPPRESS_ARGS
```

## Parsing Output Programmatically

For more sophisticated CI integration, use JSON or YAML output:

```bash
istioctl analyze k8s/istio/ -o json
```

This produces structured output you can parse with `jq`:

```bash
# Count errors vs warnings
ERRORS=$(istioctl analyze k8s/istio/ -o json 2>/dev/null | jq '[.[] | select(.level == "Error")] | length')
WARNINGS=$(istioctl analyze k8s/istio/ -o json 2>/dev/null | jq '[.[] | select(.level == "Warning")] | length')

echo "Errors: $ERRORS, Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo "Found $ERRORS errors, failing build"
  exit 1
fi

if [ "$WARNINGS" -gt 5 ]; then
  echo "Too many warnings ($WARNINGS), failing build"
  exit 1
fi
```

## GitHub Actions Integration

A complete GitHub Actions setup:

```yaml
name: Istio Analysis
on:
  pull_request:
    paths:
      - 'k8s/istio/**'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cache istioctl
        uses: actions/cache@v3
        with:
          path: istio-1.22.0
          key: istioctl-1.22.0

      - name: Install istioctl
        run: |
          if [ ! -f istio-1.22.0/bin/istioctl ]; then
            curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.0 sh -
          fi
          echo "$PWD/istio-1.22.0/bin" >> $GITHUB_PATH

      - name: Run analysis
        id: analyze
        run: |
          OUTPUT=$(istioctl analyze k8s/istio/ --all-namespaces 2>&1)
          EXIT_CODE=$?
          echo "$OUTPUT"
          echo "output<<EOF" >> $GITHUB_OUTPUT
          echo "$OUTPUT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
          echo "exit_code=$EXIT_CODE" >> $GITHUB_OUTPUT
          exit $EXIT_CODE

      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            const output = `${{ steps.analyze.outputs.output }}`;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Istio Configuration Analysis Failed\n\n\`\`\`\n${output}\n\`\`\`\n\nPlease fix the issues above before merging.`
            });
```

This posts the analysis results as a comment on the pull request when it fails.

## GitLab CI Integration

```yaml
istio-analyze:
  stage: validate
  image: ubuntu:22.04
  before_script:
    - apt-get update && apt-get install -y curl
    - curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.0 sh -
    - export PATH=$PWD/istio-1.22.0/bin:$PATH
  script:
    - istioctl analyze k8s/istio/ --all-namespaces
  rules:
    - changes:
        - k8s/istio/**
  artifacts:
    reports:
      junit: istio-analysis-report.xml
    when: always
```

## Running Against Multiple Environments

If you deploy to multiple environments with different configurations:

```bash
#!/bin/bash
# analyze-all-envs.sh

ENVIRONMENTS=("dev" "staging" "production")
FAILED=0

for env in "${ENVIRONMENTS[@]}"; do
  echo "Analyzing $env..."
  istioctl analyze "k8s/overlays/$env/" --all-namespaces 2>&1
  if [ $? -ne 0 ]; then
    echo "FAIL: $env has configuration issues"
    FAILED=1
  else
    echo "PASS: $env configuration is valid"
  fi
  echo "---"
done

exit $FAILED
```

## Custom Analysis with istioctl Experimental

`istioctl` has experimental analysis features that catch additional issues:

```bash
# Check for deprecated features
istioctl analyze k8s/istio/ --all-namespaces 2>&1 | grep -i "deprecated"

# Describe a specific workload to see all applicable policies
istioctl x describe pod my-app-pod -n app
```

## Combining with Other Checks

Build a comprehensive validation script that combines `istioctl analyze` with other checks:

```bash
#!/bin/bash
# validate-all.sh

ERRORS=0

echo "Step 1: YAML syntax check"
for file in k8s/istio/*.yaml; do
  python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null || {
    echo "FAIL: Invalid YAML in $file"
    ERRORS=$((ERRORS + 1))
  }
done

echo "Step 2: istioctl analyze"
istioctl analyze k8s/istio/ --all-namespaces 2>&1 || ERRORS=$((ERRORS + 1))

echo "Step 3: Check VirtualService weights"
for file in k8s/istio/virtual-service*.yaml; do
  python3 -c "
import yaml, sys
with open('$file') as f:
    for doc in yaml.safe_load_all(f):
        if doc and doc.get('kind') == 'VirtualService':
            for route in doc.get('spec',{}).get('http',[]):
                total = sum(r.get('weight',0) for r in route.get('route',[]))
                if total != 100 and total != 0:
                    print(f'Weights in $file sum to {total}')
                    sys.exit(1)
" || ERRORS=$((ERRORS + 1))
done

echo "Step 4: Check for disallowed patterns"
grep -r "mode: DISABLE" k8s/istio/ && {
  echo "FAIL: TLS DISABLE mode found"
  ERRORS=$((ERRORS + 1))
}

if [ $ERRORS -gt 0 ]; then
  echo "Validation failed with $ERRORS errors"
  exit 1
fi

echo "All validations passed"
```

## Keeping istioctl Version in Sync

The version of `istioctl` in your CI should match the version of Istio running on your cluster. Store the version in a config file:

```bash
# .istio-version
1.22.0
```

Then reference it in CI:

```yaml
- name: Install istioctl
  run: |
    ISTIO_VERSION=$(cat .istio-version)
    curl -L https://istio.io/downloadIstio | ISTIO_VERSION=$ISTIO_VERSION sh -
```

When you upgrade Istio on the cluster, update this file and the CI automatically uses the matching `istioctl` version.

`istioctl analyze` is the fastest way to catch Istio misconfigurations. Running it in CI on every pull request that changes Istio resources prevents broken configuration from reaching any environment. The structured output, suppressions, and combination with other validation tools make it a solid foundation for Istio configuration governance.
