# How to Set Up Azure Pipelines Multi-Repository Triggers for Cross-Repo Build Coordination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Multi-Repo, CI/CD, Build Triggers, Cross-Repository, DevOps, Monorepo

Description: Learn how to configure Azure Pipelines multi-repository triggers to coordinate builds across multiple repositories when changes affect shared dependencies.

---

Modern software systems rarely live in a single repository. You might have a shared library in one repo, a frontend in another, a backend API in a third, and infrastructure templates in a fourth. When someone updates the shared library, you want the frontend and backend pipelines to trigger automatically. Azure Pipelines multi-repository triggers make this possible without resorting to webhook gymnastics or custom orchestration scripts.

Multi-repo triggers let a single pipeline monitor changes across several repositories and trigger builds when any of them change. The pipeline checks out code from all specified repositories and can use resources from each of them during the build process.

## The Basic Multi-Repo Setup

At its simplest, a multi-repo pipeline declares additional repositories as resources and optionally sets up triggers on them.

```yaml
# azure-pipelines.yml - Pipeline that monitors two repositories
# This pipeline lives in the "frontend" repo but also watches "shared-lib"

trigger:
  branches:
    include:
      - main
  paths:
    include:
      - src/**

# Declare additional repositories as resources
resources:
  repositories:
    - repository: sharedLib
      type: git
      name: MyProject/shared-library  # project/repo format for Azure Repos
      trigger:
        branches:
          include:
            - main
        paths:
          include:
            - src/**

    - repository: configs
      type: git
      name: MyProject/deployment-configs
      trigger:
        branches:
          include:
            - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Check out the primary repository (automatic)
  - checkout: self
    displayName: 'Checkout frontend repo'

  # Check out the shared library repository
  - checkout: sharedLib
    displayName: 'Checkout shared library'

  # Check out the configs repository
  - checkout: configs
    displayName: 'Checkout deployment configs'

  # Now all three repos are available on the agent
  - script: |
      echo "Frontend code is in: $(Build.SourcesDirectory)/frontend"
      echo "Shared library is in: $(Build.SourcesDirectory)/shared-library"
      echo "Configs are in: $(Build.SourcesDirectory)/deployment-configs"
      ls -la $(Build.SourcesDirectory)/
    displayName: 'List checked out repositories'
```

When a commit lands on `main` in either the frontend repo (self), the shared-library repo, or the deployment-configs repo, this pipeline triggers. The pipeline checks out all three and can use code from any of them.

## Understanding Trigger Sources

When a multi-repo pipeline runs, it is useful to know which repository triggered the build. Azure Pipelines provides the `Build.Repository.Name` variable for the self repository, but for multi-repo triggers, you need `Build.Reason` and the resources context.

```yaml
steps:
  # Determine which repository triggered the build
  - script: |
      echo "Build Reason: $(Build.Reason)"
      echo "Triggered Repository: $(Build.Repository.Name)"
      echo "Triggered Branch: $(Build.SourceBranch)"

      # For resource-triggered builds, check the triggering repository
      if [ "$(Build.Reason)" = "ResourceTrigger" ]; then
        echo "This build was triggered by a change in a repository resource"
        echo "Resource trigger info: $(resources.triggeringAlias)"
      fi
    displayName: 'Identify trigger source'
```

## Cross-Repo Build with Conditional Steps

A common pattern is running different build steps depending on which repository triggered the pipeline. For example, if the shared library changed, you want to rebuild and test it before building the dependent applications.

```yaml
# azure-pipelines.yml - Conditional build based on trigger source

trigger:
  branches:
    include:
      - main

resources:
  repositories:
    - repository: sharedLib
      type: git
      name: MyProject/shared-library
      trigger:
        branches:
          include:
            - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  # Always build the shared library first
  - stage: BuildSharedLib
    displayName: 'Build Shared Library'
    jobs:
      - job: BuildLib
        steps:
          - checkout: sharedLib

          - task: DotNetCoreCLI@2
            displayName: 'Build shared library'
            inputs:
              command: 'build'
              projects: 'shared-library/**/*.csproj'
              arguments: '--configuration Release'

          - task: DotNetCoreCLI@2
            displayName: 'Test shared library'
            inputs:
              command: 'test'
              projects: 'shared-library/**/*Tests.csproj'

          - task: DotNetCoreCLI@2
            displayName: 'Pack NuGet package'
            inputs:
              command: 'pack'
              packagesToPack: 'shared-library/**/SharedLib.csproj'
              versioningScheme: 'byBuildNumber'

          - task: NuGetCommand@2
            displayName: 'Push to feed'
            inputs:
              command: 'push'
              publishVstsFeed: 'internal-packages'

  # Build the frontend app using the latest shared library
  - stage: BuildFrontend
    displayName: 'Build Frontend Application'
    dependsOn: BuildSharedLib
    jobs:
      - job: BuildApp
        steps:
          - checkout: self

          - task: DotNetCoreCLI@2
            displayName: 'Restore with latest shared lib'
            inputs:
              command: 'restore'
              projects: '**/*.csproj'
              feedsToUse: 'select'
              vstsFeed: 'internal-packages'

          - task: DotNetCoreCLI@2
            displayName: 'Build frontend'
            inputs:
              command: 'build'
              projects: '**/*.csproj'
              arguments: '--configuration Release'

          - task: DotNetCoreCLI@2
            displayName: 'Run frontend tests'
            inputs:
              command: 'test'
              projects: '**/*Tests.csproj'
```

## Using GitHub Repositories

Multi-repo triggers work with GitHub repositories too, not just Azure Repos. The syntax changes slightly.

```yaml
# Pipeline that watches both Azure Repos and GitHub repositories

resources:
  repositories:
    - repository: githubShared
      type: github
      name: 'your-org/shared-components'
      endpoint: 'GitHub-Service-Connection'  # Name of your GitHub service connection
      trigger:
        branches:
          include:
            - main
            - release/*

    - repository: azureConfigs
      type: git
      name: 'MyProject/config-repo'
      trigger:
        branches:
          include:
            - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - checkout: self
  - checkout: githubShared
  - checkout: azureConfigs

  - script: |
      # GitHub repos are checked out into a directory named after the repo
      ls -la $(Build.SourcesDirectory)/
    displayName: 'Verify checkouts'
```

You need a GitHub service connection configured in your Azure DevOps project settings for this to work. The service connection handles authentication to the GitHub repository.

## Path Filters for Precise Triggering

Path filters on multi-repo triggers prevent unnecessary builds. If the shared library repo also contains documentation or CI configuration that does not affect the library output, you can exclude those paths.

```yaml
resources:
  repositories:
    - repository: sharedLib
      type: git
      name: MyProject/shared-library
      trigger:
        branches:
          include:
            - main
        paths:
          include:
            - src/**        # Only trigger on source code changes
            - tests/**      # Also trigger on test changes
          exclude:
            - docs/**       # Ignore documentation changes
            - .github/**    # Ignore CI config changes
            - README.md     # Ignore readme updates
```

## Checking Out Specific Refs

When a multi-repo pipeline triggers, each repository is checked out at a specific ref. The triggering repository uses the commit that caused the trigger, and other repositories use the default branch (usually main). You can override this.

```yaml
resources:
  repositories:
    - repository: sharedLib
      type: git
      name: MyProject/shared-library
      ref: 'refs/tags/v2.0.0'  # Pin to a specific tag
      trigger:
        tags:
          include:
            - v*  # Trigger on version tags

steps:
  - checkout: self

  # Check out a specific branch of the shared library
  - checkout: sharedLib
    fetchDepth: 1  # Shallow clone for speed
    displayName: 'Checkout shared library at tag'
```

## Handling Merge Conflicts Across Repos

When multiple repositories are changing simultaneously, you might encounter situations where the combination of changes across repos causes build failures even though each repo is individually fine. This is the cross-repo integration problem.

The solution is to use a dedicated integration pipeline that runs periodically (not just on trigger) and tests the combination of all repos at their latest state.

```yaml
# integration-pipeline.yml - Scheduled integration test across repos
# Runs every 4 hours to catch cross-repo integration issues

schedules:
  - cron: '0 */4 * * *'
    displayName: 'Integration check every 4 hours'
    branches:
      include:
        - main
    always: true  # Run even if no changes

resources:
  repositories:
    - repository: backend
      type: git
      name: MyProject/backend-api
    - repository: frontend
      type: git
      name: MyProject/frontend-app
    - repository: sharedLib
      type: git
      name: MyProject/shared-library

pool:
  vmImage: 'ubuntu-latest'

steps:
  - checkout: self
  - checkout: backend
  - checkout: frontend
  - checkout: sharedLib

  - script: |
      echo "Running cross-repo integration tests"
      echo "Testing that all components work together at HEAD"
      # Run your integration test suite here
    displayName: 'Cross-repo integration tests'
```

## Practical Tips

Keep the number of watched repositories reasonable. Each additional repository adds checkout time and complexity. If you find yourself watching more than four or five repositories from a single pipeline, consider whether your architecture needs refactoring.

Use shallow clones (`fetchDepth: 1`) for repositories where you do not need the full Git history. This significantly reduces checkout time, especially for large repositories.

Be careful with path filters across repos. If you filter too aggressively, you might miss changes that affect the build. Start with broad filters and narrow them as you understand the dependency patterns.

Document the cross-repo trigger relationships somewhere visible. When a developer pushes to the shared library and sees builds trigger in three other pipelines, they should understand why. A simple diagram in your project wiki showing which repos trigger which pipelines saves confusion.

Multi-repository triggers turn Azure Pipelines into a coordination layer for your distributed codebase. Instead of maintaining a monorepo to get cross-project builds, you can keep your repositories separate while still ensuring that changes are tested in combination. The setup takes some initial effort, but once in place, it runs automatically and catches integration issues that would otherwise only surface in production.
