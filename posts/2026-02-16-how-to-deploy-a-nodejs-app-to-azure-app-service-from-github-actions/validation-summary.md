# Validation Summary: How to Deploy a Node.js App to Azure App Service from GitHub Actions

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure App Service
- Azure CLI
- Node.js
- Express
- GitHub Actions
- Azure Login GitHub Action
- Azure Web Apps Deploy GitHub Action
- Azure App Service Settings GitHub Action
- npm

## Sources Consulted
- Microsoft Learn: Configure a Node.js app for Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- Microsoft Learn: Deploy to Azure App Service by using GitHub Actions: https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions
- Microsoft Learn: Language runtime support policy for Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/language-support-policy
- Microsoft Learn: Azure CLI `az webapp` reference: https://learn.microsoft.com/en-us/cli/azure/webapp
- Microsoft Learn: Set up staging environments in Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Azure Login GitHub Action documentation: https://github.com/Azure/login
- Azure Web Apps Deploy GitHub Action documentation: https://github.com/Azure/webapps-deploy
- Azure App Service Settings GitHub Action documentation: https://github.com/Azure/appservice-settings
- npm CLI `npm ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js Release Working Group schedule: https://github.com/nodejs/release

## Issues Found
- The prerequisites and workflow used Node.js 18/20. Node.js 18 is already end-of-life, and Node.js 20 reached end-of-life on April 30, 2026. Updated the post to use current LTS versions, with Node.js 24 in the Azure CLI and GitHub Actions examples.
- The App Service plan used the B1 tier while the post later recommended staging deployment slots. Deployment slots require Standard, Premium, or Isolated tiers. Updated the example to S1 and added the required staging slot creation command.
- The post said App Service runs Node.js apps on port 8080 by default and explicitly set `PORT=8080`. Current App Service guidance is to read the platform-provided `PORT` environment variable. Removed the manual `PORT` setting and corrected the explanation.
- The service principal option was labeled "More Secure, Recommended" even though Azure Login now recommends OIDC for production authentication. Reworded the section to describe the client-secret service principal as a scoped alternative and mention OIDC as the production preference.
- The workflow used `npm ci --production`. Updated it to `npm ci --omit=dev`, matching current npm guidance for omitting development dependencies.
- The artifact explanation said the deploy job uses exactly what was tested, but the deploy job reinstalls production dependencies. Reworded it to say the deploy job uses the same source and build output that was tested.
- The staging workflow assumed the `staging` deployment slot already existed. Added the Azure CLI command to create the slot.

## Review Notes
- Azure CLI was not installed in the local workspace, so command verification was performed against official Microsoft Learn CLI documentation rather than local `az --help` output.
- The GitHub Actions examples still use secret-based Azure Login because that is the workflow pattern already used by the post. A future improvement would be to provide a full OIDC workflow using `permissions: id-token: write` and `client-id`, `tenant-id`, and `subscription-id` inputs.
