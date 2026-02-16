# How to Use Azure Pipelines Checkout Step to Work with Multiple Repositories in One Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Multi-Repo, CI/CD, Azure DevOps, Git, Checkout, DevOps

Description: Learn how to configure Azure Pipelines checkout step to clone and work with multiple repositories in a single pipeline for cross-repo builds and deployments.

---

Modern software is rarely contained in a single repository. You might have your application code in one repo, infrastructure templates in another, shared libraries in a third, and deployment scripts in a fourth. When your pipeline needs to pull from multiple sources, the default single-repo checkout is not enough.

Azure Pipelines supports multi-repo checkout, letting you clone multiple repositories into a single pipeline run. This is essential for cross-repo builds, monorepo-style workflows, and deployments that pull configuration from a separate repository. In this post, I will cover how to configure multi-repo checkout, handle authentication, manage file paths, and deal with the common gotchas.

## The Default Checkout Behavior

By default, Azure Pipelines checks out the repository that contains the pipeline YAML file. The code lands in a directory called `$(Build.SourcesDirectory)` or its alias `$(Pipeline.Workspace)/s`. If you do not include any checkout step, this happens automatically.

If you explicitly include a checkout step, you must also include `checkout: self` if you still want the pipeline's own repository:

```yaml
steps:
  # Explicitly check out the pipeline's own repository
  - checkout: self

  - script: ls -la $(Build.SourcesDirectory)
    displayName: 'List checked out files'
```

## Checking Out Multiple Repositories

To use multiple repositories, first declare them as resources, then check them out:

```yaml
# Declare external repositories as pipeline resources
resources:
  repositories:
    # Infrastructure templates in a separate repo
    - repository: infra-templates
      type: git
      name: MyProject/infrastructure-templates  # ProjectName/RepoName
      ref: refs/heads/main

    # Shared library used by multiple services
    - repository: shared-lib
      type: git
      name: MyProject/shared-library
      ref: refs/tags/v2.1.0  # Pin to a specific tag

    # GitHub repository (external)
    - repository: external-tools
      type: github
      endpoint: github-service-connection  # Service connection name
      name: myorg/deployment-tools
      ref: refs/heads/main

trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Check out the pipeline's own repository
  - checkout: self
    path: 'app'  # Checkout into a subdirectory

  # Check out the infrastructure templates repo
  - checkout: infra-templates
    path: 'infra'

  # Check out the shared library
  - checkout: shared-lib
    path: 'shared'

  # Now all three repos are available in the workspace
  - script: |
      echo "Application code:"
      ls $(Pipeline.Workspace)/app/

      echo "Infrastructure templates:"
      ls $(Pipeline.Workspace)/infra/

      echo "Shared library:"
      ls $(Pipeline.Workspace)/shared/
    displayName: 'List all repositories'
```

## Understanding the Directory Layout

When you check out multiple repositories, the directory structure changes from the single-repo default. Each repository gets its own subdirectory:

```
$(Pipeline.Workspace)/
    app/                    (self checkout)
        src/
        Dockerfile
        azure-pipelines.yml
    infra/                  (infra-templates checkout)
        terraform/
        bicep/
    shared/                 (shared-lib checkout)
        lib/
        package.json
```

If you do not specify a `path` on the checkout step, the default directory name is the repository name. This is important because scripts that reference `$(Build.SourcesDirectory)` will point to a different location than expected. Always use explicit paths for clarity.

## Triggering on Changes in Multiple Repos

You can configure the pipeline to trigger when changes occur in any of the declared repositories:

```yaml
resources:
  repositories:
    - repository: config-repo
      type: git
      name: MyProject/app-config
      ref: refs/heads/main
      trigger:
        branches:
          include:
            - main

trigger:
  branches:
    include:
      - main

# This pipeline will run when:
# 1. The pipeline's own repo (self) has changes pushed to main
# 2. The config-repo has changes pushed to main
```

When a run is triggered by a change in an external repository, the `Build.Repository.Name` variable tells you which repository triggered it. This is useful for conditional logic:

```yaml
steps:
  - checkout: self
  - checkout: config-repo

  # Only run config validation if the config repo triggered the build
  - script: |
      echo "Validating configuration changes..."
      python validate_config.py
    displayName: 'Validate config'
    condition: eq(variables['Build.Repository.Name'], 'app-config')

  # Always build the application
  - script: |
      echo "Building application..."
      npm run build
    displayName: 'Build app'
```

## Sparse Checkout for Large Repositories

If a repository is large but you only need specific directories, use sparse checkout to save time and disk space:

```yaml
steps:
  # Only check out the 'terraform/' directory from the infra repo
  - checkout: infra-templates
    path: 'infra'
    fetchDepth: 1        # Shallow clone (only latest commit)
    fetchFilter: 'blob:none'  # Don't download file content until needed
```

Note that Azure Pipelines does not have a built-in sparse checkout option in the YAML schema. However, you can achieve it with a custom script:

```yaml
steps:
  # Skip the default checkout
  - checkout: none

  # Manual sparse checkout for fine-grained control
  - script: |
      # Clone only the directory structure (no file content yet)
      git clone --filter=blob:none --sparse \
        https://$(System.AccessToken)@dev.azure.com/myorg/myproject/_git/large-repo \
        $(Pipeline.Workspace)/large-repo

      cd $(Pipeline.Workspace)/large-repo

      # Configure which directories to include
      git sparse-checkout set terraform/ scripts/deploy/
    displayName: 'Sparse checkout of large repo'
```

## Checkout Options

The checkout step supports several useful options:

```yaml
steps:
  - checkout: self
    clean: true          # Clean the working directory before checkout
    fetchDepth: 0        # Full history (useful for git blame, version calculation)
    lfs: true            # Fetch Git LFS files
    submodules: true     # Initialize and update submodules
    persistCredentials: true  # Keep credentials for later git operations

  - checkout: infra-templates
    fetchDepth: 1        # Shallow clone (fastest, only latest commit)
    clean: false         # Do not clean (slightly faster for subsequent runs)
```

The `persistCredentials` option is important if your build steps need to push changes back to the repository (e.g., auto-generating files and committing them).

## Working with Multiple Repos in a Build

Here is a practical example: building an application that depends on a shared library and deploys using infrastructure templates from another repo:

```yaml
resources:
  repositories:
    - repository: shared-lib
      type: git
      name: MyProject/shared-library
      ref: refs/heads/main
    - repository: deploy-config
      type: git
      name: MyProject/deployment-config
      ref: refs/heads/main

trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Build
    jobs:
      - job: BuildApp
        steps:
          # Check out all needed repositories
          - checkout: self
            path: 'app'
          - checkout: shared-lib
            path: 'shared'

          # Install the shared library as a local dependency
          - script: |
              cd $(Pipeline.Workspace)/app
              npm install $(Pipeline.Workspace)/shared
              npm run build
            displayName: 'Build with shared library'

          - script: |
              cd $(Pipeline.Workspace)/app
              npm test
            displayName: 'Run tests'

  - stage: Deploy
    dependsOn: Build
    jobs:
      - job: DeployApp
        steps:
          - checkout: self
            path: 'app'
          - checkout: deploy-config
            path: 'config'

          # Use deployment config from the config repo
          - script: |
              echo "Deploying with config from $(Pipeline.Workspace)/config/"
              cat $(Pipeline.Workspace)/config/environments/staging/values.yaml
            displayName: 'Load deployment config'

          - task: AzureCLI@2
            inputs:
              azureSubscription: 'azure-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az webapp deploy \
                  --resource-group staging-rg \
                  --name my-webapp-staging \
                  --src-path $(Pipeline.Workspace)/app/dist/
            displayName: 'Deploy to staging'
```

## Authentication for Different Repository Types

Different repository types require different authentication:

**Azure Repos (same organization)**: Works automatically. The pipeline's build identity has access to repositories in the same organization. You might need to grant access in Project Settings under Pipelines and Repositories.

**Azure Repos (different organization)**: Requires a service connection of type "Azure Repos/Team Foundation Server."

**GitHub**: Requires a GitHub service connection. Create one in Project Settings under Service Connections.

**Bitbucket**: Similar to GitHub, requires a Bitbucket Cloud service connection.

```yaml
resources:
  repositories:
    # Same org, different project - works with built-in token
    - repository: other-project-repo
      type: git
      name: OtherProject/some-repo

    # GitHub - needs a service connection
    - repository: github-repo
      type: github
      endpoint: my-github-connection
      name: myorg/my-github-repo

    # Bitbucket - needs a service connection
    - repository: bitbucket-repo
      type: bitbucket
      endpoint: my-bitbucket-connection
      name: myorg/my-bitbucket-repo
```

## Common Pitfalls

**Path references break.** When you switch from single-repo to multi-repo checkout, `$(Build.SourcesDirectory)` changes meaning. Scripts that hardcode paths will break. Use explicit path references based on `$(Pipeline.Workspace)`.

**Trigger conflicts.** If the same pipeline triggers from multiple repositories, make sure the trigger configuration does not cause unexpected runs. Use conditions to handle different trigger sources.

**Permissions.** The default build identity may not have access to all repositories. Check the repository permissions under Project Settings if checkout fails with access denied errors.

**Checkout order matters for disk space.** If you are on a self-hosted agent with limited disk space, be mindful of how many repos you check out. Use shallow clones with `fetchDepth: 1` for repos where you do not need history.

## Wrapping Up

Multi-repo checkout is a fundamental capability for pipelines that work across repository boundaries. Whether you are building an application with a shared library, deploying with infrastructure templates from a separate repo, or running cross-repo integration tests, the checkout step gives you the flexibility to pull in whatever code you need. Keep your paths explicit, use triggers thoughtfully, and make sure your permissions are set up correctly.
