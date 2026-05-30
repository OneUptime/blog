# Validation Summary: How to Set Up Manual Test Plans and Test Suites in Azure Test Plans

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Test Plans
- Azure DevOps
- Manual test plans, test suites, and test cases
- Microsoft Test Runner
- Test & Feedback browser extension
- Azure DevOps test configurations and reporting

## Sources Consulted
- Microsoft Learn: Create test plans and suites - https://learn.microsoft.com/en-us/azure/devops/test/create-a-test-plan?view=azure-devops
- Microsoft Learn: Run manual tests with Azure Test Plans - https://learn.microsoft.com/en-us/azure/devops/test/run-manual-tests?view=azure-devops
- Microsoft Learn: What is Azure Test Plans? - https://learn.microsoft.com/en-us/azure/devops/test/overview?view=azure-devops
- Microsoft Learn: Share steps between test cases - https://learn.microsoft.com/en-us/azure/devops/test/share-steps-between-test-cases?view=azure-devops
- Microsoft Learn: Repeat a test with different data - https://learn.microsoft.com/en-us/azure/devops/test/repeat-test-with-different-data?view=azure-devops
- Microsoft Learn: Navigate Test Plans - https://learn.microsoft.com/en-us/azure/devops/test/navigate-test-plans?view=azure-devops
- Microsoft Learn: Track test status - https://learn.microsoft.com/en-us/azure/devops/test/track-test-status?view=azure-devops
- Microsoft Learn: Install the Test & Feedback extension - https://learn.microsoft.com/en-us/azure/devops/test/perform-exploratory-tests?view=azure-devops
- Microsoft Learn: Azure Test Plans Sprint 254 Update - https://learn.microsoft.com/en-us/azure/devops/release-notes/2025/testplans/sprint-254-update

## Issues Found
- The requirement-based suite description implied that any test case linked directly to a user story automatically appears in the suite. Microsoft documentation states that adding a test case to a requirement-based suite automatically links it to the backlog item, and requirement traceability is formed through that suite link. Updated the wording to match that behavior.
- The desktop runner section presented the Windows Test Runner desktop client as the recommended option and listed capabilities such as automatic screenshot capture on each step and audio narration. Current Microsoft documentation recommends the browser-based runner and notes that the Windows Test Runner client is retiring. Updated the section to recommend the web-based Microsoft Test Runner for desktop app testing and list documented capabilities.

## Review Notes
The rest of the post aligns with current Azure Test Plans documentation: static, requirement-based, and query-based suites; shared steps; parameterized manual test cases using `@` parameters; test configurations producing separate test points; Test & Feedback exploratory testing; and Charts/Progress reporting are all valid concepts. The post does not include executable code or CLI commands.
