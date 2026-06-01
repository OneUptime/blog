# Validation Summary: How to Configure Staging Environments and Preview Branches

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Static Web Apps
- Azure Static Web Apps preview and named environments
- GitHub Actions
- Azure CLI
- staticwebapp.config.json
- JavaScript/Node.js environment variables

## Sources Consulted
- Microsoft Learn: Review pull requests in pre-production environments - https://learn.microsoft.com/en-us/azure/static-web-apps/review-publish-pull-requests
- Microsoft Learn: Preview environments in Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/preview-environments
- Microsoft Learn: Create named preview environments in Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/named-environments
- Microsoft Learn: Configure application settings for Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/application-settings
- Microsoft Learn: az staticwebapp appsettings - https://learn.microsoft.com/en-us/cli/azure/staticwebapp/appsettings?view=azure-cli-latest
- Microsoft Learn: az staticwebapp environment - https://learn.microsoft.com/en-us/cli/azure/staticwebapp/environment?view=azure-cli-latest
- Microsoft Learn: Configure Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Microsoft Learn: Configure password protection - https://learn.microsoft.com/en-us/azure/static-web-apps/password-protection
- GitHub Docs: Deploying to Azure Static Web App - https://docs.github.com/en/actions/how-tos/managing-workflow-runs-and-deployments/deploying-to-third-party-platforms/deploying-to-azure-static-web-app

## Issues Found
- The preview URL examples omitted the location segment used in Azure Static Web Apps preview environment URL patterns. Updated the URL pattern and sample PR comment to include `<LOCATION>`.
- The workflow example used `actions/checkout@v3`; current GitHub documentation uses `actions/checkout@v5`. Updated the example.
- The app settings section claimed settings apply uniformly by default and used `AZURE_STATIC_WEB_APPS_ENVIRONMENT`, which is not documented as a Static Web Apps API environment variable. Reworked the example to use documented per-environment app settings and the CLI `--environment-name` option.
- The password protection section showed a `forwardingGateway` configuration, which restricts access through a forwarding gateway such as Azure Front Door and is not password protection. Replaced it with the documented Azure portal password protection flow and a valid authentication route-rule alternative.
- The named environment section used `az staticwebapp environment create`, but the Azure CLI environment command group does not include a `create` command. Replaced it with the documented `deployment_environment` input for the Static Web Apps GitHub Action.

## Review Notes
The local Azure CLI was not installed in the review environment, so CLI syntax was validated against Microsoft Learn rather than local `az --help` output.
