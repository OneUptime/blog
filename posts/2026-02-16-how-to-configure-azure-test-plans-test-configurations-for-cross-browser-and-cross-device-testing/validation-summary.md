# Validation Summary: How to Configure Azure Test Plans Test Configurations for Cross-Browser

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Azure Test Plans
- Azure DevOps REST API
- Azure Pipelines YAML
- PublishTestResults@2
- Playwright
- Bash and curl
- Python JSON parsing

## Sources Consulted
- Microsoft Learn: Test different configurations in Azure Test Plans - https://learn.microsoft.com/en-us/azure/devops/test/test-different-configurations?view=azure-devops
- Microsoft Learn: Create and manage manual test cases - https://learn.microsoft.com/en-us/azure/devops/test/create-test-cases?view=azure-devops
- Microsoft Learn: Run manual tests - https://learn.microsoft.com/en-us/azure/devops/test/run-manual-tests?view=azure-devops
- Microsoft Learn: Azure DevOps Test Plan Variables REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/variables?view=azure-devops-rest-7.1
- Microsoft Learn: Variables - Create REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/variables/create?view=azure-devops-rest-7.1
- Microsoft Learn: Configurations - Create REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/configurations/create?view=azure-devops-rest-7.1
- Microsoft Learn: Test Point - Get Points List REST API - https://learn.microsoft.com/en-us/rest/api/azure/devops/testplan/test-point/get-points-list?view=azure-devops-rest-7.1
- Microsoft Learn: PublishTestResults@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/publish-test-results-v2?view=azure-pipelines
- Microsoft Learn: Azure Pipelines job strategy matrix schema - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/jobs-job-strategy?view=azure-pipelines
- Playwright documentation: Projects - https://playwright.dev/docs/test-projects
- Playwright documentation: Browsers - https://playwright.dev/docs/browsers

## Issues Found
- The configuration variable REST API example used the test configuration endpoint and a test configuration payload. Changed it to use `POST /_apis/testplan/variables?api-version=7.1` with a valid test variable payload.
- The Azure Test Plans UI navigation described a settings gear path. Updated it to the current Test Plans > Configurations workflow documented by Microsoft.
- The post said configurations are assigned only at the suite level. Updated it to note that configurations can also be assigned to individual test cases, and that suite assignment applies unless overridden.
- The test points REST parsing example read `testCase.name`, but the Test Plan API response uses `testCaseReference`. Updated the Python snippet accordingly.
- The Azure Pipelines example used Windows labels while running on `ubuntu-latest`, used Playwright project names that might not exist by default, did not explicitly generate JUnit files for `PublishTestResults@2`, and treated `PublishTestResults@2` `configuration` as an Azure Test Plans configuration ID. Updated the matrix to use valid Playwright project names and VM images, added browser installation and JUnit reporter output, and changed the publishing input to `buildConfiguration`, which is the supported task input for a build configuration label.
- The post recommended archiving configurations, but the REST API models this state as inactive. Updated the wording to "marking them inactive."

## Review Notes
The post is technically relevant and accurate after the fixes. The pipeline example publishes pipeline test results with a configuration label; it does not automatically update existing Azure Test Plans manual test points. A future expansion could show a full Azure DevOps Test Runs REST API integration for automated result association.
