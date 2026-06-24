# How to Package and Publish Rancher Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Extension, UI

Description: A step-by-step guide to packaging and publishing custom Rancher UI extensions to an OCI registry or Helm chart repository.

## Introduction

Rancher Extensions allow teams to extend the Rancher UI with custom dashboards, widgets, and workflows. Once you've built an extension, the next step is packaging it into a distributable artifact and publishing it so other Rancher instances can install it. This guide walks through the full packaging and publishing workflow for both a public Helm chart repository and an Extension Catalog Image (ECI).

## Prerequisites

- Node.js v20 and Yarn installed
- A working Rancher Extension project scaffolded with `@rancher/extension` (which uses `@rancher/shell` under the hood)
- Access to a public GitHub repository for Helm chart publication or a container registry reachable from your cluster for an Extension Catalog Image
- `helm` CLI v3+ installed

## Understanding Rancher Extension Artifacts

A Rancher Extension is typically distributed as a Helm chart that bundles your compiled UI assets. Rancher also supports publishing an Extension Catalog Image (ECI), which packages the extension charts and assets into a container image for private or air-gapped use cases.

## Step 1: Build the Extension

Navigate to your extension project and compile the production assets.

```bash
# Install dependencies

yarn install

# Build the extension for production
yarn build-pkg <your-extension-name>

# The compiled output lands in dist-pkg/<your-extension-name>/
ls dist-pkg/
```

## Step 2: Package into a Helm Chart

Rancher provides a helper script to generate the Helm chart assets and repository metadata for a public GitHub repository branch.

```bash
# Run the packaging script declared in your extension's package.json
yarn publish-pkgs -s <github-org>/<github-repo> -b <branch>

# Example targeting a gh-pages branch
yarn publish-pkgs -s my-org/my-extension-repo -b gh-pages
```

This script:
1. Bundles each extension package and creates the Helm charts plus `index.yaml`.
2. Uses the extension package version from `./pkg/<package-name>/package.json`.
3. Writes the generated repository contents to `tmp/` for publication to a public GitHub branch.

## Step 3: Authenticate to Your Registry

```bash
# Authenticate to GitHub Container Registry for the ECI flow
echo $GITHUB_PAT | docker login ghcr.io -u <github-username> --password-stdin

# Authenticate to Docker Hub for the ECI flow
echo $DOCKERHUB_TOKEN | docker login -u <dockerhub-username> --password-stdin
```

## Step 4: Build and Push an Extension Catalog Image (Optional)

```bash
# Build the catalog image
yarn publish-pkgs -c -r <registry-hostname> -o <registry-org>

# Build and push the catalog image
yarn publish-pkgs -c -p -r ghcr.io -o my-org
```

This path creates an Extension Catalog Image (ECI) for registry-based distribution rather than publishing a Helm chart repository.

## Step 5: Publish the Generated Helm Repository (Optional)

If you are publishing the Helm chart path, `publish-pkgs` already generated the repository structure and `index.yaml` inside `tmp/`. Commit that output to a public GitHub branch such as `gh-pages`:

```bash
# Commit the generated repository contents
git add ./tmp/*
git commit -m "Add extension charts"
git push origin gh-pages
```

## Step 6: Install the Extension in Rancher

1. Log in to Rancher as an administrator.
2. If you published a Helm repository, go to **Extensions** → **⋮** → **Manage Repositories** → **Create**, then enter the Git repository URL and branch that host your published extension charts.
3. If you published an ECI, go to **Extensions** → **⋮** → **Manage Extension Catalogs** → **Import Extension Catalog**, then enter the catalog image reference.
4. Return to the **Available** tab and click **Install** next to your extension.

## Automating with GitHub Actions

```yaml
# .github/workflows/build-catalog.yaml
name: Build and Release Extension Catalog

on:
  workflow_dispatch:
  release:
    types: [released]

defaults:
  run:
    shell: bash
    working-directory: ./

jobs:
  build-extension-catalog:
    uses: rancher/dashboard/.github/workflows/build-extension-catalog.yml@master
    permissions:
      actions: write
      contents: read
      packages: write
    with:
      registry_target: ghcr.io
      registry_user: ${{ github.actor }}
      tagged_release: ${{ github.ref_name }}
    secrets:
      registry_token: ${{ secrets.GITHUB_TOKEN }}
```

## Versioning Best Practices

- Follow **Semantic Versioning** (`MAJOR.MINOR.PATCH`).
- Bump `./pkg/<package-name>/package.json` for Helm chart releases. For an ECI release, the root `package.json` version is used.
- When using Rancher's reusable workflows, create a tagged GitHub Release whose name matches the artifact you are building: `<package-folder>-<version>` for extension charts, or `<extension-name>-<version>` for an ECI.

## Conclusion

Packaging and publishing Rancher Extensions involves building your UI assets, then either publishing the generated Helm repository contents to a public GitHub branch or building an Extension Catalog Image for a container registry. Once the repository or catalog image has been added in Rancher, the extension can be installed from the Extensions page. Automating this process with GitHub Actions ensures consistent, reproducible releases with minimal manual intervention.
