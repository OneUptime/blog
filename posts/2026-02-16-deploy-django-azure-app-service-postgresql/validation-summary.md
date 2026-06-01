# Validation Summary: How to Deploy a Django Application to Azure App Service with PostgreSQL

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure App Service
- Azure Database for PostgreSQL Flexible Server
- Azure CLI
- Django
- Python
- Gunicorn
- WhiteNoise
- PostgreSQL

## Sources Consulted
- Microsoft Learn: Configure a Linux Python app for Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-language-python
- Microsoft Learn: Azure CLI `az webapp` reference - https://learn.microsoft.com/en-us/cli/azure/webapp?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az webapp config ssl` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/ssl?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az postgres flexible-server` reference - https://learn.microsoft.com/en-us/cli/azure/postgres/flexible-server?view=azure-cli-latest
- Microsoft Learn: Deploy to Azure App Service by using local Git - https://learn.microsoft.com/en-us/azure/app-service/deploy-local-git
- Microsoft Learn: Run your app from a ZIP package in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-run-package
- Microsoft Learn: Manage an App Service plan in Azure - https://learn.microsoft.com/en-us/azure/app-service/app-service-plan-manage
- Microsoft Learn: Azure Database for PostgreSQL TLS overview - https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/security-tls
- Django documentation: Settings, including `STORAGES` - https://docs.djangoproject.com/en/4.2/ref/settings/

## Issues Found
- ZIP deployment did not explicitly enable App Service build automation. Added `SCM_DO_BUILD_DURING_DEPLOYMENT="1"` to app settings so Oryx installs Python dependencies and runs the Django build steps for ZIP deployment.
- Local Git deployment omitted the current SCM basic authentication requirement. Added the Azure Resource Manager command to enable SCM basic auth before configuring local Git deployment.
- The custom domain SSL example created a managed certificate but did not bind it to the hostname. Updated the snippet to capture the certificate thumbprint and bind it with `az webapp config ssl bind --ssl-type SNI`.
- The scale-out example used `az webapp scale`, which is not the normal command for scaling a standard App Service plan instance count. Replaced it with `az appservice plan update --number-of-workers 3`.

## Review Notes
- The Django settings snippet is broadly correct for Django 4.2+ and WhiteNoise, but production projects should avoid a fallback `SECRET_KEY` and should consider stronger PostgreSQL TLS verification such as `verify-full` or `verify-ca` where certificate handling is configured.
- Running migrations in a startup script is functional for simple deployments, but larger production deployments often run migrations as a separate release step to avoid repeated concurrent migration attempts during scale-out.
