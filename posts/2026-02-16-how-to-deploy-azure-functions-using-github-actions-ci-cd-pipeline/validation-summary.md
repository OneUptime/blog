# Validation Summary: How to Deploy Azure Functions Using GitHub Actions CI/CD Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Functions
- Azure Functions deployment slots
- Azure CLI
- GitHub Actions
- Azure Login action
- Azure Functions GitHub Action
- .NET 8 isolated worker functions
- Node.js functions
- Python functions
- OpenID Connect (OIDC)

## Sources Consulted
- Microsoft Learn: Continuous delivery by using GitHub Actions for Azure Functions: https://learn.microsoft.com/en-us/azure/azure-functions/functions-how-to-github-actions
- Microsoft Learn: Azure Functions deployment slots: https://learn.microsoft.com/en-us/azure/azure-functions/functions-deployment-slots
- Microsoft Learn: Azure Functions deployment technologies: https://learn.microsoft.com/en-us/azure/azure-functions/functions-deployment-technologies
- Microsoft Learn: Azure CLI `az ad sp create-for-rbac`: https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az functionapp deployment slot`: https://learn.microsoft.com/en-us/cli/azure/functionapp/deployment/slot?view=azure-cli-latest
- Azure Login GitHub Action README: https://github.com/Azure/login
- Azure Functions GitHub Action README: https://github.com/Azure/functions-action
- GitHub Actions setup-node README: https://github.com/actions/setup-node
- npm documentation: https://docs.npmjs.com/

## Issues Found
- The service principal setup described OIDC/federated identity while showing a secret-based `az ad sp create-for-rbac` flow. Updated the text to identify it as service principal secret authentication and point readers to the later OIDC section for secretless authentication.
- The Azure CLI command used deprecated `--sdk-auth`. Replaced it with `--json-auth`, which is the current option for JSON credentials.
- The workflow referenced `secrets.AZURE_RESOURCE_GROUP` but the setup instructions did not tell readers to create it. Added that secret to the setup instructions.
- The .NET test step used `--no-build` from the test project directory even though only the function app project had been built. Removed `--no-build` so the test project is built as part of `dotnet test`.
- Updated Azure Login examples from `azure/login@v2` to the current `azure/login@v3` shown in official action examples.
- The deployment slot description incorrectly said slots require the Standard plan or higher. Corrected it to reflect Azure Functions hosting plan support: Consumption supports one extra slot, Premium supports two extra slots, Dedicated plans support more depending on tier, and Flex Consumption does not currently support slots.
- The slot swap explanation implied all execution continues uninterrupted. Clarified that routing is swapped without dropping new requests, but currently running executions can be terminated during the swap.
- The Node.js workflow used npm caching without `cache-dependency-path` even though the package is in a subdirectory. Added `cache-dependency-path` for the function app's `package-lock.json`.
- The Node.js workflow used `npm prune --production`, which npm now advises replacing with omit-based configuration. Changed it to `npm prune --omit=dev`.
- The Python workflow installed `.python_packages` from the repository root while uploading the function app subdirectory. Added `working-directory` to install dependencies into the deployed package directory.
- The staging health check targeted the production hostname. Updated it to use the staging slot hostname pattern.
- The OIDC snippet omitted the required GitHub `id-token: write` permission. Added the permissions block to the snippet.

## Review Notes
The examples remain generic and assume common project paths such as `src/FunctionApp`, `tests/FunctionApp.Tests`, and a `/api/health` endpoint with anonymous access. Readers may need to adjust those paths and health-check authentication for their repository and function app.
