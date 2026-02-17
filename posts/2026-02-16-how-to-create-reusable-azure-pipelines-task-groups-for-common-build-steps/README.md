# How to Create Reusable Azure Pipelines Task Groups for Common Build Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Task Groups, CI/CD, Reusability, Azure DevOps, Build Automation, DevOps

Description: Create and manage reusable task groups in Azure Pipelines to standardize common build steps and reduce pipeline duplication.

---

If you have multiple pipelines that share the same sequence of steps - building a .NET project, running code analysis, pushing Docker images, deploying to App Service - you are probably copy-pasting those steps between pipelines. Every time you need to update a shared step, you hunt down every pipeline that uses it and make the change manually. This is exactly the problem task groups solve.

Task groups in Azure Pipelines let you bundle a sequence of tasks into a single reusable unit with parameters. You define the task group once, and any pipeline can reference it. Update the task group, and every pipeline picks up the change automatically.

In this post, I will cover creating task groups for common scenarios, parameterizing them for flexibility, versioning them for safety, and when to use task groups versus YAML templates.

## Task Groups vs. YAML Templates

Before diving in, let me clarify the relationship between task groups and YAML templates, since they solve similar problems differently.

**Task groups** are a feature of classic (visual designer) pipelines. They are defined through the UI, stored in Azure DevOps, and referenced by name. They work in both classic and YAML pipelines.

**YAML templates** are files in your repository that define reusable pipeline logic. They are version-controlled, reviewed in PRs, and only work in YAML pipelines.

If you are fully on YAML pipelines, templates are generally the better choice. But task groups still have their place:

- When you have classic pipelines that need reusability
- When you want a quick way to extract and share steps without creating a template repository
- When non-developer team members need to create and maintain reusable build logic through a visual interface

## Creating Your First Task Group

### From Existing Pipeline Steps

The easiest way to create a task group is to extract it from an existing pipeline.

1. Open a classic build or release pipeline in the editor
2. Select the tasks you want to group (hold Ctrl and click multiple tasks)
3. Right-click and select **Create task group**
4. Give it a name and description
5. Review the auto-detected parameters
6. Click **Create**

The selected tasks are replaced with a single task group reference, and the task group is available for use in other pipelines.

### From Scratch

Go to **Pipelines > Task groups** and click **+ New task group** (or access it through the pipeline editor).

Let me walk through creating a useful task group for building and publishing .NET applications.

## Example: .NET Build and Publish Task Group

This task group handles the standard .NET workflow: restore, build, test, and publish.

Create a task group named "DotNet Build and Publish" with these tasks:

**Task 1: NuGet Restore**
- Task: DotNetCoreCLI@2
- Command: restore
- Projects: `$(ProjectPath)`

**Task 2: Build**
- Task: DotNetCoreCLI@2
- Command: build
- Projects: `$(ProjectPath)`
- Arguments: `--configuration $(BuildConfiguration) --no-restore`

**Task 3: Test**
- Task: DotNetCoreCLI@2
- Command: test
- Projects: `$(TestProjectPath)`
- Arguments: `--configuration $(BuildConfiguration) --no-build --logger trx`

**Task 4: Publish**
- Task: DotNetCoreCLI@2
- Command: publish
- Projects: `$(ProjectPath)`
- Arguments: `--configuration $(BuildConfiguration) --output $(Build.ArtifactStagingDirectory)`

**Task 5: Publish Artifacts**
- Task: PublishBuildArtifacts@1
- Path to publish: `$(Build.ArtifactStagingDirectory)`
- Artifact name: `$(ArtifactName)`

### Parameters

The task group exposes these parameters that consumers can customize:

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| ProjectPath | `**/*.csproj` | Path to the project files to build |
| TestProjectPath | `**/*Tests.csproj` | Path to the test project files |
| BuildConfiguration | `Release` | Build configuration |
| ArtifactName | `drop` | Name of the published artifact |

When a pipeline uses this task group, it can override any of these parameters or accept the defaults.

## Using Task Groups in YAML Pipelines

You can reference task groups in YAML pipelines using the `task` keyword with the task group's ID.

First, find the task group ID. Go to **Pipelines > Task groups**, click on your task group, and look at the URL. The ID is the GUID at the end.

Then reference it in your YAML.

```yaml
# azure-pipelines.yml - Using a task group in YAML
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  # Reference the task group by its name
  - task: DotNetBuildAndPublish@1
    displayName: 'Build, Test, and Publish'
    inputs:
      ProjectPath: 'src/MyApp/MyApp.csproj'
      TestProjectPath: 'tests/MyApp.Tests/MyApp.Tests.csproj'
      BuildConfiguration: 'Release'
      ArtifactName: 'myapp-build'
```

Note that referencing task groups in YAML by name requires the task group to be in the same project. Cross-project references require the task group ID.

## Example: Docker Build and Push Task Group

Here is another commonly needed task group for containerized applications.

**Name**: Docker Build and Push

**Tasks**:

1. **Docker Login**
   - Task: Docker@2
   - Command: login
   - Container Registry: `$(ContainerRegistry)`

2. **Docker Build**
   - Task: Docker@2
   - Command: build
   - Dockerfile: `$(DockerfilePath)`
   - Build context: `$(BuildContext)`
   - Repository: `$(ImageRepository)`
   - Tags: `$(ImageTag)`

3. **Docker Push**
   - Task: Docker@2
   - Command: push
   - Repository: `$(ImageRepository)`
   - Tags: `$(ImageTag)`

**Parameters**:

| Parameter | Default Value |
|-----------|---------------|
| ContainerRegistry | *(no default)* |
| DockerfilePath | `Dockerfile` |
| BuildContext | `.` |
| ImageRepository | *(no default)* |
| ImageTag | `$(Build.BuildId)` |

## Example: Code Quality Task Group

Bundle your code quality checks into a single task group so every project runs the same analysis.

**Name**: Code Quality Checks

**Tasks**:

1. **Run Linter**
   - Script: `$(LintCommand)`

2. **SonarQube Analysis Begin**
   - Task: SonarQubePrepare@5
   - Project Key: `$(SonarProjectKey)`

3. **Build for Analysis**
   - Task: DotNetCoreCLI@2
   - Command: build

4. **SonarQube Analysis End**
   - Task: SonarQubeAnalyze@5

5. **Publish Quality Gate Result**
   - Task: SonarQubePublish@5

**Parameters**:

| Parameter | Default Value |
|-----------|---------------|
| LintCommand | `dotnet format --verify-no-changes` |
| SonarProjectKey | *(no default)* |

## Versioning Task Groups

Task groups support versioning, which is critical for safe updates. When you modify a task group, you can:

- **Save as a new version**: Existing pipelines continue using the old version. New pipelines can opt into the new version.
- **Update in place**: All pipelines using the task group immediately get the changes.

### Version Management Workflow

I recommend this workflow:

1. Create the task group (version 1)
2. When you need to make changes, create a **draft**
3. Test the draft in a non-production pipeline
4. When satisfied, **publish** the draft as a new major version
5. Gradually migrate pipelines to the new version
6. Deprecate the old version once all pipelines have migrated

```mermaid
graph LR
    A[v1: Published] --> B[v2: Draft]
    B --> C[v2: Preview in test pipeline]
    C --> D[v2: Published]
    D --> E[Migrate pipelines v1 to v2]
    E --> F[v1: Deprecated]
```

To create a draft: open the task group, click **Save as draft**. To publish: click **Publish draft**.

## Nesting Task Groups

Task groups can reference other task groups, which is useful for composition. For example:

- **Base Build** task group: restore, build, test
- **Docker Deploy** task group: uses "Base Build" + Docker build + push
- **Web App Deploy** task group: uses "Base Build" + App Service deploy

However, do not nest too deeply. Two levels is usually the maximum before things become hard to debug.

## Managing Task Group Permissions

Task groups have their own permission model:

- **Creator**: Can create new task groups
- **Reader**: Can view and use task groups
- **Administrator**: Can modify and delete task groups

Go to **Pipelines > Task groups**, click the three dots on a task group, and select **Security** to manage permissions.

For production task groups, restrict the Administrator role to a small group of people (like the platform team). This prevents accidental changes that could break pipelines across the organization.

## Migrating Task Groups to YAML Templates

If your organization is moving to YAML pipelines, you will eventually want to migrate task groups to YAML templates. The process is straightforward:

1. Open the task group and note all tasks and their configurations
2. Create a YAML template file with the same tasks
3. Convert task group parameters to YAML template parameters
4. Update consuming pipelines to reference the template instead of the task group

Here is a side-by-side comparison.

Task group approach (used in classic or YAML):

```yaml
# Referencing a task group
steps:
  - task: DotNetBuildAndPublish@1
    inputs:
      ProjectPath: 'src/MyApp/MyApp.csproj'
      BuildConfiguration: 'Release'
```

YAML template approach:

```yaml
# templates/steps/dotnet-build.yml
parameters:
  - name: projectPath
    type: string
    default: '**/*.csproj'
  - name: buildConfiguration
    type: string
    default: 'Release'

steps:
  - task: DotNetCoreCLI@2
    displayName: 'Restore'
    inputs:
      command: 'restore'
      projects: '${{ parameters.projectPath }}'

  - task: DotNetCoreCLI@2
    displayName: 'Build'
    inputs:
      command: 'build'
      projects: '${{ parameters.projectPath }}'
      arguments: '--configuration ${{ parameters.buildConfiguration }}'
```

```yaml
# Consuming the template
steps:
  - template: templates/steps/dotnet-build.yml
    parameters:
      projectPath: 'src/MyApp/MyApp.csproj'
      buildConfiguration: 'Release'
```

## Troubleshooting Common Issues

**Task group not appearing in the task list**: Make sure you are looking in the correct project. Task groups are project-scoped unless explicitly shared.

**Parameter values not being passed correctly**: Check that the parameter names in the task group match what the consuming pipeline passes. Names are case-sensitive.

**Changes not taking effect**: If you edited a task group but pipelines still use the old version, check whether you created a new version or updated in place. Pipelines pin to a specific major version.

**Circular references**: Task group A cannot reference task group B if B also references A. Azure DevOps will flag this as an error.

## Wrapping Up

Task groups are a practical way to reduce duplication across Azure Pipelines, especially if you are working with classic pipelines or need a visual interface for managing reusable steps. They provide parameterization, versioning, and permission control out of the box. For YAML-first teams, templates offer the same benefits with the added advantage of version control and PR reviews. Either way, the goal is the same: define your common build patterns once and reuse them everywhere, so updates happen in one place instead of fifty.
