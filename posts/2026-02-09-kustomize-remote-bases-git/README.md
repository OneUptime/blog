# How to configure Kustomize with remote bases from Git repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, Git

Description: Learn how to use remote Git repositories as Kustomize bases for sharing configurations across teams and projects while maintaining version control and reusability.

---

Kustomize bases don't have to live in your local filesystem. You can reference bases directly from Git repositories, enabling configuration sharing across teams and projects. This capability turns Kustomize into a powerful tool for building reusable Kubernetes configuration libraries that multiple applications can consume.

Remote bases work particularly well for platform teams that maintain standard configurations for common components. Instead of copying manifests between projects, teams can reference a canonical source that receives updates and improvements centrally.

## Basic remote base syntax

Reference a Git repository using a URL in the bases or resources field:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- https://github.com/example/k8s-configs//base/webapp?ref=v1.2.0
```

This syntax has three parts: the repository URL, the path within the repository (after //), and an optional ref parameter for specifying branches, tags, or commits.

## Specifying versions with ref parameter

Always use the ref parameter to pin to specific versions:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Using a Git tag
resources:
- https://github.com/example/k8s-configs//base/webapp?ref=v1.2.0

# Using a branch
resources:
- https://github.com/example/k8s-configs//base/webapp?ref=main

# Using a commit SHA
resources:
- https://github.com/example/k8s-configs//base/webapp?ref=abc123def456
```

Production deployments should use tags or commit SHAs for stability. Development environments might reference branches to automatically pick up the latest changes.

## Building a shared configuration repository

Structure a repository to provide reusable bases:

```
k8s-configs/
├── README.md
├── bases/
│   ├── webapp/
│   │   ├── kustomization.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── worker/
│   │   ├── kustomization.yaml
│   │   └── deployment.yaml
│   └── database/
│       ├── kustomization.yaml
│       ├── statefulset.yaml
│       └── service.yaml
└── components/
    ├── monitoring/
    └── logging/
```

Each base directory contains a complete kustomization that others can reference:

```yaml
# bases/webapp/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml

commonLabels:
  app.kubernetes.io/component: webapp
```

## Consuming remote bases

Applications reference these bases and customize them:

```yaml
# my-app/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- https://github.com/example/k8s-configs//bases/webapp?ref=v1.2.0

namespace: production

images:
- name: webapp
  newName: registry.example.com/my-webapp
  newTag: v2.1.0

replicas:
- name: webapp-deployment
  count: 10
```

Your application gets all the standard configurations from the remote base and applies environment-specific customizations on top.

## Using multiple remote bases

Combine bases from different repositories:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
# Platform team's standard webapp base
- https://github.com/platform/configs//bases/webapp?ref=v1.0.0

# Security team's standard security policies
- https://github.com/security/policies//network-policies?ref=v2.1.0

# Monitoring team's standard observability stack
- https://github.com/monitoring/configs//prometheus-servicemonitor?ref=v1.5.0

namespace: my-app
```

This composition approach lets different teams contribute their expertise while applications assemble the pieces they need.

## Working with private repositories

For private repositories, Kustomize uses your Git credentials. Configure authentication through SSH keys or credential helpers:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
# Using SSH URL for private repo
- git@github.com:example/private-configs//bases/webapp?ref=v1.0.0
```

Ensure your SSH key is available when running kustomize build. In CI/CD pipelines, use deploy keys or machine credentials:

```yaml
# .github/workflows/deploy.yml
- name: Configure Git credentials
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.DEPLOY_KEY }}" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh-keyscan github.com >> ~/.ssh/known_hosts

- name: Build and deploy
  run: |
    kustomize build overlays/production | kubectl apply -f -
```

## Caching remote bases

Kustomize caches remote bases in ~/.kustomize/cache by default. This speeds up repeated builds and enables offline work:

```bash
# View cache contents
ls ~/.kustomize/cache

# Clear cache if needed
rm -rf ~/.kustomize/cache
```

The cache respects ref parameters, so using commit SHAs ensures consistent builds even if the remote repository changes.

## Versioning strategy for shared bases

Maintain clear versioning for shared configuration repositories:

```yaml
# v1.0.0 - Initial release
# v1.1.0 - Added health check probes
# v1.2.0 - Updated resource limits
# v2.0.0 - Breaking: Changed label schema

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml
```

Use semantic versioning and document breaking changes. Consumers can upgrade at their own pace by updating their ref parameter.

## Creating components for optional features

Use Kustomize components for optional functionality:

```yaml
# components/tls/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

patches:
- target:
    kind: Ingress
  patch: |-
    - op: add
      path: /spec/tls
      value:
      - hosts:
        - example.com
        secretName: tls-cert
```

Consumers can optionally include components:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- https://github.com/example/configs//bases/webapp?ref=v1.0.0

components:
- https://github.com/example/configs//components/tls?ref=v1.0.0
```

Components provide opt-in functionality without cluttering the base configuration.

## Testing remote base changes

Before releasing new versions of shared bases, test them with actual consumer repositories:

```bash
#!/bin/bash
# test-base-update.sh

# Test against known consumers
CONSUMERS=(
  "team-a/app1"
  "team-b/app2"
  "team-c/app3"
)

for consumer in "${CONSUMERS[@]}"; do
  echo "Testing $consumer..."
  git clone https://github.com/$consumer test-$consumer
  cd test-$consumer

  # Temporarily point to your branch
  sed -i 's|?ref=v1.0.0|?ref=my-feature-branch|g' overlays/*/kustomization.yaml

  # Try building
  for overlay in overlays/*; do
    if kustomize build $overlay > /dev/null; then
      echo "✓ $consumer/$overlay builds successfully"
    else
      echo "✗ $consumer/$overlay failed to build"
      exit 1
    fi
  done

  cd ..
  rm -rf test-$consumer
done
```

This validation catches breaking changes before they affect consumers.

## Documentation for shared bases

Maintain comprehensive documentation in shared repositories:

```markdown
# Webapp Base Configuration

## Usage

```yaml
resources:
- https://github.com/example/configs//bases/webapp?ref=v1.2.0
```

## Customization Points

- `namespace`: Set target namespace
- `images`: Override webapp image
- `replicas`: Adjust replica count
- `commonLabels`: Add additional labels

## Example

See [examples/basic-usage](./examples/basic-usage) for a complete example.

## Changelog

### v1.2.0 (2026-02-09)
- Added resource limits
- Updated health check intervals

### v1.1.0 (2026-01-15)
- Added liveness and readiness probes
```

Good documentation reduces support burden and helps teams adopt your shared configurations.

## Handling breaking changes

When making breaking changes, increment the major version and maintain backward compatibility:

```
k8s-configs/
├── bases/
│   ├── webapp-v1/  # Legacy version
│   │   └── kustomization.yaml
│   └── webapp-v2/  # New version with breaking changes
│       └── kustomization.yaml
```

Consumers can migrate at their own pace:

```yaml
# Legacy consumers
resources:
- https://github.com/example/configs//bases/webapp-v1?ref=v1.5.0

# Migrated consumers
resources:
- https://github.com/example/configs//bases/webapp-v2?ref=v2.0.0
```

## Governance and ownership

Establish clear ownership of shared configuration repositories:

```yaml
# CODEOWNERS
bases/webapp/          @platform-team
bases/database/        @platform-team @dba-team
components/monitoring/ @observability-team
components/security/   @security-team
```

Use pull request reviews and CI checks to maintain quality standards. Run validation tests on every change:

```yaml
# .github/workflows/validate.yml
name: Validate Configurations

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Validate all bases
      run: |
        for base in bases/*/; do
          echo "Validating $base..."
          kustomize build $base | kubeval --strict
        done
```

## Performance considerations

Loading remote bases adds latency to builds. For large configurations or slow networks, consider:

```yaml
# Option 1: Vendor remote bases locally
# Run: kustomize build --load-restrictor=LoadRestrictionsNone \
#        --enable-helm \
#        --output /tmp/vendored \
#        https://github.com/example/configs//bases/webapp?ref=v1.0.0

# Option 2: Use Git submodules
# git submodule add https://github.com/example/configs vendor/k8s-configs

resources:
- vendor/k8s-configs/bases/webapp
```

Vendoring trades freshness for speed and reliability in environments with limited internet access.

## Best practices for remote bases

Pin production deployments to specific tags or commit SHAs. This prevents unexpected changes from breaking your deployments.

Version your shared bases semantically. Clear version numbers help consumers understand the impact of updates.

Keep bases focused and composable. Small, single-purpose bases are easier to maintain and combine than large monolithic ones.

Test bases with multiple consumers before releasing. Breaking changes in widely-used bases can affect many teams.

Document customization points clearly. Consumers need to know which fields they should override and which they shouldn't touch.

## Conclusion

Remote Git bases transform Kustomize from a local configuration tool into a platform for sharing and reusing Kubernetes configurations across teams and projects. By maintaining shared configuration repositories with clear versioning and documentation, platform teams can provide standards that application teams can adopt and customize.

This approach reduces duplication, improves consistency, and enables platform teams to push improvements to all consumers simultaneously. When combined with proper governance, testing, and versioning practices, remote bases become a powerful tool for scaling Kubernetes configuration management across large organizations.
