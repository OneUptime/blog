# How to Set Up Azure DevOps Pipeline Decorators to Inject Steps into All Organization Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, Pipeline Decorators, CI/CD, DevOps, Azure Pipelines, Automation, Extensions

Description: Learn how to create and deploy Azure DevOps pipeline decorators that automatically inject steps into every pipeline across your organization for consistent governance.

---

If you have ever managed CI/CD at scale, you know the pain of keeping dozens or hundreds of pipelines consistent. You want every pipeline to include a security scan, a compliance check, or a telemetry step, but getting every team to add that step manually is a losing battle. Azure DevOps pipeline decorators solve this problem by letting you inject steps into all pipelines across your organization without touching any individual YAML file.

Pipeline decorators are custom extensions that automatically prepend or append tasks to every job in every pipeline. They run transparently, and individual teams do not need to opt in. This makes them ideal for centralized governance, security enforcement, and operational telemetry.

## What Are Pipeline Decorators?

A pipeline decorator is a special type of Azure DevOps extension. When installed in your organization, it hooks into the pipeline execution engine and injects one or more steps into every pipeline job. You can target specific conditions - for example, only production deployments, only repos in certain projects, or only pipelines that match a filter.

Decorators run before or after the existing steps in a job, depending on how you configure them. The injected steps appear in the pipeline logs just like any other task, so there is full transparency.

## Prerequisites

Before building a decorator, make sure you have the following in place:

- An Azure DevOps organization where you have administrator access
- Node.js installed locally for building the extension
- The `tfx-cli` tool installed globally for packaging and publishing extensions
- A publisher account on the Visual Studio Marketplace (you can create one for free)

Install the TFX CLI if you have not already.

```bash
# Install the TFX CLI globally using npm
npm install -g tfx-cli
```

## Building a Pipeline Decorator Extension

The extension structure looks like a normal Azure DevOps extension with a few special properties. Here is the directory layout you need.

```
my-decorator/
  vss-extension.json
  decorator.yml
  icon.png
```

### Step 1: Create the Extension Manifest

The `vss-extension.json` file describes your extension and tells Azure DevOps that it contains a pipeline decorator.

```json
{
    "manifestVersion": 1,
    "id": "security-scan-decorator",
    "name": "Security Scan Decorator",
    "version": "1.0.0",
    "publisher": "your-publisher-id",
    "targets": [
        {
            "id": "Microsoft.VisualStudio.Services"
        }
    ],
    "contributions": [
        {
            "id": "security-scan-injector",
            "type": "ms.azure-pipelines.pipeline-decorator",
            "targets": [
                "ms.azure-pipelines-agent-job"
            ],
            "properties": {
                "template": "decorator.yml",
                "targettask": "",
                "targettaskorder": "PreJob"
            }
        }
    ],
    "files": [
        {
            "path": "decorator.yml",
            "addressable": true
        }
    ]
}
```

There are a few key things to note here. The `type` field must be `ms.azure-pipelines.pipeline-decorator`. The `targets` array under the contribution specifies where the decorator fires. Using `ms.azure-pipelines-agent-job` means it runs in every agent job. You can also target `ms.azure-pipelines-server-job` for server jobs or `ms.azure-pipelines.pipeline-decorator` for both.

The `targettaskorder` property controls timing. Use `PreJob` to inject steps before all other steps, or `PostJob` to append them after everything else runs.

### Step 2: Define the Decorator Template

The `decorator.yml` file contains the actual steps that get injected. This is standard YAML pipeline syntax.

```yaml
# decorator.yml - Steps injected into every pipeline job
steps:
  - task: CmdLine@2
    displayName: 'Decorator: Security Compliance Check'
    inputs:
      script: |
        echo "Running organization-wide security scan..."
        echo "Checking repository: $(Build.Repository.Name)"
        echo "Pipeline: $(Build.DefinitionName)"
        echo "Branch: $(Build.SourceBranchName)"
        # Add your actual security scanning logic here
        # For example, call an internal API or run a tool
    condition: always()
```

The `condition: always()` ensures this step runs even if previous steps fail. This is useful for telemetry and compliance checks that need to always execute.

### Step 3: Add Conditional Logic

You probably do not want the decorator to fire on every single pipeline run. You can add conditions using pipeline expressions.

```yaml
# decorator.yml - Only run for production deployments
steps:
  - ${{ if eq(variables['Build.SourceBranch'], 'refs/heads/main') }}:
    - task: CmdLine@2
      displayName: 'Decorator: Production Compliance Gate'
      inputs:
        script: |
          echo "This is a main branch build - running compliance gate"
          # Call your compliance API endpoint
          curl -s -o /dev/null -w "%{http_code}" \
            "https://compliance.internal.example.com/check?repo=$(Build.Repository.Name)"
      condition: succeeded()
```

You can also use template expressions to check for specific variables, project names, or any other pipeline context.

### Step 4: Package and Publish

Package the extension using the TFX CLI.

```bash
# Package the extension into a VSIX file
tfx extension create --manifest-globs vss-extension.json

# Publish the extension to your organization (private)
tfx extension publish --manifest-globs vss-extension.json \
  --share-with your-organization-name \
  --token YOUR_PAT_TOKEN
```

After publishing, go to your Azure DevOps organization settings, navigate to Extensions, and install the extension from the shared list.

## Advanced Decorator Patterns

### Injecting Multiple Steps

A single decorator can inject several steps. This is useful when you want to combine setup, execution, and teardown logic.

```yaml
# decorator.yml - Multiple injected steps
steps:
  - task: CmdLine@2
    displayName: 'Decorator: Initialize Telemetry'
    inputs:
      script: |
        echo "##vso[task.setvariable variable=DecoratorStartTime]$(date +%s)"
        echo "Pipeline telemetry initialized"
    condition: always()

  - task: CmdLine@2
    displayName: 'Decorator: Check Approved Dependencies'
    inputs:
      script: |
        echo "Scanning for unapproved dependencies..."
        # Run your dependency checker here
    condition: succeeded()
```

### Using Pre and Post Decorators Together

You can create two contributions in the same extension - one for PreJob and one for PostJob. This is a common pattern for wrapping all pipeline activity with initialization and cleanup.

```json
{
    "contributions": [
        {
            "id": "pre-job-decorator",
            "type": "ms.azure-pipelines.pipeline-decorator",
            "targets": ["ms.azure-pipelines-agent-job"],
            "properties": {
                "template": "pre-decorator.yml",
                "targettaskorder": "PreJob"
            }
        },
        {
            "id": "post-job-decorator",
            "type": "ms.azure-pipelines.pipeline-decorator",
            "targets": ["ms.azure-pipelines-agent-job"],
            "properties": {
                "template": "post-decorator.yml",
                "targettaskorder": "PostJob"
            }
        }
    ]
}
```

### Filtering by Project or Repository

Sometimes you want decorators that only apply to specific projects. Use template expressions for this.

```yaml
# Only inject into pipelines in the "production-apps" project
steps:
  - ${{ if eq(variables['System.TeamProject'], 'production-apps') }}:
    - task: CmdLine@2
      displayName: 'Decorator: Prod-Only Gate'
      inputs:
        script: echo "Production project detected, running extra checks"
```

## Debugging Decorators

When a decorator misfires or causes unexpected behavior, debugging can be tricky because the injected steps are not visible in the YAML source.

Enable system diagnostics by setting `system.debug` to `true` in your pipeline variables. This makes decorator injection visible in the logs. You will see log entries like "Evaluating decorator contribution" that tell you exactly which decorators were considered and whether their conditions matched.

Another useful technique is to add a step that writes decorator metadata to the pipeline summary.

```yaml
steps:
  - task: CmdLine@2
    displayName: 'Decorator: Metadata Report'
    inputs:
      script: |
        echo "##vso[task.uploadsummary]$(System.DefaultWorkingDirectory)/decorator-report.md"
        echo "# Decorator Report" > decorator-report.md
        echo "- Decorator Version: 1.0.0" >> decorator-report.md
        echo "- Applied At: $(date)" >> decorator-report.md
        echo "- Pipeline: $(Build.DefinitionName)" >> decorator-report.md
    condition: always()
```

## Governance Best Practices

Pipeline decorators are powerful, but that power comes with responsibility. Here are some practical guidelines:

First, keep decorator logic lightweight. Every decorator adds time to every pipeline run. A decorator that takes 30 seconds might not seem like much, but multiply that by hundreds of daily runs and you have significant overhead.

Second, version your decorators carefully. Since they affect all pipelines, a broken decorator update can halt your entire organization's CI/CD. Test thoroughly in a staging organization before rolling out.

Third, communicate with your teams. Even though decorators are injected transparently, teams should know what is running in their pipelines. Document the decorators in your organization wiki and explain what each one does.

Fourth, use conditions aggressively. The more targeted your decorator, the less unnecessary overhead you create. Filter by project, branch, build reason, or any other available variable.

## Common Use Cases

The most popular uses for pipeline decorators in organizations include mandatory security scanning on all builds, injecting license compliance checks before artifact publication, adding telemetry collection for pipeline performance monitoring, enforcing code signing requirements on release builds, and injecting notification steps that report build status to external systems.

Pipeline decorators give you centralized control without sacrificing the autonomy that teams need in their individual pipeline definitions. Once you have them set up, maintaining consistent CI/CD governance across your organization becomes dramatically simpler.
