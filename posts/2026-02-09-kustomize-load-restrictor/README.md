# How to configure Kustomize load restrictor for security constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Security

Description: Learn how to use Kustomize load restrictor settings to enforce security boundaries and prevent unauthorized file access during configuration builds.

---

Security-conscious organizations need to control what files Kustomize can access during builds. The load restrictor feature provides this control by limiting file system access to specific directories. This prevents malicious or accidental inclusion of sensitive files in your Kubernetes configurations.

Load restrictions are particularly important when building kustomizations from untrusted sources or in CI/CD pipelines where strict security boundaries matter. Understanding how to configure these restrictions helps you maintain secure build processes while preserving necessary flexibility.

## Understanding load restrictor levels

Kustomize supports several load restrictor modes that control file access:

- `LoadRestrictionsRootOnly`: Most restrictive, only allows loading files from the kustomization root
- `LoadRestrictionsNone`: No restrictions, allows loading any files
- Default behavior falls between these extremes

The restrictor prevents path traversal attacks and accidental exposure of sensitive files:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# This would fail with strict restrictions
resources:
- ../../../etc/passwd  # Path traversal attempt blocked
```

## Default load behavior

By default, Kustomize allows loading files within the kustomization root and its subdirectories:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ./deployment.yaml  # Allowed: same directory
- ./services/api.yaml  # Allowed: subdirectory
- ../base/common.yaml  # Allowed: parent if part of project
```

This default strikes a balance between security and usability for most projects.

## Enabling strict restrictions

Use the command-line flag to enforce strict restrictions:

```bash
kustomize build --load-restrictor LoadRestrictionsRootOnly .
```

With this mode, only files in the kustomization directory are accessible:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml  # Allowed
- service.yaml     # Allowed

# These would fail:
# - ../base/common.yaml  # Blocked: parent directory
# - /etc/config.yaml     # Blocked: absolute path
```

This mode works well for isolated deployments where all configuration lives in one directory.

## Disabling restrictions for flexibility

When you need maximum flexibility, disable restrictions:

```bash
kustomize build --load-restrictor LoadRestrictionsNone .
```

This allows accessing any file on the filesystem:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- /shared/configs/base.yaml
- ../../../common/resources.yaml
```

Use this mode carefully and only in trusted environments. Never disable restrictions when building kustomizations from untrusted sources.

## CI/CD pipeline security

Enforce restrictions in automated pipelines to prevent security issues:

```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build with restrictions
      run: |
        # Enforce strict restrictions
        kustomize build --load-restrictor LoadRestrictionsRootOnly \
          overlays/production | kubectl apply -f -
```

The strict mode prevents malicious commits from accessing sensitive files outside the project directory.

## Handling legitimate parent directory access

Many projects organize bases in parent directories. Structure your project to work with restrictions:

```
project/
├── base/
│   ├── kustomization.yaml
│   └── deployment.yaml
└── overlays/
    ├── production/
    │   └── kustomization.yaml
    └── staging/
        └── kustomization.yaml
```

From the project root, build with restrictions:

```bash
# Build from project root instead of overlay directory
cd project
kustomize build --load-restrictor LoadRestrictionsRootOnly overlays/production
```

This approach keeps restrictions enabled while accessing bases in parent directories.

## Configuring restrictions for remote bases

Remote bases bypass local file restrictions since they're fetched via HTTP/Git:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
# Remote bases work with any restriction level
- https://github.com/example/configs//base?ref=v1.0.0

# Local bases must follow restrictions
- ../../local-base
```

For projects using remote bases, strict local restrictions provide security without limiting functionality.

## Validating restriction compliance

Create tests that verify your kustomizations work with restrictions:

```bash
#!/bin/bash
# test-restrictions.sh

OVERLAYS=(
  "overlays/development"
  "overlays/staging"
  "overlays/production"
)

for overlay in "${OVERLAYS[@]}"; do
  echo "Testing $overlay with restrictions..."
  if kustomize build --load-restrictor LoadRestrictionsRootOnly "$overlay" > /dev/null; then
    echo "✓ $overlay passes restriction check"
  else
    echo "✗ $overlay violates restrictions"
    exit 1
  fi
done
```

Run this test in CI to catch restriction violations before deployment.

## Security best practices

Always use restrictions when building kustomizations from user-provided sources:

```bash
# Never do this with untrusted input:
kustomize build --load-restrictor LoadRestrictionsNone untrusted-repo/

# Instead:
kustomize build --load-restrictor LoadRestrictionsRootOnly untrusted-repo/
```

Even with restrictions, validate kustomization contents before applying to clusters. Restrictions prevent file access attacks but don't validate the resources themselves.

## Combining with other security measures

Layer restrictions with other security controls:

```bash
#!/bin/bash
# secure-build.sh

# 1. Verify kustomization signature
kustomize verify kustomization.yaml

# 2. Build with restrictions
OUTPUT=$(kustomize build --load-restrictor LoadRestrictionsRootOnly .)

# 3. Validate output
echo "$OUTPUT" | kubeval --strict

# 4. Check for sensitive data
if echo "$OUTPUT" | grep -i "password\|secret\|token"; then
  echo "Warning: Potential sensitive data detected"
  exit 1
fi

# 5. Apply to cluster
echo "$OUTPUT" | kubectl apply -f -
```

This defense-in-depth approach provides multiple layers of security.

## Handling third-party kustomizations

When using kustomizations from third parties, always enable restrictions:

```yaml
# consumer/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
# Third-party remote base with restrictions enforced locally
- https://github.com/thirdparty/configs//base?ref=v2.0.0
```

Build with restrictions to prevent the third-party kustomization from accessing your filesystem:

```bash
kustomize build --load-restrictor LoadRestrictionsRootOnly consumer/
```

## Restriction violations and debugging

When restrictions block legitimate access, the error message indicates the problem:

```
Error: security; file '/etc/config.yaml' is not in or below '/home/user/project'
```

To fix, either restructure your project to keep files within the kustomization root or adjust your build process to run from an appropriate directory.

## Multi-project repository structure

For monorepos with multiple projects, structure directories to work with restrictions:

```
monorepo/
├── shared/
│   └── bases/
│       └── webapp/
│           └── kustomization.yaml
└── projects/
    ├── project-a/
    │   └── overlays/
    └── project-b/
        └── overlays/
```

Build from the monorepo root:

```bash
cd monorepo
kustomize build --load-restrictor LoadRestrictionsRootOnly projects/project-a/overlays/production
```

This allows accessing shared bases while maintaining restrictions.

## Container-based builds

Run kustomize builds in containers with restricted filesystem access:

```dockerfile
FROM alpine:latest

RUN apk add --no-cache kustomize

WORKDIR /workspace

# Only /workspace is accessible
VOLUME /workspace

ENTRYPOINT ["kustomize", "build", "--load-restrictor", "LoadRestrictionsRootOnly"]
```

The container provides an additional isolation layer:

```bash
docker run -v $(pwd):/workspace kustomize-restricted overlays/production
```

## Policy enforcement

Enforce restrictions through policy tools:

```yaml
# OPA policy
package kustomize

deny[msg] {
  # Detect kustomize build without restrictions
  input.command == "kustomize build"
  not contains(input.args, "--load-restrictor")

  msg := "Kustomize builds must specify --load-restrictor"
}
```

Integrate this policy into CI/CD to prevent unrestricted builds.

## Documentation and training

Document your organization's restriction policy:

```markdown
# Kustomize Build Policy

## Required Restrictions

All kustomize builds MUST use `--load-restrictor LoadRestrictionsRootOnly` unless explicitly approved.

## Exceptions

Exception requests must include:
- Business justification
- Security review approval
- Alternative controls

## Enforcement

CI/CD pipelines automatically enforce restrictions. Manual builds are subject to audit.
```

Train developers on why restrictions matter and how to structure projects accordingly.

## Restriction levels for different environments

Use different restriction levels based on trust level:

```bash
#!/bin/bash
# build-for-env.sh

ENV=$1

case $ENV in
  production)
    RESTRICTOR="LoadRestrictionsRootOnly"
    ;;
  staging)
    RESTRICTOR="LoadRestrictionsRootOnly"
    ;;
  development)
    RESTRICTOR="LoadRestrictionsNone"
    ;;
  *)
    echo "Unknown environment: $ENV"
    exit 1
    ;;
esac

kustomize build --load-restrictor $RESTRICTOR overlays/$ENV
```

Development environments might allow flexibility while production enforces strict controls.

## Monitoring and alerting

Track restriction violations in your infrastructure:

```yaml
# Prometheus alert
- alert: KustomizeRestrictionViolation
  expr: |
    rate(kustomize_build_restriction_violations_total[5m]) > 0
  annotations:
    summary: "Kustomize restriction violation detected"
    description: "Build attempted to access restricted files"
```

Investigate violations promptly as they may indicate security issues.

## Future-proofing your configurations

Structure projects to work with the strictest restrictions by default:

```
project/
├── kustomization.yaml
├── base/
│   └── resources.yaml
└── overlays/
    └── production/
        ├── kustomization.yaml
        └── patches.yaml
```

This structure works with all restriction levels, giving you flexibility to tighten security without refactoring.

## Conclusion

Kustomize load restrictors provide essential security controls for configuration builds. By limiting filesystem access, they prevent path traversal attacks and accidental exposure of sensitive files. Understanding how to configure and enforce restrictions helps you maintain secure CI/CD pipelines while preserving necessary flexibility.

Use strict restrictions as your default, especially in production and automated environments. Structure projects to work within these constraints by keeping related files together and using remote bases for shared configurations. Combined with other security measures like validation and policy enforcement, load restrictors form a critical part of your Kubernetes security posture.
