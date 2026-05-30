# Validation Summary: How to Set Up Azure Test Plans Exploratory Testing Sessions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Test Plans
- Azure DevOps
- Test & Feedback browser extension
- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Exploratory testing workflows
- Mermaid diagrams

## Sources Consulted
- Microsoft Learn: Install the Test & Feedback extension: https://learn.microsoft.com/en-us/azure/devops/test/perform-exploratory-tests?view=azure-devops
- Microsoft Learn: Exploratory testing with the Test & Feedback extension in Connected mode: https://learn.microsoft.com/en-us/azure/devops/test/connected-mode-exploratory-testing?view=azure-devops
- Microsoft Learn: Exploratory testing with the Test & Feedback extension in Standalone mode: https://learn.microsoft.com/en-us/azure/devops/test/standalone-mode-exploratory-testing?view=azure-devops
- Microsoft Learn: Explore work items with the Test & Feedback extension: https://learn.microsoft.com/en-us/azure/devops/test/explore-workitems-exploratory-testing?view=azure-devops
- Microsoft Learn: Get insights across your exploratory testing sessions: https://learn.microsoft.com/en-us/azure/devops/test/insights-exploratory-testing?view=azure-devops
- Microsoft Learn: About requesting and providing feedback: https://learn.microsoft.com/en-us/azure/devops/project/feedback/?view=azure-devops
- Visual Studio Marketplace: Test & Feedback extension: https://marketplace.visualstudio.com/items?itemName=ms.vss-exploratorytesting-web

## Issues Found
- The post said all extension output feeds back into Azure DevOps automatically. Updated this to clarify that automatic Azure DevOps integration applies to connected mode; standalone mode exports a local session report.
- The installation instructions referred to searching the Chrome Web Store for "Test & Feedback" by Microsoft DevLabs. Updated the publisher to Microsoft and aligned the flow with Microsoft's Visual Studio Marketplace installation instructions.
- The post implied signing in is always required after installation. Updated this to clarify that signing in is for connected mode and standalone mode does not require Azure DevOps sign-in.
- The automatic capture list claimed browser console logs and full network requests/responses. Microsoft documents user actions as an image action log, page load data, and system information, so the list was corrected.
- The connected-mode startup steps described using the Azure Test Plans Execute tab and "Run with options" for the Test & Feedback extension. Current Microsoft documentation describes exploring work items from Azure Boards or from the extension's Explore work item page, so the steps were corrected.
- The standalone-mode section said bugs still go into Azure DevOps. Updated it to state that standalone bugs are captured in an exported local session report unless connected mode is used.
- The session review instructions pointed only to Test Plans > Runs. Updated them to the documented Test Plans > Runs > Recent exploratory sessions path.
- The extension settings section listed unverified settings for image format, recording quality, and automatic screenshot/console-log capture. Replaced them with documented connection, standalone, and captured-data options.

## Review Notes
The post is technically relevant and now matches current Microsoft documentation for Azure DevOps Services and Azure DevOps Server 2022-era Test & Feedback extension workflows. Firefox support is documented but retiring, so Chrome and Microsoft Edge are the safer recommendations for future readers.
