# Validation Summary: How to Set Up Automated Test Execution in Azure Test Plans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Test Plans
- Azure DevOps work item test case automation fields
- Azure Pipelines YAML
- VSTest task
- Visual Studio Test Platform Installer task
- .NET
- NUnit
- MSTest
- Selenium WebDriver for .NET

## Sources Consulted
- Microsoft Learn: Set up automated testing with Azure Test Plans - https://learn.microsoft.com/en-us/azure/devops/test/automated-testing-overview?view=azure-devops
- Microsoft Learn: Associate automated tests with test cases - https://learn.microsoft.com/en-us/azure/devops/test/associate-automated-test-with-test-case?view=azure-devops
- Microsoft Learn: Run automated tests from test plans - https://learn.microsoft.com/en-us/azure/devops/test/run-automated-tests-from-test-hub?view=azure-devops
- Microsoft Learn: VSTest@3 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/vstest-v3?view=azure-pipelines
- Microsoft Learn: VisualStudioTestPlatformInstaller@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/visual-studio-test-platform-installer-v1?view=azure-pipelines
- Microsoft Learn: PublishTestResults@2 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/test/publish-test-results
- Microsoft Learn: Azure DevOps build and test integration fields - https://learn.microsoft.com/en-us/azure/devops/boards/queries/build-test-integration?view=azure-devops
- Microsoft Learn: MSTest attributes and TestPropertyAttribute - https://learn.microsoft.com/en-us/dotnet/core/testing/unit-testing-mstest-writing-tests-attributes?view=vs-2022
- NUnit Docs: PropertyAttribute - https://docs.nunit.org/articles/nunit/writing-tests/attributes/property.html
- NUnit API Docs: TestContext.AddTestAttachment - https://docs.nunit.org/api/NUnit.Framework.TestContext.html
- Selenium .NET API Docs: ITakesScreenshot and Screenshot.SaveAsFile - https://www.selenium.dev/selenium/docs/api/dotnet/webdriver/OpenQA.Selenium.ITakesScreenshot.html and https://www.selenium.dev/selenium/docs/api/dotnet/webdriver/OpenQA.Selenium.Screenshot.html
- Selenium .NET API Docs: ChromiumOptions.AddArgument and ChromeDriver - https://www.selenium.dev/selenium/docs/api/dotnet/webdriver/OpenQA.Selenium.Chromium.ChromiumOptions.html

## Issues Found
- The post incorrectly said Azure DevOps links Selenium tests to Azure Test Plans by matching custom `TestCaseId` properties in test code. Updated the architecture and explanation to state that custom properties are only traceability metadata; Azure DevOps association is completed through the test case's associated automation metadata after the test appears in published pipeline results.
- The MSTest section described `TestProperty("TestCaseId", "...")` as built-in Azure Test Plans association. Updated it to describe `TestProperty` as custom metadata and point readers to the Azure DevOps association step.
- The pipeline declared `testPlanId`, `testSuiteId`, and `testConfigId` variables but did not use them, and used `DotNetCoreCLI@2` plus `PublishTestResults@2` as if that selected associated Test Plans tests. Replaced the execution step with `VSTest@3` using `testSelector: testPlan`, `testPlan`, `testSuite`, and `testConfiguration`, and added `VisualStudioTestPlatformInstaller@1` with `vsTestVersion: toolsInstaller`.
- The Chrome installation command used deprecated `apt-key`. Replaced it with a keyring-based `signed-by` repository setup.
- The REST API example only set `AutomatedTestName` and `AutomatedTestStorage`. Added `AutomatedTestType` and `AutomationStatus`, and clarified that programmatic updates require knowing the exact automated test metadata Azure DevOps expects.
- The Test Plans run instructions referenced "Run with options" and "Automated tests", which does not match the current documented flow. Updated the text to require test plan settings with a build pipeline and a release pipeline or stage running Visual Studio Test, then selecting automated test cases and choosing "Run for web application."
- Several C# snippets omitted required namespaces or were not syntactically complete as shown. Added missing `using System;` and wrapped the screenshot teardown example in a class with the necessary imports.

## Review Notes
- The tutorial now follows the supported Azure Test Plans association model, but teams should still verify their exact test adapter output before using the REST API approach because automated test metadata values can vary by framework and adapter.
