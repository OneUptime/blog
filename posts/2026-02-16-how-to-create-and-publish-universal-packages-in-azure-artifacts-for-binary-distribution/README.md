# How to Create and Publish Universal Packages in Azure Artifacts for Binary Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Artifacts, Universal Packages, Binary Distribution, DevOps, Package Management, CI/CD

Description: Use Azure Artifacts Universal Packages to store, version, and distribute arbitrary binary files and build outputs across your organization.

---

Not everything fits neatly into npm, NuGet, or Maven. Sometimes you need to distribute compiled binaries, machine learning models, configuration bundles, or other artifacts that do not have a standard package manager. Azure Artifacts Universal Packages fill this gap. They let you publish any file or directory as a versioned package, download it in other pipelines or on developer machines, and manage it with the same feeds and permissions you use for your other packages.

This guide covers creating, publishing, downloading, and managing Universal Packages, with practical examples for common scenarios.

## What Are Universal Packages?

Universal Packages are Azure Artifacts' answer to "I need to store and version arbitrary files." Unlike npm or NuGet packages, which have specific formats and metadata requirements, Universal Packages are format-agnostic. You give them a name, a version, and a directory of files, and Azure Artifacts stores them.

Key characteristics:

- Up to 4 TB per package version
- Semantic versioning support
- Feed-level permissions (same as npm, NuGet, etc.)
- Available through Azure CLI and pipeline tasks
- Support for views (like @release, @prerelease) for promotion workflows

```mermaid
flowchart LR
    A[Build Pipeline] -->|Publish| B[Azure Artifacts Feed]
    B -->|Download| C[Release Pipeline]
    B -->|Download| D[Developer Machine]
    B -->|Download| E[Other Build Pipeline]
    subgraph Universal Package
        F[Binaries]
        G[Config Files]
        H[ML Models]
        I[Any Files]
    end
    A --> Universal Package --> B
```

## Prerequisites

You need:

1. An Azure DevOps organization with an Azure Artifacts feed
2. Azure CLI with the `azure-devops` extension installed
3. Permissions to publish to the feed (Contributor role or higher)

Install the required CLI extension:

```bash
# Install the Azure DevOps extension for Azure CLI
az extension add --name azure-devops

# Verify it is installed
az extension show --name azure-devops --query version
```

## Creating and Publishing a Universal Package

### From the Command Line

Let me walk through a complete example. Suppose you have a directory of compiled binaries that you want to distribute.

First, organize your files:

```bash
# Create the package directory structure
mkdir -p my-tool/bin
mkdir -p my-tool/config

# Copy your built artifacts into the package directory
cp build/output/mytool my-tool/bin/
cp build/output/mytool.dll my-tool/bin/
cp config/default.json my-tool/config/
```

Now publish it as a Universal Package:

```bash
# Publish the directory as a Universal Package
az artifacts universal publish \
  --organization "https://dev.azure.com/myorg" \
  --project "MyProject" \
  --scope project \
  --feed "shared-artifacts" \
  --name "my-tool" \
  --version "1.0.0" \
  --description "Compiled binaries and config for my-tool" \
  --path "./my-tool"
```

The `--path` flag points to the directory containing all the files you want to include. Everything in that directory becomes part of the package.

### From an Azure Pipeline

Here is a pipeline that builds an application and publishes it as a Universal Package:

```yaml
# Build and publish a Universal Package
trigger:
  branches:
    include:
      - main
  tags:
    include:
      - 'v*'

pool:
  vmImage: 'ubuntu-latest'

variables:
  # Use the build ID as the package version for non-tagged builds
  packageVersion: '0.0.$(Build.BuildId)'

steps:
  # Build the application
  - script: |
      mkdir -p output/bin
      mkdir -p output/config
      # Your build commands here
      dotnet publish -c Release -o output/bin
      cp config/*.json output/config/
    displayName: 'Build application'

  # Override version for tagged builds (e.g., v1.2.3 becomes 1.2.3)
  - script: |
      TAG=$(echo "$(Build.SourceBranch)" | sed 's|refs/tags/v||')
      echo "##vso[task.setvariable variable=packageVersion]$TAG"
    condition: startsWith(variables['Build.SourceBranch'], 'refs/tags/v')
    displayName: 'Set version from tag'

  # Publish as Universal Package
  - task: UniversalPackages@0
    inputs:
      command: 'publish'
      publishDirectory: 'output'
      feedsToUsePublish: 'internal'
      vstsFeedPublish: 'shared-artifacts'
      vstsFeedPackagePublish: 'my-tool'
      versionOption: 'custom'
      versionPublish: '$(packageVersion)'
    displayName: 'Publish Universal Package'
```

## Downloading Universal Packages

### From the Command Line

```bash
# Download a specific version of a Universal Package
az artifacts universal download \
  --organization "https://dev.azure.com/myorg" \
  --project "MyProject" \
  --scope project \
  --feed "shared-artifacts" \
  --name "my-tool" \
  --version "1.0.0" \
  --path "./downloaded-tool"
```

You can also download the latest version:

```bash
# Download the latest version using a wildcard
az artifacts universal download \
  --organization "https://dev.azure.com/myorg" \
  --project "MyProject" \
  --scope project \
  --feed "shared-artifacts" \
  --name "my-tool" \
  --version "*" \
  --path "./downloaded-tool"
```

### In a Pipeline

```yaml
# Download a Universal Package in a release pipeline
steps:
  - task: UniversalPackages@0
    inputs:
      command: 'download'
      downloadDirectory: '$(System.DefaultWorkingDirectory)/tool'
      feedsToUse: 'internal'
      vstsFeed: 'shared-artifacts'
      vstsFeedPackage: 'my-tool'
      vstsPackageVersion: '1.0.0'
    displayName: 'Download my-tool package'

  # Use the downloaded files
  - script: |
      chmod +x $(System.DefaultWorkingDirectory)/tool/bin/mytool
      $(System.DefaultWorkingDirectory)/tool/bin/mytool --version
    displayName: 'Verify downloaded tool'
```

## Version Management

Universal Packages use semantic versioning. Here are some patterns for versioning:

### Stable Releases

Follow semver strictly: `1.0.0`, `1.1.0`, `2.0.0`. Publish these from tagged commits in your release process.

### Development Builds

Use prerelease suffixes: `1.1.0-beta.1`, `1.1.0-rc.1`. Or use the build number: `0.0.142` where 142 is the CI build ID.

### Listing Available Versions

```bash
# List all versions of a package
az artifacts universal list \
  --organization "https://dev.azure.com/myorg" \
  --project "MyProject" \
  --scope project \
  --feed "shared-artifacts" \
  --name "my-tool" \
  --output table
```

## Using Views for Promotion

Azure Artifacts feeds have views that act as promotion stages. By default, you get `@local`, `@prerelease`, and `@release` views.

You can promote a package version to a view to indicate its maturity:

```bash
# Promote a package version to the release view
# This uses the Azure DevOps REST API
az rest --method patch \
  --url "https://pkgs.dev.azure.com/myorg/MyProject/_apis/packaging/feeds/shared-artifacts/upack/packages/my-tool/versions/1.0.0?api-version=7.0" \
  --body '{"views": {"op": "add", "path": "/views/-", "value": "@release"}}'
```

In your download steps, you can then reference a specific view:

```yaml
# Download only from the release view
- task: UniversalPackages@0
  inputs:
    command: 'download'
    downloadDirectory: '$(System.DefaultWorkingDirectory)/tool'
    feedsToUse: 'internal'
    vstsFeed: 'shared-artifacts'
    vstsFeedPackage: 'my-tool'
    vstsPackageVersion: '1.0.0'
    vstsFeedPackageVersion: '@release'
  displayName: 'Download released version'
```

## Practical Use Cases

### Distributing CLI Tools

If your team builds internal CLI tools, Universal Packages are a natural distribution mechanism:

```bash
# Build for multiple platforms
GOOS=linux GOARCH=amd64 go build -o dist/linux-amd64/mytool
GOOS=darwin GOARCH=amd64 go build -o dist/darwin-amd64/mytool
GOOS=windows GOARCH=amd64 go build -o dist/windows-amd64/mytool.exe

# Publish each platform as a separate package
for platform in linux-amd64 darwin-amd64 windows-amd64; do
    az artifacts universal publish \
      --organization "https://dev.azure.com/myorg" \
      --project "MyProject" \
      --scope project \
      --feed "shared-artifacts" \
      --name "mytool-$platform" \
      --version "1.0.0" \
      --path "./dist/$platform"
done
```

### Sharing ML Models

Data science teams can version and share trained models:

```yaml
# Pipeline that trains and publishes an ML model
steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.11'

  - script: |
      pip install -r requirements.txt
      python train.py --output model/
    displayName: 'Train model'

  - task: UniversalPackages@0
    inputs:
      command: 'publish'
      publishDirectory: 'model'
      feedsToUsePublish: 'internal'
      vstsFeedPublish: 'ml-models'
      vstsFeedPackagePublish: 'recommendation-engine'
      versionOption: 'custom'
      versionPublish: '$(Build.BuildNumber)'
    displayName: 'Publish trained model'
```

### Configuration Bundles

For distributing environment-specific configurations across multiple services:

```bash
# Package environment configs for distribution
az artifacts universal publish \
  --organization "https://dev.azure.com/myorg" \
  --project "Platform" \
  --scope project \
  --feed "platform-configs" \
  --name "production-config" \
  --version "2.1.0" \
  --path "./configs/production"
```

## Managing Package Retention

Universal Packages count toward your Azure Artifacts storage quota. To manage costs:

```bash
# Delete old package versions that are no longer needed
az artifacts universal delete \
  --organization "https://dev.azure.com/myorg" \
  --project "MyProject" \
  --scope project \
  --feed "shared-artifacts" \
  --name "my-tool" \
  --version "0.0.1"
```

You can also configure retention policies on the feed to automatically clean up old versions.

## Wrapping Up

Universal Packages are the catch-all solution for distributing files that do not fit into standard package managers. They give you versioning, access control, and integration with Azure Pipelines without requiring you to build custom storage solutions or manage shared file servers. Whether you are distributing compiled tools, ML models, or configuration bundles, Universal Packages provide a consistent, auditable distribution mechanism that fits naturally into your Azure DevOps workflows.
