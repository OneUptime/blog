# How to Implement Docker Image Compliance Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, compliance, security, image policies, OPA, vulnerability scanning, CI/CD

Description: Implement Docker image compliance policies using OPA, vulnerability scanners, and CI/CD gates to enforce security standards across your organization.

---

Running any Docker image from the internet in production is a recipe for security incidents. Organizations need guardrails - policies that control which images can run, what they must contain, and what they must not contain. Docker image compliance policies enforce these rules automatically, catching violations before they reach production.

This guide walks through building a compliance framework for Docker images. We will cover policy definition, automated scanning, CI/CD enforcement, and runtime admission control.

## Defining Your Compliance Policies

Start by deciding what your organization requires. Common Docker image compliance policies include:

- Images must come from approved registries only
- Base images must be from an approved list
- No critical or high CVEs allowed
- Images must not run as root
- Images must have specific labels (maintainer, version, team)
- No secrets or credentials baked into the image
- Only approved packages may be installed

Write these policies down in a format your team can reference. Then automate their enforcement.

## Policy Enforcement with Open Policy Agent (OPA)

OPA provides a flexible policy engine that evaluates Docker images against your rules. Write policies in Rego, OPA's policy language.

Create a policy file for image compliance:

```rego
# policy/docker_compliance.rego
# Defines compliance rules for Docker images

package docker.compliance

# Deny images from unapproved registries
deny[msg] {
    input.image
    not startswith(input.image, "registry.example.com/")
    not startswith(input.image, "docker.io/library/")
    msg := sprintf("Image '%s' is from an unapproved registry", [input.image])
}

# Deny images running as root
deny[msg] {
    input.config.User == ""
    msg := "Container must specify a non-root USER"
}

deny[msg] {
    input.config.User == "root"
    msg := "Container must not run as root"
}

# Require specific labels on all images
required_labels := {"maintainer", "version", "team"}

deny[msg] {
    label := required_labels[_]
    not input.config.Labels[label]
    msg := sprintf("Required label '%s' is missing", [label])
}

# Deny images with exposed privileged ports
deny[msg] {
    port := input.config.ExposedPorts[p]
    port_num := to_number(split(p, "/")[0])
    port_num < 1024
    port_num != 80
    port_num != 443
    msg := sprintf("Privileged port %d is exposed (only 80 and 443 allowed)", [port_num])
}
```

Test the policy against an image:

```bash
# Extract image configuration as JSON for OPA evaluation
docker inspect myapp:latest | jq '.[0] | {
    image: .RepoTags[0],
    config: {
        User: .Config.User,
        Labels: .Config.Labels,
        ExposedPorts: .Config.ExposedPorts,
        Env: .Config.Env
    }
}' > /tmp/image_input.json

# Evaluate the image against compliance policies
opa eval \
  --data policy/docker_compliance.rego \
  --input /tmp/image_input.json \
  "data.docker.compliance.deny"
```

## Vulnerability Scanning with Trivy

Trivy scans images for known vulnerabilities and can fail your pipeline when critical issues are found.

```bash
# Scan an image and fail if any critical or high vulnerabilities exist
trivy image \
  --severity CRITICAL,HIGH \
  --exit-code 1 \
  --format table \
  registry.example.com/myapp:latest
```

For more structured output that integrates with compliance tooling:

```bash
# Generate a JSON vulnerability report for automated processing
trivy image \
  --format json \
  --output /tmp/scan-results.json \
  registry.example.com/myapp:latest
```

Create a script that checks scan results against your policy thresholds:

```bash
#!/bin/bash
# check-vulnerabilities.sh
# Validates that an image meets vulnerability count thresholds

IMAGE="$1"
MAX_CRITICAL=0
MAX_HIGH=5

if [ -z "$IMAGE" ]; then
    echo "Usage: check-vulnerabilities.sh <image>"
    exit 1
fi

# Run the scan and capture JSON output
trivy image --format json --output /tmp/scan.json "$IMAGE" 2>/dev/null

# Count vulnerabilities by severity
CRITICAL=$(jq '[.Results[].Vulnerabilities[]? | select(.Severity=="CRITICAL")] | length' /tmp/scan.json)
HIGH=$(jq '[.Results[].Vulnerabilities[]? | select(.Severity=="HIGH")] | length' /tmp/scan.json)

echo "Scan results for $IMAGE:"
echo "  Critical: $CRITICAL (max allowed: $MAX_CRITICAL)"
echo "  High: $HIGH (max allowed: $MAX_HIGH)"

# Fail if thresholds are exceeded
if [ "$CRITICAL" -gt "$MAX_CRITICAL" ]; then
    echo "FAIL: Too many critical vulnerabilities"
    exit 1
fi

if [ "$HIGH" -gt "$MAX_HIGH" ]; then
    echo "FAIL: Too many high vulnerabilities"
    exit 1
fi

echo "PASS: Image meets vulnerability thresholds"
```

## Dockerfile Linting with Hadolint

Catch compliance issues at build time by linting Dockerfiles:

```bash
# Lint a Dockerfile for best practices and security issues
hadolint Dockerfile

# Use a custom configuration to enforce specific rules
hadolint --config hadolint.yaml Dockerfile
```

Create a Hadolint configuration that matches your compliance requirements:

```yaml
# hadolint.yaml
# Configuration for Dockerfile compliance checking

# Treat these rules as errors (will fail the build)
failure-threshold: error

# Override specific rule severities
override:
  error:
    - DL3002  # Last USER should not be root
    - DL3007  # Using latest is prone to errors
    - DL3008  # Pin versions in apt get install
    - DL3018  # Pin versions in apk add
  warning:
    - DL3003  # Use WORKDIR to switch to a directory
    - DL3009  # Delete apt-get lists after installing

# Approved base images
trustedRegistries:
  - registry.example.com
  - docker.io/library
```

## CI/CD Pipeline Integration

Bring all the compliance checks together in your CI/CD pipeline. Here is a GitHub Actions workflow:

```yaml
# .github/workflows/image-compliance.yml
# Runs compliance checks on every Docker image build

name: Docker Image Compliance

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Lint the Dockerfile before building
      - name: Lint Dockerfile
        uses: hadolint/hadolint-action@v3.1.0
        with:
          dockerfile: Dockerfile
          config: hadolint.yaml
          failure-threshold: error

      # Build the image
      - name: Build image
        run: docker build -t compliance-check:${{ github.sha }} .

      # Scan for vulnerabilities
      - name: Vulnerability scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: compliance-check:${{ github.sha }}
          format: table
          severity: CRITICAL,HIGH
          exit-code: 1

      # Check OPA policies
      - name: Policy evaluation
        run: |
          # Extract image metadata for policy evaluation
          docker inspect compliance-check:${{ github.sha }} | jq '.[0] | {
              image: .RepoTags[0],
              config: {
                  User: .Config.User,
                  Labels: .Config.Labels,
                  ExposedPorts: .Config.ExposedPorts
              }
          }' > /tmp/input.json

          # Run OPA policy check and fail on any violations
          VIOLATIONS=$(opa eval \
              --data policy/docker_compliance.rego \
              --input /tmp/input.json \
              --format raw \
              "data.docker.compliance.deny")

          if [ "$VIOLATIONS" != "[]" ]; then
              echo "Policy violations found:"
              echo "$VIOLATIONS" | jq .
              exit 1
          fi
```

## Runtime Admission Control

CI/CD gates catch issues during builds. But you also need runtime enforcement to prevent non-compliant images from running in production. If you use Kubernetes, OPA Gatekeeper handles this.

```yaml
# constraint-template.yaml
# Gatekeeper constraint template that only allows images from approved registries
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: allowedregistries
spec:
  crd:
    spec:
      names:
        kind: AllowedRegistries
      validation:
        openAPIV3Schema:
          type: object
          properties:
            registries:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package allowedregistries
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not any({r | r := input.parameters.registries[_]; startswith(container.image, r)})
          msg := sprintf("Image '%s' is from a non-approved registry", [container.image])
        }
```

Apply the constraint:

```yaml
# constraint.yaml
# Enforces that only images from approved registries can run
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: AllowedRegistries
metadata:
  name: approved-registries-only
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]
  parameters:
    registries:
      - "registry.example.com/"
      - "docker.io/library/"
```

## Compliance Reporting

Generate reports that auditors and management can review:

```bash
#!/bin/bash
# compliance-report.sh
# Generates a compliance report for all running containers

REPORT_FILE="/tmp/compliance-report-$(date +%Y%m%d).json"

echo '{"report_date": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "containers": [' > "$REPORT_FILE"

FIRST=true
# Iterate through all running containers and check compliance
for CONTAINER_ID in $(docker ps -q); do
    IMAGE=$(docker inspect --format '{{.Config.Image}}' "$CONTAINER_ID")
    NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER_ID" | sed 's/^\//')
    USER=$(docker inspect --format '{{.Config.User}}' "$CONTAINER_ID")
    LABELS=$(docker inspect --format '{{json .Config.Labels}}' "$CONTAINER_ID")

    # Run a quick vulnerability count
    VULN_COUNT=$(trivy image --format json "$IMAGE" 2>/dev/null | \
        jq '[.Results[]?.Vulnerabilities[]?] | length' 2>/dev/null || echo "scan_failed")

    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ',' >> "$REPORT_FILE"
    fi

    # Write container compliance data to the report
    cat >> "$REPORT_FILE" << EOF
  {
    "container": "$NAME",
    "image": "$IMAGE",
    "user": "$USER",
    "labels": $LABELS,
    "vulnerability_count": $VULN_COUNT,
    "compliant": $([ -n "$USER" ] && [ "$USER" != "root" ] && echo true || echo false)
  }
EOF
done

echo ']}' >> "$REPORT_FILE"
echo "Report generated: $REPORT_FILE"
```

## Summary

Docker image compliance is not a one-time setup. It requires policies defined clearly, automated enforcement at every stage (build, push, deploy, runtime), and regular auditing. Start with the basics: approved registries, vulnerability scanning, and non-root users. Then expand to labels, package allowlists, and secrets detection as your compliance program matures. The goal is to make non-compliant images impossible to deploy, not just difficult.
