# How to Set Up GitLab CI for Flux Manifest Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, GitLab CI, CI/CD, Validation

Description: Learn how to configure GitLab CI pipelines to validate Flux manifests automatically before they are merged into your main branch.

---

If your team uses GitLab for source control and Flux for GitOps, integrating manifest validation into your GitLab CI pipeline is essential. Catching broken YAML, invalid schemas, and misconfigured Kustomize overlays in merge requests prevents those errors from ever reaching your cluster.

This guide covers setting up a complete GitLab CI pipeline for Flux manifest validation.

## Prerequisites

You will need the following:

- A GitLab repository containing your Flux manifests
- GitLab CI/CD enabled for your project
- Familiarity with `.gitlab-ci.yml` syntax

## Basic Pipeline Configuration

Create a `.gitlab-ci.yml` file in your repository root:

```yaml
stages:
  - validate

variables:
  FLUX_VERSION: "2.2.0"
  KUBECONFORM_VERSION: "0.6.4"

validate-manifests:
  stage: validate
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl bash git
    - curl -s https://fluxcd.io/install.sh | FLUX_VERSION=${FLUX_VERSION} bash
    - curl -sSL "https://github.com/yannh/kubeconform/releases/download/v${KUBECONFORM_VERSION}/kubeconform-linux-amd64.tar.gz" | tar xz -C /usr/local/bin
  script:
    - flux check --pre
    - echo "Flux pre-checks passed"
  rules:
    - changes:
        - clusters/**/*
        - apps/**/*
        - infrastructure/**/*
```

The `rules` section ensures the pipeline only triggers when Flux-related files change, reducing unnecessary pipeline runs.

## Adding Schema Validation

Extend your pipeline with Kubernetes schema validation:

```yaml
schema-validation:
  stage: validate
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl bash
    - curl -sSL "https://github.com/yannh/kubeconform/releases/download/v${KUBECONFORM_VERSION}/kubeconform-linux-amd64.tar.gz" | tar xz -C /usr/local/bin
  script:
    - |
      find . -name '*.yaml' -not -path './.git/*' | \
        xargs kubeconform \
          -strict \
          -ignore-missing-schemas \
          -schema-location default \
          -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
          -summary
  rules:
    - changes:
        - clusters/**/*
        - apps/**/*
        - infrastructure/**/*
```

## Validating Kustomize Overlays

Add a job to verify all Kustomize overlays build correctly:

```yaml
kustomize-build:
  stage: validate
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl bash
    - curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
    - mv kustomize /usr/local/bin/
  script:
    - |
      find . -name 'kustomization.yaml' -not -path './.git/*' -exec dirname {} \; | while read dir; do
        echo "Building overlay: $dir"
        kustomize build "$dir" > /dev/null
        if [ $? -ne 0 ]; then
          echo "Failed to build: $dir"
          exit 1
        fi
        echo "OK: $dir"
      done
```

## YAML Linting

Add YAML linting as a separate job:

```yaml
yaml-lint:
  stage: validate
  image: python:3.12-slim
  before_script:
    - pip install yamllint
  script:
    - yamllint -c .yamllint.yml .
  allow_failure: true
  rules:
    - changes:
        - '**/*.yaml'
        - '**/*.yml'
```

Setting `allow_failure: true` means linting warnings will not block the merge request but will still be visible in the pipeline.

## Complete Pipeline

Here is the full `.gitlab-ci.yml` combining all jobs:

```yaml
stages:
  - validate

variables:
  FLUX_VERSION: "2.2.0"
  KUBECONFORM_VERSION: "0.6.4"

.flux-tools: &flux-tools
  image: alpine:3.19
  before_script:
    - apk add --no-cache curl bash git
    - curl -s https://fluxcd.io/install.sh | FLUX_VERSION=${FLUX_VERSION} bash
    - curl -sSL "https://github.com/yannh/kubeconform/releases/download/v${KUBECONFORM_VERSION}/kubeconform-linux-amd64.tar.gz" | tar xz -C /usr/local/bin
    - curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
    - mv kustomize /usr/local/bin/

flux-pre-check:
  stage: validate
  <<: *flux-tools
  script:
    - flux check --pre
  rules:
    - changes:
        - clusters/**/*
        - apps/**/*
        - infrastructure/**/*

schema-validation:
  stage: validate
  <<: *flux-tools
  script:
    - |
      find . -name '*.yaml' -not -path './.git/*' | \
        xargs kubeconform \
          -strict \
          -ignore-missing-schemas \
          -schema-location default \
          -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
          -summary
  rules:
    - changes:
        - clusters/**/*
        - apps/**/*
        - infrastructure/**/*

kustomize-build:
  stage: validate
  <<: *flux-tools
  script:
    - |
      find . -name 'kustomization.yaml' -not -path './.git/*' -exec dirname {} \; | while read dir; do
        echo "Building: $dir"
        kustomize build "$dir" > /dev/null || exit 1
      done
  rules:
    - changes:
        - clusters/**/*
        - apps/**/*
        - infrastructure/**/*

yaml-lint:
  stage: validate
  image: python:3.12-slim
  before_script:
    - pip install yamllint
  script:
    - yamllint -c .yamllint.yml .
  allow_failure: true
  rules:
    - changes:
        - '**/*.yaml'
        - '**/*.yml'
```

## Using GitLab Caching

Speed up pipeline execution by caching downloaded tools:

```yaml
.flux-tools: &flux-tools
  image: alpine:3.19
  cache:
    key: flux-tools
    paths:
      - .tool-cache/
  before_script:
    - mkdir -p .tool-cache
    - export PATH="$PWD/.tool-cache:$PATH"
    - |
      if [ ! -f .tool-cache/flux ]; then
        apk add --no-cache curl bash git
        curl -s https://fluxcd.io/install.sh | FLUX_VERSION=${FLUX_VERSION} bash
        cp /usr/local/bin/flux .tool-cache/
      fi
```

## Merge Request Integration

To enforce validation, go to your project settings and configure merge request approvals. Navigate to Settings, then Merge requests, and enable "Pipelines must succeed" under Merge checks. This prevents merging when any validation job fails.

## Adding Merge Request Comments

You can add pipeline results as comments on merge requests using GitLab CI artifacts:

```yaml
flux-pre-check:
  stage: validate
  <<: *flux-tools
  script:
    - flux check --pre 2>&1 | tee validation-report.txt
  artifacts:
    when: always
    paths:
      - validation-report.txt
    expire_in: 1 week
```

## Conclusion

GitLab CI provides a flexible platform for validating Flux manifests before they reach your clusters. By combining Flux pre-checks, schema validation, Kustomize build verification, and YAML linting into a single pipeline, you ensure that configuration errors are caught early in the development process. The use of YAML anchors and caching keeps the pipeline efficient and maintainable as your GitOps repository grows.
