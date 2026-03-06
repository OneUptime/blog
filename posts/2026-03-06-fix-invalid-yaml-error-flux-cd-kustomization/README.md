# How to Fix "invalid YAML" Error in Flux CD Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, YAML, Kustomization, Linting, Validation, GitOps, Troubleshooting, Kubernetes

Description: A hands-on guide to diagnosing and fixing invalid YAML errors in Flux CD Kustomizations, covering syntax issues, indentation problems, and validation tools.

---

## Introduction

YAML syntax errors are one of the most frustrating issues in Kubernetes and GitOps workflows. A single misplaced character, wrong indentation level, or accidental tab character can cause your entire Flux CD Kustomization to fail. This guide covers how to identify, fix, and prevent YAML errors in your Flux-managed repositories.

## Identifying the Error

Check the Kustomization status:

```bash
# List all Kustomizations and their readiness
kubectl get kustomizations -A

# Get the detailed error message
kubectl describe kustomization <name> -n flux-system
```

Typical error messages:

```
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: BuildFailed
      Message: "kustomize build failed: accumulating resources: yaml: line 15: did not find expected key"
```

Or:

```
Message: "yaml: line 23: mapping values are not allowed in this context"
```

Check the kustomize-controller logs:

```bash
kubectl logs -n flux-system deploy/kustomize-controller --tail=100 | grep -i "yaml\|build\|error"
```

## Cause 1: Indentation Errors

YAML is whitespace-sensitive, and incorrect indentation is the most common cause of syntax errors.

### Common Indentation Mistakes

```yaml
# WRONG: Inconsistent indentation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
   namespace: default    # Error: 3 spaces instead of 2
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: my-app
        image: my-app:latest
         ports:            # Error: 9 spaces instead of 8
         - containerPort: 80
```

```yaml
# CORRECT: Consistent 2-space indentation throughout
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 80
```

## Cause 2: Tabs Instead of Spaces

YAML does not allow tabs for indentation. Tabs are a common source of errors when copying from other file formats or using editors without proper YAML settings.

### Detecting Tabs

```bash
# Find files containing tabs in your repository
grep -rn $'\t' --include="*.yaml" --include="*.yml" .

# Show tab characters visually
cat -A deployment.yaml | grep "\\^I"
```

### Fix: Convert Tabs to Spaces

```bash
# Replace tabs with 2 spaces in a single file
sed -i '' 's/\t/  /g' deployment.yaml

# Replace tabs in all YAML files recursively
find . -name "*.yaml" -o -name "*.yml" | xargs sed -i '' 's/\t/  /g'
```

### Fix: Configure Your Editor

For VS Code, add to your settings:

```json
{
  "[yaml]": {
    "editor.insertSpaces": true,
    "editor.tabSize": 2,
    "editor.autoIndent": "advanced",
    "editor.detectIndentation": false
  }
}
```

## Cause 3: Multi-Line String Errors

YAML has multiple ways to handle multi-line strings, and using the wrong one or incorrect indentation within them causes errors.

### Common Multi-Line String Mistakes

```yaml
# WRONG: Content not indented under the block scalar
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  config.yaml: |
server:
  port: 8080
database:
  host: localhost
```

```yaml
# CORRECT: Content indented under the block scalar indicator
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  config.yaml: |
    server:
      port: 8080
    database:
      host: localhost
```

### Block Scalar Reference

```yaml
# Literal block scalar (preserves newlines)
data:
  script.sh: |
    #!/bin/bash
    echo "Hello World"
    exit 0

# Folded block scalar (folds newlines into spaces)
data:
  description: >
    This is a long description
    that will be folded into
    a single line.

# Literal block scalar with chomp indicator (strips trailing newlines)
data:
  config: |-
    key: value
    another: value
```

## Cause 4: Special Characters Not Quoted

Certain characters in YAML have special meaning and must be quoted when used as values.

### Characters That Need Quoting

```yaml
# WRONG: Unquoted special characters
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  # These will all cause parse errors or unexpected behavior
  message: This has a : colon in it
  pattern: *.yaml
  boolean_trap: yes
  version: 1.0
  port_string: 8080
```

```yaml
# CORRECT: Properly quoted values
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  # Quote strings containing colons
  message: "This has a : colon in it"
  # Quote glob patterns
  pattern: "*.yaml"
  # Quote strings that YAML would interpret as booleans
  boolean_trap: "yes"
  # Quote to force string type
  version: "1.0"
  # Quote to ensure string type for port numbers
  port_string: "8080"
```

### Common YAML Boolean Traps

These values are interpreted as booleans in YAML 1.1 (used by Kubernetes):

```yaml
# All of these are interpreted as boolean true
values_that_are_true:
  - true
  - True
  - TRUE
  - yes
  - Yes
  - YES
  - on
  - On
  - ON

# All of these are interpreted as boolean false
values_that_are_false:
  - false
  - False
  - FALSE
  - "no"   # Must quote "no" if you mean the string
  - "No"
  - "off"
```

## Cause 5: Duplicate Keys

YAML does not allow duplicate keys at the same level, but some parsers silently accept them, leading to unpredictable behavior.

```yaml
# WRONG: Duplicate keys
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  name: my-other-config  # Duplicate key - second value wins silently
data:
  key1: value1
  key1: value2            # Duplicate key in data
```

```yaml
# CORRECT: Unique keys
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
data:
  key1: value1
  key2: value2
```

## Cause 6: Invalid Document Separators

When using multiple YAML documents in a single file, the separator must be exactly three dashes.

```yaml
# WRONG: Invalid separators
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
----                      # Error: four dashes
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: my-app
```

```yaml
# CORRECT: Exactly three dashes
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config
  namespace: my-app
```

## Prevention: Validation Tools

### Tool 1: yamllint

Install and configure yamllint for your repository:

```bash
# Install yamllint
pip install yamllint

# Run yamllint on your manifests
yamllint -d relaxed apps/my-app/
```

Create a configuration file for Kubernetes-friendly linting:

```yaml
# .yamllint.yaml
extends: default
rules:
  # Allow long lines for Kubernetes manifests
  line-length:
    max: 200
    allow-non-breakable-inline-mappings: true
  # Require consistent indentation
  indentation:
    spaces: 2
    indent-sequences: true
  # Disallow duplicate keys
  key-duplicates: enable
  # Require consistent truthy values
  truthy:
    allowed-values: ["true", "false"]
    check-keys: false
```

### Tool 2: kubeconform

Validate against Kubernetes schemas:

```bash
# Install kubeconform
go install github.com/yannh/kubeconform/cmd/kubeconform@latest

# Validate Kubernetes manifests
kubeconform -strict -summary apps/my-app/

# Validate with custom resource schemas
kubeconform -strict \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  apps/my-app/
```

### Tool 3: kustomize build (Local Testing)

Test your kustomization locally before pushing:

```bash
# Build the kustomization to catch errors before Flux sees them
kustomize build apps/my-app/

# Build and validate in one step
kustomize build apps/my-app/ | kubeconform -strict -summary
```

### Tool 4: Pre-Commit Hooks

Set up pre-commit hooks to catch YAML errors before they reach your repository:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.35.0
    hooks:
      - id: yamllint
        args: [-d, relaxed]

  - repo: https://github.com/yannh/kubeconform
    rev: v0.6.4
    hooks:
      - id: kubeconform
        args: [-strict, -summary]
```

Install and run:

```bash
# Install pre-commit
pip install pre-commit

# Install the hooks
pre-commit install

# Run manually on all files
pre-commit run --all-files
```

## CI Pipeline Validation

Add YAML validation to your CI pipeline to catch errors before they merge:

```yaml
# .github/workflows/validate.yaml
name: Validate Manifests
on:
  pull_request:
    paths:
      - "**.yaml"
      - "**.yml"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          pip install yamllint
          go install github.com/yannh/kubeconform/cmd/kubeconform@latest

      - name: Lint YAML
        run: yamllint -d relaxed .

      - name: Validate Kubernetes manifests
        run: |
          find . -name "*.yaml" -not -path "./.github/*" | \
            xargs kubeconform -strict -summary
```

## Quick Troubleshooting Commands

```bash
# 1. Validate YAML syntax
python3 -c "import yaml; yaml.safe_load(open('file.yaml'))"

# 2. Find tabs in YAML files
grep -rPn '\t' --include="*.yaml" .

# 3. Build kustomization locally to test
kustomize build ./apps/my-app/ 2>&1

# 4. Check Flux build errors
kubectl describe kustomization <name> -n flux-system | grep -A 5 "Message"

# 5. Validate a single file with yamllint
yamllint -d relaxed file.yaml

# 6. Force reconciliation after fixing YAML
flux reconcile kustomization <name> --with-source
```

## Summary

Invalid YAML errors in Flux CD are caused by syntax issues such as incorrect indentation, tabs instead of spaces, unquoted special characters, or malformed multi-line strings. The best defense is prevention: use yamllint and kubeconform in pre-commit hooks and CI pipelines, test kustomization builds locally before pushing, and configure your editor to use spaces for YAML files. When errors do occur, the Kustomization status message usually includes the line number, making it straightforward to locate and fix the problem.
