# Validation Summary: How to Set Up CodeCatalyst Dev Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CodeCatalyst Dev Environments
- AWS CLI `codecatalyst` commands
- Devfile 2.0.0
- AWS Toolkit for Visual Studio Code
- AWS Toolkit for JetBrains Gateway
- AWS Cloud9
- VS Code settings
- Node.js / npm setup commands

## Sources Consulted
- Amazon CodeCatalyst User Guide: Write and modify code with Dev Environments: https://docs.aws.amazon.com/codecatalyst/latest/userguide/devenvironment.html
- Amazon CodeCatalyst User Guide: Creating a Dev Environment: https://docs.aws.amazon.com/codecatalyst/latest/userguide/devenvironment-create.html
- Amazon CodeCatalyst User Guide: Configuring a devfile for a Dev Environment: https://docs.aws.amazon.com/codecatalyst/latest/userguide/devenvironment-devfile.html
- Amazon CodeCatalyst User Guide: Devfile components: https://docs.aws.amazon.com/codecatalyst/latest/userguide/devenvironment-devfile-components.html
- Amazon CodeCatalyst User Guide: Stopping a Dev Environment: https://docs.aws.amazon.com/codecatalyst/latest/userguide/devenvironment-stop.html
- AWS CLI Command Reference: `create-dev-environment`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/create-dev-environment.html
- AWS CLI Command Reference: `list-dev-environments`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/list-dev-environments.html
- AWS CLI Command Reference: `get-dev-environment`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/get-dev-environment.html
- AWS CLI Command Reference: `start-dev-environment`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/start-dev-environment.html
- AWS CLI Command Reference: `stop-dev-environment`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/stop-dev-environment.html
- AWS CLI Command Reference: `delete-dev-environment`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/delete-dev-environment.html
- AWS CLI Command Reference: `update-dev-environment`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/update-dev-environment.html
- AWS CLI Command Reference: `update-project`: https://docs.aws.amazon.com/cli/latest/reference/codecatalyst/update-project.html
- AWS Toolkit for VS Code User Guide: Working with Amazon CodeCatalyst resources in VS Code: https://docs.aws.amazon.com/toolkit-for-vscode/latest/userguide/codecatalyst-overview.html
- AWS Toolkit for JetBrains User Guide: Getting Started with CodeCatalyst and the AWS Toolkit for JetBrains: https://docs.aws.amazon.com/toolkit-for-jetbrains/latest/userguide/codecatalyst-setup.html
- Devfile documentation: Creating devfiles: https://devfile.io/docs/2.2.0/create-devfiles

## Issues Found
- Amazon CodeCatalyst is no longer open to new customers. Added a note that the guide applies to existing CodeCatalyst customers.
- The post referred to a CodeCatalyst VS Code extension/toolkit. Updated this to the AWS Toolkit extension, which is the documented integration.
- The JetBrains IDE list included unsupported examples such as WebStorm. Updated the list to the documented supported IDEs: IntelliJ IDEA Ultimate, PyCharm Professional, and GoLand.
- The CLI `create-dev-environment` example omitted `--ides`, which AWS documents as required for Dev Environment creation. Added a VS Code IDE configuration.
- The devfile example used unsupported CodeCatalyst devfile fields such as endpoint definitions, memory limits, and top-level volumes. Replaced the sample with CodeCatalyst-supported container, command, and `postStart` event fields.
- The lifecycle script section used undocumented `.codecatalyst/scripts/on-create.sh` and `on-resume.sh` paths. Replaced it with documented devfile `postStart` events.
- Example Dev Environment IDs used `devenv-abc123`, but AWS CLI documents UUID-shaped IDs. Updated the examples to use a UUID-shaped placeholder.
- The cost-management CLI example used unsupported `aws codecatalyst update-project --dev-environment-settings`. Replaced it with `aws codecatalyst update-dev-environment --inactivity-timeout-minutes`.
- The VS Code settings snippet contained a comment but was fenced as JSON. Changed the fence to `jsonc`.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI verification was performed against the official AWS CLI command reference. YAML and JSON/JSONC snippets in the edited post were parsed locally and passed syntax checks.
