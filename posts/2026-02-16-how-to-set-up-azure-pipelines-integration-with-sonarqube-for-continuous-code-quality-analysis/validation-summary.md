# Validation Summary: How to Set Up Azure Pipelines Integration with SonarQube

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps service connections and pipeline tasks
- SonarQube Server
- SonarQube Cloud
- SonarScanner for .NET
- SonarScanner CLI
- .NET test coverage with Coverlet/OpenCover format
- JavaScript and TypeScript analysis with Jest LCOV coverage
- Python analysis with pytest and coverage.py

## Sources Consulted
- Microsoft Learn: SonarQubePrepare@8 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-prepare-v8?view=azure-pipelines
- Microsoft Learn: SonarQubeAnalyze@8 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-analyze-v8?view=azure-pipelines
- Microsoft Learn: SonarQubePublish@8 task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/sonar-qube-publish-v8?view=azure-pipelines
- SonarQube Server docs: Azure DevOps extension for SonarQube Server: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/scanners/sonarqube-extension-for-azure-devops
- SonarQube Server docs: SonarQube tasks for Azure Pipelines: https://docs.sonarsource.com/sonarqube-server/2026.1/devops-platform-integration/azure-devops-integration/adding-analysis-to-pipeline/sonarqube-tasks
- SonarQube Server docs: Pull request analysis setup: https://docs.sonarsource.com/sonarqube-server/2025.3/analyzing-source-code/pull-request-analysis/setting-up-the-pull-request-analysis/
- SonarQube Cloud docs: Azure Pipelines task list: https://docs.sonarsource.com/sonarqube-cloud/analyzing-source-code/ci-based-analysis/azure-pipelines/sonarqube-tasks
- SonarQube Server docs: JavaScript/TypeScript/CSS analysis: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/languages/javascript-typescript-css
- SonarQube Server docs: test coverage parameters: https://docs.sonarsource.com/sonarqube-server/analyzing-source-code/test-coverage/test-coverage-parameters
- SonarQube Server docs: test execution parameters: https://docs.sonarsource.com/sonarqube-server/latest/analyzing-source-code/test-coverage/test-execution-parameters/
- Node.js official release information: https://nodejs.org/en/about/previous-releases

## Issues Found
- The Azure Pipelines examples used `SonarQubePrepare@6`, `SonarQubeAnalyze@6`, and `SonarQubePublish@6`. Current SonarQube Server extension v8 dropped v5/v6 tasks, so the examples were updated to `@8`.
- The Azure Pipelines examples used old `scannerMode` values such as `MSBuild` and `CLI`. Current v8 task inputs use `dotnet` and `cli`, so those values were corrected.
- The prerequisites mixed SonarQube Server and SonarQube Cloud as if they used the same Azure DevOps extension and service endpoint. The text now states that SonarQube Cloud uses a separate extension and task family.
- The post implied Community Build supports pull request analysis and PR decoration. The prerequisites and PR section now state that these require SonarQube Server Developer Edition or above, or SonarQube Cloud.
- The pull request example manually set obsolete or unsupported Azure DevOps PR decoration properties. The example now relies on Azure Pipelines automatic pull request parameter detection and adds `checkout: self` with `fetchDepth: 0` for complete repository metadata.
- The JavaScript/TypeScript example used Node.js 18, which is end-of-life. It now uses Node.js 24.x.
- The JavaScript/TypeScript example used `sonar.typescript.tsconfigPath`, but the current documented property is `sonar.typescript.tsconfigPaths`. The property name was corrected.
- The monorepo example used deprecated `sonar.modules` and module-prefixed properties. It now uses project-level `sonar.sources`, `sonar.tests`, and coverage report path properties.
- The PR decoration troubleshooting note incorrectly focused on a SonarQube analysis token and manual PR properties. It now points to the Azure DevOps PAT configured in SonarQube, repository binding, and shallow checkout.

## Review Notes
The quality gate API script is a simple branch-project example. For complex branch or pull request pipelines, a production implementation should query the analysis task/report context rather than assuming the latest project-level status is the intended analysis.
