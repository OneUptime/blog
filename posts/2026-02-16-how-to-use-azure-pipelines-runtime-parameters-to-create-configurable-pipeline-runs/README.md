# How to Use Azure Pipelines Runtime Parameters to Create Configurable Pipeline Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Runtime Parameters, CI/CD, Pipeline Configuration, DevOps, YAML Pipelines

Description: Use Azure Pipelines runtime parameters to create flexible, configurable pipeline runs with dropdown menus, checkboxes, and conditional logic.

---

Azure Pipelines variables are useful for passing data between steps, but they are limited when you need user input at the time of triggering a pipeline. Runtime parameters fill this gap. They let you define typed inputs with default values, allowed options, and validation rules that users fill in when they manually trigger a pipeline run. This turns your pipelines from rigid, one-size-fits-all workflows into configurable tools that adapt to different scenarios.

This guide covers parameter types, practical patterns, and the techniques that make runtime parameters genuinely useful in day-to-day pipeline work.

## What Are Runtime Parameters?

Runtime parameters are defined in the `parameters` section of your YAML pipeline. When someone manually triggers the pipeline, Azure DevOps shows a form with input fields for each parameter. The user fills in their choices, clicks Run, and the pipeline uses those values throughout execution.

Unlike variables, parameters are:
- Typed (string, number, boolean, object, step, stepList, job, jobList, deployment, deploymentList, stage, stageList)
- Validated at pipeline parse time
- Available at template expansion time (before the pipeline actually runs)
- Immutable during the pipeline run

## Basic Parameter Types

Here is a pipeline that demonstrates the most common parameter types:

```yaml
# Parameters with different types and defaults
trigger: none  # Manual trigger only

parameters:
  # String parameter with allowed values (renders as a dropdown)
  - name: environment
    displayName: 'Target Environment'
    type: string
    default: 'dev'
    values:
      - dev
      - staging
      - production

  # Boolean parameter (renders as a checkbox)
  - name: runTests
    displayName: 'Run Tests'
    type: boolean
    default: true

  # Free-form string parameter (renders as a text field)
  - name: imageTag
    displayName: 'Docker Image Tag'
    type: string
    default: 'latest'

  # Number parameter
  - name: replicas
    displayName: 'Number of Replicas'
    type: number
    default: 1

pool:
  vmImage: 'ubuntu-latest'

steps:
  - script: |
      echo "Environment: ${{ parameters.environment }}"
      echo "Run Tests: ${{ parameters.runTests }}"
      echo "Image Tag: ${{ parameters.imageTag }}"
      echo "Replicas: ${{ parameters.replicas }}"
    displayName: 'Show parameter values'
```

When a user clicks "Run pipeline" in the Azure DevOps UI, they see a form with a dropdown for environment, a checkbox for runTests, text fields for imageTag, and a number input for replicas.

## Using Parameters in Conditions

Parameters are most powerful when combined with conditions. You can skip entire stages, jobs, or steps based on parameter values:

```yaml
parameters:
  - name: environment
    displayName: 'Target Environment'
    type: string
    default: 'dev'
    values:
      - dev
      - staging
      - production

  - name: deployInfra
    displayName: 'Deploy Infrastructure'
    type: boolean
    default: false

  - name: runSmokeTests
    displayName: 'Run Smoke Tests After Deploy'
    type: boolean
    default: true

stages:
  # Infrastructure stage - only runs if the checkbox is checked
  - stage: Infrastructure
    condition: eq('${{ parameters.deployInfra }}', 'true')
    jobs:
      - job: DeployInfra
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: '${{ parameters.environment }}-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az deployment group create \
                  --resource-group "rg-myapp-${{ parameters.environment }}" \
                  --template-file "infra/main.bicep" \
                  --parameters "infra/parameters.${{ parameters.environment }}.json"
            displayName: 'Deploy Bicep template'

  # Application deployment - always runs
  - stage: Deploy
    dependsOn:
      - ${{ if eq(parameters.deployInfra, true) }}:
        - Infrastructure
    jobs:
      - deployment: DeployApp
        environment: '${{ parameters.environment }}'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying to ${{ parameters.environment }}"
                  displayName: 'Deploy application'

  # Smoke tests - conditional on parameter
  - stage: SmokeTests
    condition: eq('${{ parameters.runSmokeTests }}', 'true')
    dependsOn: Deploy
    jobs:
      - job: RunTests
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: echo "Running smoke tests against ${{ parameters.environment }}"
            displayName: 'Smoke tests'
```

## Object Parameters

Object parameters let you pass structured data into a pipeline. This is useful for configurations that have multiple related fields:

```yaml
parameters:
  - name: deploymentConfig
    displayName: 'Deployment Configuration'
    type: object
    default:
      regions:
        - name: 'eastus'
          replicas: 3
        - name: 'westus'
          replicas: 2
      enableCanary: true
      canaryPercentage: 25

stages:
  # Generate a stage for each region using the object parameter
  - ${{ each region in parameters.deploymentConfig.regions }}:
    - stage: Deploy_${{ region.name }}
      displayName: 'Deploy to ${{ region.name }}'
      jobs:
        - deployment: Deploy
          environment: 'production-${{ region.name }}'
          strategy:
            runOnce:
              deploy:
                steps:
                  - script: |
                      echo "Deploying to ${{ region.name }}"
                      echo "Replicas: ${{ region.replicas }}"
                      echo "Canary: ${{ parameters.deploymentConfig.enableCanary }}"
                    displayName: 'Deploy to ${{ region.name }}'
```

## Multi-Select Using Object Parameters

Azure Pipelines does not have a native multi-select parameter type, but you can simulate one with an object parameter:

```yaml
parameters:
  - name: services
    displayName: 'Services to Deploy'
    type: object
    default:
      - api
      - web
      - worker

pool:
  vmImage: 'ubuntu-latest'

jobs:
  - ${{ each service in parameters.services }}:
    - job: Deploy_${{ service }}
      displayName: 'Deploy ${{ service }}'
      steps:
        - script: |
            echo "Building and deploying ${{ service }}"
            docker build -t myregistry/${{ service }}:$(Build.BuildId) ./${{ service }}
            docker push myregistry/${{ service }}:$(Build.BuildId)
          displayName: 'Build ${{ service }}'
```

## Practical Pattern: Configurable Release Pipeline

Here is a release pipeline that uses parameters to give operators full control over the deployment:

```yaml
# release-pipeline.yml - configurable release pipeline
trigger: none

parameters:
  - name: environment
    displayName: 'Target Environment'
    type: string
    default: 'staging'
    values:
      - staging
      - production

  - name: version
    displayName: 'Version to Deploy'
    type: string
    default: 'latest'

  - name: deployDatabase
    displayName: 'Run Database Migrations'
    type: boolean
    default: true

  - name: deployApi
    displayName: 'Deploy API Service'
    type: boolean
    default: true

  - name: deployFrontend
    displayName: 'Deploy Frontend'
    type: boolean
    default: true

  - name: maintenanceWindow
    displayName: 'Enable Maintenance Mode During Deploy'
    type: boolean
    default: false

variables:
  resourceGroup: 'rg-myapp-${{ parameters.environment }}'

stages:
  # Enable maintenance mode if requested
  - stage: PreDeploy
    condition: eq('${{ parameters.maintenanceWindow }}', 'true')
    jobs:
      - job: EnableMaintenance
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: '${{ parameters.environment }}-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                # Set app setting to enable maintenance mode
                az webapp config appsettings set \
                  --resource-group "$(resourceGroup)" \
                  --name "app-myapp-${{ parameters.environment }}" \
                  --settings MAINTENANCE_MODE=true
            displayName: 'Enable maintenance mode'

  # Database migrations
  - stage: Database
    condition: eq('${{ parameters.deployDatabase }}', 'true')
    dependsOn:
      - ${{ if eq(parameters.maintenanceWindow, true) }}:
        - PreDeploy
    jobs:
      - job: Migrate
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - script: |
              echo "Running database migrations for version ${{ parameters.version }}"
              # dotnet ef database update
            displayName: 'Run migrations'

  # API deployment
  - stage: DeployAPI
    condition: eq('${{ parameters.deployApi }}', 'true')
    dependsOn:
      - ${{ if eq(parameters.deployDatabase, true) }}:
        - Database
    jobs:
      - deployment: DeployApiService
        environment: '${{ parameters.environment }}'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying API version ${{ parameters.version }}"
                  displayName: 'Deploy API'

  # Frontend deployment
  - stage: DeployFrontend
    condition: eq('${{ parameters.deployFrontend }}', 'true')
    dependsOn:
      - ${{ if eq(parameters.deployApi, true) }}:
        - DeployAPI
    jobs:
      - deployment: DeployFrontendApp
        environment: '${{ parameters.environment }}'
        strategy:
          runOnce:
            deploy:
              steps:
                - script: echo "Deploying frontend version ${{ parameters.version }}"
                  displayName: 'Deploy frontend'

  # Disable maintenance mode
  - stage: PostDeploy
    condition: eq('${{ parameters.maintenanceWindow }}', 'true')
    dependsOn:
      - ${{ if eq(parameters.deployApi, true) }}:
        - DeployAPI
      - ${{ if eq(parameters.deployFrontend, true) }}:
        - DeployFrontend
    jobs:
      - job: DisableMaintenance
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: AzureCLI@2
            inputs:
              azureSubscription: '${{ parameters.environment }}-connection'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                az webapp config appsettings set \
                  --resource-group "$(resourceGroup)" \
                  --name "app-myapp-${{ parameters.environment }}" \
                  --settings MAINTENANCE_MODE=false
            displayName: 'Disable maintenance mode'
```

## Parameters vs Variables

A common source of confusion is when to use parameters versus variables. Here is a quick guide:

| Feature | Parameters | Variables |
|---------|-----------|-----------|
| Defined at | Template parse time | Runtime |
| User input | Yes (manual runs) | No |
| Type checking | Yes | No (always strings) |
| Can use in conditions | Compile-time conditions | Runtime conditions |
| Template expressions | `${{ parameters.name }}` | `$(variableName)` |
| Modifiable during run | No | Yes |

Use parameters when you need user input, type validation, or compile-time template logic. Use variables for values that change during the pipeline run or that come from pipeline resources.

## Tips and Gotchas

1. **Parameters with `values` render as dropdowns.** This is the best UX for constrained choices. Always use `values` when you have a known set of options.

2. **Default values matter.** If someone triggers the pipeline via the API or a scheduled trigger, parameters use their defaults. Make sure the defaults are safe and sensible.

3. **Boolean parameters and string comparison.** When using boolean parameters in conditions, compare with `true` as a string: `eq('${{ parameters.myBool }}', 'true')`. The compile-time expression converts the boolean to a string.

4. **Parameters are not available in runtime expressions.** You cannot use `$(parameters.name)` - only `${{ parameters.name }}`. This means parameters are resolved before the pipeline runs, not during.

5. **API triggers can pass parameters.** When triggering a pipeline via the REST API, include parameters in the request body. This makes parameterized pipelines usable in automation.

## Wrapping Up

Runtime parameters transform Azure Pipelines from static definitions into configurable tools. Instead of maintaining separate pipelines for different scenarios - deploy to staging, deploy to production, deploy with database migration, deploy without - you maintain one pipeline with parameters that let the operator choose what happens at run time. Start with simple string and boolean parameters, and as you get comfortable, use object parameters and compile-time expressions for more sophisticated workflows. The investment in parameterizing your pipelines pays off every time someone needs to run a deployment with slightly different settings.
