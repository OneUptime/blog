# Validation Summary: How to Configure Auto-Heal Rules for Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- App Service Auto-Heal
- Azure CLI
- ARM templates
- Azure Monitor Logs
- Log Analytics
- Diagnostics as a Service (DaaS)

## Sources Consulted
- Microsoft Learn: Azure CLI `az webapp config set` documentation, including `--auto-heal-enabled` and `--generic-configurations`: https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: Azure CLI `az webapp config appsettings set` documentation: https://learn.microsoft.com/en-us/cli/azure/webapp/config/appsettings
- Microsoft Learn: ARM template reference for `Microsoft.Web/sites/config` `autoHealRules`, triggers, and actions: https://learn.microsoft.com/en-us/azure/templates/microsoft.web/2022-03-01/sites/config-web
- Microsoft Learn: App Service diagnostics overview and Auto-Heal trigger categories: https://learn.microsoft.com/en-gb/azure/app-service/overview-diagnostics
- Azure App Service team: Announcing Auto Heal for Linux, including supported triggers and recycle-only action: https://azure.github.io/AppService/2021/04/21/Announcing-Autoheal-for-Azure-App-Service-Linux.html
- Azure App Service team: Introducing Proactive Auto Heal, including default enablement, memory and slow request rules, and `WEBSITE_PROACTIVE_AUTOHEAL_ENABLED`: https://azure.github.io/AppService/2017/08/17/Introducing-Proactive-Auto-Heal.html
- Azure App Service team: Auto-Healing and Crash Monitoring integration with Azure Monitor, including `AppServicePlatformLogs` and operation names: https://azure.github.io/AppService/2022/04/05/Announcing-Azure-Monitor-Integration-with-Crash-Monitoring-copy.html
- Microsoft Learn: App Service diagnostic logging and Log Analytics / log streaming context: https://learn.microsoft.com/en-us/azure/app-service/troubleshoot-diagnostic-logs

## Issues Found
- The Azure CLI section said to use a JSON configuration and described detailed trigger thresholds, but the shown command only enables Auto-Heal with `--auto-heal-enabled true`. Updated the wording and comments so the example accurately describes what the command does, and noted `--generic-configurations`, REST API, or ARM templates for detailed rules.
- The Linux section incorrectly implied Linux Auto-Heal is configured only through app settings and used `WEBSITE_PROACTIVE_AUTOHEAL_ENABLED` as if it configured custom Auto-Heal rules. Updated it to distinguish custom Auto-Heal for Linux from proactive Auto-Heal, and to reflect the documented Linux custom Auto-Heal triggers and recycle-only action.
- The monitoring section incorrectly stated that Auto-Heal recycles show up as Application Insights availability events and in the Azure Activity Log. Updated it to point readers to Azure Monitor Diagnostic settings and the `AppServicePlatformLogs` table, which is the documented logging path for Auto-Healing events.

## Review Notes
The ARM template snippets use documented `autoHealRules` fields and valid action names. The DaaS custom action example is Windows-specific because it uses a `D:\home` path, which is appropriate in the surrounding Windows App Service context but would not apply to Linux App Service.
