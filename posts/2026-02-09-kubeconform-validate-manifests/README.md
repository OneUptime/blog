# How to Validate Kubernetes Manifests Against Schemas Using Kubeconform in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kubeconform, Validation, CI/CD, Schema Validation

Description: Learn how to use Kubeconform to validate Kubernetes manifests against schemas in CI/CD pipelines, catching configuration errors before deployment and ensuring manifest correctness.

---

Kubernetes manifests with syntax errors or invalid field values fail during deployment, causing pipeline failures and deployment delays. Kubeconform validates manifests against JSON schemas generated from Kubernetes OpenAPI schemas before deployment, catching errors early and ensuring manifests conform to API specifications.

In this guide, we'll integrate Kubeconform into CI/CD pipelines to validate manifests automatically, configure custom schemas for CRDs, and establish validation gates that prevent invalid configurations from reaching clusters.

## Understanding Kubeconform

Kubeconform validates Kubernetes resource manifests by checking them against JSON schemas generated from OpenAPI schemas that define valid fields, types, and constraints for each resource type. It does not require cluster access, and it can operate offline when schemas are provided locally or cached, making it fast and suitable for CI/CD integration.

The tool validates standard Kubernetes resources using the default Kubernetes schema registry and supports custom schemas for CRDs. Kubeconform is faster than alternatives like kubeval because it's written in Go and optimized for CI/CD workflows where speed matters.

Validation catches common errors including incorrect value types, required fields that are missing, and fields that don't exist in the API version specified. Strict mode also catches misspelled field names by rejecting additional properties. This prevents manifests from failing during deployment.

## Installing Kubeconform

Install Kubeconform locally for testing:

```bash
# Install on Linux

wget https://github.com/yannh/kubeconform/releases/download/v0.7.0/kubeconform-linux-amd64.tar.gz
tar -xzf kubeconform-linux-amd64.tar.gz
sudo mv kubeconform /usr/local/bin/

# Install on macOS
brew install kubeconform

# Verify installation
kubeconform -v
```

## Validating Basic Manifests

Create a sample deployment manifest:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
```

Validate the manifest:

```bash
# Validate single file and print valid resources
kubeconform -verbose deployment.yaml

# Expected output:
# deployment.yaml - Deployment nginx is valid
```

Test with an invalid manifest:

```yaml
# invalid-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        invalidField: "this-field-does-not-exist"
```

Validation catches the error:

```bash
kubeconform -strict invalid-deployment.yaml

# Output shows error:
# invalid-deployment.yaml - Deployment nginx is invalid:
# at '/spec/template/spec/containers/0': additional properties 'invalidField' not allowed
```

## Validating Multiple Files

Validate all manifests in a directory:

```bash
# Validate all YAML files recursively
kubeconform k8s/

# Validate with specific patterns
find k8s -name '*.yaml' -print0 | xargs -0 kubeconform -summary

# Show only failures
kubeconform -summary -output json k8s/ | jq '.resources[] | select(.status == "statusInvalid")'
```

## Configuring Kubernetes Version

Validate against specific Kubernetes versions:

```bash
# Validate for Kubernetes 1.28
kubeconform -kubernetes-version 1.28.0 deployment.yaml

# Validate for another exact Kubernetes version
kubeconform -kubernetes-version 1.26.0 manifests/

# Test compatibility across versions
for version in 1.26.0 1.27.0 1.28.0; do
  echo "Testing Kubernetes $version"
  kubeconform -kubernetes-version $version k8s/
done
```

## Validating Custom Resource Definitions

Create a CRD:

```yaml
# crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: applications.example.com
spec:
  group: example.com
  names:
    kind: Application
    plural: applications
  scope: Namespaced
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required:
            - image
            - replicas
            properties:
              image:
                type: string
              replicas:
                type: integer
                minimum: 1
```

Convert the CRD schema for validation:

```bash
# Convert CRD OpenAPI validation schema to JSON schema
curl -fsSLO https://raw.githubusercontent.com/yannh/kubeconform/master/scripts/openapi2jsonschema.py
mkdir -p crd-schemas
(cd crd-schemas && python3 ../openapi2jsonschema.py ../crd.yaml)
```

Validate custom resources:

```yaml
# application-cr.yaml
apiVersion: example.com/v1
kind: Application
metadata:
  name: my-app
spec:
  image: nginx:latest
  replicas: 3
```

```bash
kubeconform -schema-location default \
  -schema-location 'crd-schemas/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  application-cr.yaml
```

## Integrating into CI/CD Pipelines

Create a GitHub Actions workflow:

```yaml
# .github/workflows/validate-manifests.yml
name: Validate Kubernetes Manifests

on:
  pull_request:
    paths:
      - 'k8s/**'
      - 'charts/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v5

    - name: Install Kubeconform
      run: |
        wget https://github.com/yannh/kubeconform/releases/download/v0.7.0/kubeconform-linux-amd64.tar.gz
        tar -xzf kubeconform-linux-amd64.tar.gz
        sudo mv kubeconform /usr/local/bin/

    - name: Validate manifests
      run: |
        kubeconform -strict -summary -output json k8s/ > validation-results.json || true
        cat validation-results.json

    - name: Check validation results
      run: |
        invalid=$(jq -r '.resources[] | select(.status == "statusInvalid" or .status == "statusError") | .filename' validation-results.json)
        if [ -n "$invalid" ]; then
          echo "Invalid manifests or validation errors found:"
          echo "$invalid"
          exit 1
        fi

    - name: Upload results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: validation-results
        path: validation-results.json
```

GitLab CI pipeline:

```yaml
# .gitlab-ci.yml
validate-k8s:
  stage: test
  image: alpine:latest
  before_script:
    - apk add --no-cache wget tar
    - wget https://github.com/yannh/kubeconform/releases/download/v0.7.0/kubeconform-linux-amd64.tar.gz
    - tar -xzf kubeconform-linux-amd64.tar.gz
    - mv kubeconform /usr/local/bin/
  script:
    - kubeconform -strict -summary k8s/
  rules:
    - changes:
        - k8s/**/*
```

## Validating Helm Charts

Extract and validate Helm chart templates:

```bash
# Render Helm templates
helm template my-release charts/myapp > rendered-templates.yaml

# Validate rendered templates
kubeconform -summary rendered-templates.yaml

# Validate across multiple values files
for values in values-dev.yaml values-prod.yaml; do
  echo "Validating $values"
  helm template my-release charts/myapp -f $values | kubeconform -summary -
done
```

Automated Helm validation script:

```bash
#!/bin/bash
# validate-helm-chart.sh

CHART_DIR=$1
VALUES_FILES=${@:2}

if [ -z "$CHART_DIR" ]; then
  echo "Usage: $0 <chart-dir> [values-file...]"
  exit 1
fi

echo "Validating Helm chart: $CHART_DIR"

# Validate chart structure
helm lint $CHART_DIR

# Validate with default values
echo "Validating with default values..."
helm template test-release $CHART_DIR | kubeconform -summary -

# Validate with custom values
for values_file in $VALUES_FILES; do
  echo "Validating with $values_file..."
  helm template test-release $CHART_DIR -f $values_file | kubeconform -summary -
done

echo "Validation complete"
```

Usage:

```bash
chmod +x validate-helm-chart.sh
./validate-helm-chart.sh charts/myapp values-dev.yaml values-prod.yaml
```

## Strict Validation Mode

Enable strict validation to catch additional issues:

```bash
# Reject manifests with unknown properties
kubeconform -strict deployment.yaml

# Strict mode catches extra fields that aren't in schema
# This is useful for catching typos in field names
```

## Skipping Resource Types

Skip validation for specific resource types:

```bash
# Skip validating resources that are managed or validated separately
kubeconform -skip Secret,ConfigMap k8s/

# Skip custom resources without schemas
kubeconform -skip CustomResourceDefinition -ignore-missing-schemas k8s/
```

## Output Formats

Generate different output formats for parsing:

```bash
# JSON output for programmatic parsing
kubeconform -output json k8s/ > results.json

# JUnit XML for CI integration
kubeconform -output junit k8s/ > results.xml

# TAP format
kubeconform -output tap k8s/
```

Parse JSON results:

```bash
# Count valid vs invalid resources
jq '.summary' results.json

# List all invalid resources
jq '.resources[] | select(.status == "statusInvalid") | {file: .filename, kind: .kind, error: (.validationErrors[0].msg // .msg)}' results.json
```

## Pre-commit Hook Integration

Create a pre-commit hook that validates manifests:

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "Validating Kubernetes manifests..."

# Find changed YAML files in k8s directory
changed_files=$(git diff --cached --name-only --diff-filter=ACM | grep '^k8s/.*\.yaml$')

if [ -z "$changed_files" ]; then
  exit 0
fi

# Validate changed files
echo "$changed_files" | xargs kubeconform -summary

if [ $? -ne 0 ]; then
  echo "Manifest validation failed. Please fix errors before committing."
  exit 1
fi

echo "Validation passed"
exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Validation Report Generation

Generate detailed validation reports:

```bash
#!/bin/bash
# generate-validation-report.sh

MANIFEST_DIR=$1
OUTPUT_FILE="validation-report.md"

echo "# Kubernetes Manifest Validation Report" > $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "Generated: $(date)" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Run validation and capture results
kubeconform -summary -output json $MANIFEST_DIR > results.json || true

# Parse results
valid=$(jq -r '.summary.valid' results.json)
invalid=$(jq -r '.summary.invalid' results.json)
errors=$(jq -r '.summary.errors' results.json)
skipped=$(jq -r '.summary.skipped' results.json)

echo "## Summary" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "- Valid: $valid" >> $OUTPUT_FILE
echo "- Invalid: $invalid" >> $OUTPUT_FILE
echo "- Errors: $errors" >> $OUTPUT_FILE
echo "- Skipped: $skipped" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# List invalid resources
if [ $invalid -gt 0 ]; then
  echo "## Invalid Resources" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
  jq -r '.resources[] | select(.status == "statusInvalid") | "### \(.filename)\n\n```\n\(.validationErrors[0].msg // .msg)\n```\n"' results.json >> $OUTPUT_FILE
fi

cat $OUTPUT_FILE
```

## Conclusion

Kubeconform provides fast, reliable validation of Kubernetes manifests against schemas, catching configuration errors before deployment. Integration into CI/CD pipelines creates validation gates that prevent invalid manifests from reaching clusters.

The cluster-independent validation approach makes testing fast, while support for custom CRD schemas ensures comprehensive validation across all resource types. This catches errors early when they're cheapest to fix.

For production workflows, validate manifests in pull requests before merge, test Helm charts with multiple values files, and generate validation reports that document manifest correctness for compliance and auditing purposes.
