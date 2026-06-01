# Validation Summary: Deploy a Flask REST API to Azure App Service with CI/CD from GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure CLI
- Flask
- Python
- Gunicorn
- pytest
- GitHub Actions
- Azure Web Apps Deploy action
- Azure Application Insights

## Sources Consulted
- Microsoft Learn: Configure a Linux Python app for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-language-python
- Microsoft Learn: Deploy by using GitHub Actions for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions
- Microsoft Learn: Deploy Python web apps to App Service by using GitHub Actions - https://learn.microsoft.com/en-us/azure/developer/python/python-web-app-github-actions-app-service
- Microsoft Learn: Azure CLI `az webapp config set` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: Azure CLI `az webapp deployment list-publishing-profiles` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Azure CLI `az appservice plan update` reference - https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Microsoft Learn: Azure CLI `az webapp log config` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/log
- Microsoft Learn: Create and configure Application Insights resources - https://learn.microsoft.com/en-us/azure/azure-monitor/app/create-workspace-resource
- Microsoft Learn: Azure CLI `az monitor app-insights component` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Azure/webapps-deploy GitHub Action README - https://github.com/Azure/webapps-deploy
- Flask API documentation - https://flask.palletsprojects.com/
- pytest documentation - https://docs.pytest.org/

## Issues Found
- App Service dependency installation was incomplete for the described source deployment. The workflow installed `requirements.txt` on the GitHub Actions runner for tests, but App Service still needs build automation enabled so Azure processes `requirements.txt` during deployment. Added `SCM_DO_BUILD_DURING_DEPLOYMENT=true` to the Azure setup commands.
- The deployment slot example followed creation of a `B1` Basic App Service plan, but Azure deployment slots require Standard, Premium, or Isolated tiers. Added an `az appservice plan update` command to scale the plan to `S1` before creating the staging slot.
- The staging slot workflow referenced a staging publish profile secret without showing how to get the slot-specific publish profile. Added the slot publish profile command using `--slot staging`.
- The Application Insights example used `APPINSIGHTS_INSTRUMENTATIONKEY`. Current Azure guidance uses Application Insights connection strings, so the snippet now queries `connectionString` and sets `APPLICATIONINSIGHTS_CONNECTION_STRING`.

## Review Notes
The Flask sample is suitable as a small tutorial API, but its in-memory task store is not persistent or process-safe under multiple Gunicorn workers. The post already notes that storage should be replaced with a database in production.
