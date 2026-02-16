# How to Set Up Azure Pipelines Integration with SonarQube for Continuous Code Quality Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, SonarQube, Code Quality, Static Analysis, CI/CD, DevOps, Code Coverage

Description: Learn how to integrate SonarQube with Azure Pipelines for continuous code quality analysis including code smells, bugs, vulnerabilities, and coverage tracking.

---

Code reviews catch obvious issues, but they miss systemic quality problems - duplicated code creeping up across the codebase, technical debt accumulating in specific modules, test coverage silently dropping, or security vulnerabilities hiding in complex logic. SonarQube catches these patterns by analyzing every change against a comprehensive set of quality rules and tracking trends over time.

Integrating SonarQube with Azure Pipelines means every build gets analyzed, every pull request gets a quality gate check, and your team gets continuous visibility into code health. When quality degrades, the pipeline tells you immediately rather than letting problems compound for months.

## Prerequisites

You need the following before setting up the integration:

- A SonarQube server (self-hosted or SonarQube Cloud). Community Edition is free.
- The SonarQube extension installed in your Azure DevOps organization (available from the Visual Studio Marketplace)
- A SonarQube project created for your application
- A SonarQube token for authentication

## Setting Up the SonarQube Service Connection

First, create a service connection in Azure DevOps that points to your SonarQube server.

Navigate to Project Settings, then Service connections, then "New service connection." Select "SonarQube" from the list.

```
Service connection configuration:
  Server URL: https://sonarqube.yourcompany.com (or https://sonarcloud.io for cloud)
  Token: your-sonarqube-user-token
  Service connection name: SonarQube-Production
```

Generate the token from your SonarQube server. Go to My Account, then Security, and click "Generate Tokens." Give it a descriptive name like "Azure Pipelines CI" and copy the token value.

## Basic Pipeline Integration

The SonarQube integration follows a three-step pattern: Prepare, Build, Analyze. The Prepare step configures the scanner, the Build step compiles your code (required for compiled languages), and the Analyze step sends the results to SonarQube.

```yaml
# azure-pipelines.yml - SonarQube analysis for a .NET project

trigger:
  branches:
    include:
      - main
      - develop
      - feature/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  buildConfiguration: 'Release'
  sonarQubeProject: 'my-application'

steps:
  # Step 1: Prepare SonarQube analysis
  - task: SonarQubePrepare@6
    displayName: 'Prepare SonarQube Analysis'
    inputs:
      SonarQube: 'SonarQube-Production'  # Service connection name
      scannerMode: 'MSBuild'
      projectKey: '$(sonarQubeProject)'
      projectName: 'My Application'
      projectVersion: '$(Build.BuildNumber)'
      extraProperties: |
        sonar.cs.opencover.reportsPaths=$(Agent.TempDirectory)/**/coverage.opencover.xml
        sonar.coverage.exclusions=**/*Tests*/**,**/Program.cs

  # Step 2: Build the project
  - task: DotNetCoreCLI@2
    displayName: 'Build Solution'
    inputs:
      command: 'build'
      projects: '**/*.sln'
      arguments: '--configuration $(buildConfiguration)'

  # Step 3: Run tests with code coverage
  - task: DotNetCoreCLI@2
    displayName: 'Run Tests with Coverage'
    inputs:
      command: 'test'
      projects: '**/*Tests.csproj'
      arguments: '--configuration $(buildConfiguration) --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover'

  # Step 4: Run SonarQube analysis
  - task: SonarQubeAnalyze@6
    displayName: 'Run SonarQube Analysis'

  # Step 5: Publish quality gate result
  - task: SonarQubePublish@6
    displayName: 'Publish Quality Gate Result'
    inputs:
      pollingTimeoutSec: '300'
```

## Pull Request Analysis

SonarQube can analyze pull requests and post comments directly on the PR in Azure DevOps. This gives developers immediate feedback on quality issues in their changed code.

```yaml
# PR-triggered pipeline for SonarQube analysis
trigger: none

pr:
  branches:
    include:
      - main
      - develop

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: SonarQubePrepare@6
    displayName: 'Prepare SonarQube PR Analysis'
    inputs:
      SonarQube: 'SonarQube-Production'
      scannerMode: 'MSBuild'
      projectKey: 'my-application'
      extraProperties: |
        sonar.pullrequest.key=$(System.PullRequest.PullRequestId)
        sonar.pullrequest.branch=$(System.PullRequest.SourceBranch)
        sonar.pullrequest.base=$(System.PullRequest.TargetBranch)
        sonar.pullrequest.provider=Azure DevOps
        sonar.pullrequest.azuredevops.token=$(System.AccessToken)

  - task: DotNetCoreCLI@2
    displayName: 'Build'
    inputs:
      command: 'build'
      projects: '**/*.sln'

  - task: DotNetCoreCLI@2
    displayName: 'Test with Coverage'
    inputs:
      command: 'test'
      projects: '**/*Tests.csproj'
      arguments: '--collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=opencover'

  - task: SonarQubeAnalyze@6
    displayName: 'Analyze'

  - task: SonarQubePublish@6
    displayName: 'Publish Results'
```

When configured correctly, SonarQube decorates the PR with comments showing new issues introduced by the changes. It also updates the PR status with the quality gate result.

## Quality Gates

Quality gates are the most important SonarQube feature for CI/CD. A quality gate is a set of conditions that the code must meet. If the conditions are not met, the quality gate fails, and you can configure your pipeline to fail with it.

Common quality gate conditions:

- New code coverage must be above 80%
- No new bugs allowed
- No new vulnerabilities allowed
- No new security hotspots allowed
- Code duplication on new code below 3%
- Maintainability rating on new code must be A

Configure the quality gate in SonarQube under Quality Gates, then reference it in your pipeline.

```yaml
# Check quality gate and fail the pipeline if it does not pass
steps:
  # ... (Prepare, Build, Analyze steps) ...

  - task: SonarQubePublish@6
    displayName: 'Check Quality Gate'
    inputs:
      pollingTimeoutSec: '300'

  # Optional: Explicit quality gate check with custom failure handling
  - script: |
      # Query the quality gate status from SonarQube API
      SONAR_URL="https://sonarqube.yourcompany.com"
      SONAR_TOKEN="$(SONAR_TOKEN)"
      PROJECT_KEY="my-application"

      # Get the quality gate status for the latest analysis
      STATUS=$(curl -s -u "${SONAR_TOKEN}:" \
        "${SONAR_URL}/api/qualitygates/project_status?projectKey=${PROJECT_KEY}" | \
        python3 -c "import json,sys; print(json.load(sys.stdin)['projectStatus']['status'])")

      echo "Quality Gate Status: $STATUS"

      if [ "$STATUS" != "OK" ]; then
        echo "##vso[task.logissue type=error]Quality gate failed! Status: $STATUS"
        echo "Review issues at: ${SONAR_URL}/dashboard?id=${PROJECT_KEY}"
        exit 1
      fi
    displayName: 'Verify quality gate'
```

## JavaScript and TypeScript Projects

For JavaScript/TypeScript projects, use the CLI scanner instead of the MSBuild scanner.

```yaml
# SonarQube analysis for a Node.js project

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'

  - script: |
      npm ci
      npm run build
    displayName: 'Install and build'

  # Run tests with coverage output for SonarQube
  - script: |
      npx jest --coverage --coverageReporters=lcov --coverageReporters=text
    displayName: 'Run tests with coverage'

  - task: SonarQubePrepare@6
    displayName: 'Prepare SonarQube'
    inputs:
      SonarQube: 'SonarQube-Production'
      scannerMode: 'CLI'
      configMode: 'manual'
      cliProjectKey: 'my-frontend-app'
      cliProjectName: 'My Frontend Application'
      cliSources: 'src'
      extraProperties: |
        sonar.javascript.lcov.reportPaths=coverage/lcov.info
        sonar.exclusions=**/*.test.ts,**/*.spec.ts,**/node_modules/**,**/dist/**
        sonar.test.inclusions=**/*.test.ts,**/*.spec.ts
        sonar.typescript.tsconfigPath=tsconfig.json

  - task: SonarQubeAnalyze@6
    displayName: 'Analyze'

  - task: SonarQubePublish@6
    displayName: 'Publish'
```

## Python Projects

```yaml
# SonarQube analysis for a Python project

steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.11'

  - script: |
      pip install -r requirements.txt
      pip install pytest pytest-cov
    displayName: 'Install dependencies'

  # Run tests with coverage
  - script: |
      pytest --cov=src --cov-report=xml:coverage.xml --junitxml=test-results.xml
    displayName: 'Run tests with coverage'

  - task: SonarQubePrepare@6
    displayName: 'Prepare SonarQube'
    inputs:
      SonarQube: 'SonarQube-Production'
      scannerMode: 'CLI'
      configMode: 'manual'
      cliProjectKey: 'my-python-service'
      cliProjectName: 'My Python Service'
      cliSources: 'src'
      extraProperties: |
        sonar.python.coverage.reportPaths=coverage.xml
        sonar.python.xunit.reportPath=test-results.xml
        sonar.exclusions=**/tests/**,**/migrations/**
        sonar.tests=tests

  - task: SonarQubeAnalyze@6
    displayName: 'Analyze'

  - task: SonarQubePublish@6
    displayName: 'Publish'
```

## Multi-Module Projects

For monorepos or multi-module projects, you can analyze multiple components in a single pipeline run.

```yaml
# Multi-module SonarQube analysis
steps:
  - task: SonarQubePrepare@6
    inputs:
      SonarQube: 'SonarQube-Production'
      scannerMode: 'CLI'
      configMode: 'file'
      configFile: 'sonar-project.properties'
```

With the corresponding properties file.

```properties
# sonar-project.properties - Multi-module configuration
sonar.projectKey=my-monorepo
sonar.projectName=My Monorepo
sonar.projectVersion=1.0

# Define modules
sonar.modules=api,web,shared

# API module configuration
api.sonar.projectName=API Service
api.sonar.sources=src
api.sonar.tests=tests
api.sonar.language=py
api.sonar.python.coverage.reportPaths=api/coverage.xml

# Web module configuration
web.sonar.projectName=Web Frontend
web.sonar.sources=src
web.sonar.tests=src
web.sonar.test.inclusions=**/*.test.ts
web.sonar.javascript.lcov.reportPaths=web/coverage/lcov.info

# Shared module configuration
shared.sonar.projectName=Shared Library
shared.sonar.sources=src
shared.sonar.tests=tests
```

## Viewing Results in Azure DevOps

After the pipeline runs, SonarQube results appear in several places:

1. The build summary shows a SonarQube widget with the quality gate result
2. Pull requests show inline comments for new issues
3. The SonarQube dashboard provides detailed analysis with trends over time

Navigate to your SonarQube server to see the full dashboard with metrics like code coverage, duplication percentage, code smells count, bug count, and vulnerability count. The dashboard shows trends over time, so you can see whether code quality is improving or degrading.

## Troubleshooting Common Issues

The most frequent issue is missing code coverage data. SonarQube reports 0% coverage even though tests run. This usually means the coverage report file path does not match what SonarQube expects. Double-check the `reportPaths` property and verify the coverage file actually exists at that location.

Another common issue is the analysis timing out. If your codebase is large, increase the `pollingTimeoutSec` in the Publish task. The default might not be enough for projects with hundreds of thousands of lines of code.

If PR decoration is not working, verify that the SonarQube token has permissions to post comments on Azure DevOps PRs, and that the PR-specific properties (branch, key, base) are correctly set.

SonarQube integration turns code quality from something you think about occasionally into something you measure continuously. The quality gate becomes a contract between the team and the codebase - new code must meet the bar, and technical debt must not grow faster than it is repaid. Combined with Azure Pipelines, this contract is enforced automatically on every change.
