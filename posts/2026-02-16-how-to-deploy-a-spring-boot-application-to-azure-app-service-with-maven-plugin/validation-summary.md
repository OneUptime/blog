# Validation Summary: How to Deploy a Spring Boot Application to Azure App Service with Maven Plugin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Spring Boot
- Java
- Maven
- Azure App Service
- Azure Web App Maven Plugin
- Azure CLI
- Azure Application Insights
- Azure Monitor Autoscale

## Sources Consulted
- Microsoft Learn: Quickstart: Create a Java app on Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/quickstart-java
- Microsoft Learn: Deploy and configure Tomcat, JBoss EAP, or Java SE apps in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-language-java-deploy-run
- Microsoft Learn: Azure App Service app settings reference - https://learn.microsoft.com/en-us/azure/app-service/reference-app-settings
- Microsoft Learn: Set up staging environments in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots
- Microsoft Learn: Azure CLI `az webapp config set` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config
- Microsoft Learn: Azure CLI `az appservice plan update` reference - https://learn.microsoft.com/en-us/cli/azure/appservice/plan
- Microsoft Learn: Azure CLI `az webapp deployment slot swap` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/deployment
- Microsoft Learn: Monitor Azure App Service with Application Insights - https://learn.microsoft.com/en-us/azure/azure-monitor/app/azure-web-apps-net
- Microsoft Learn: Configure APM platforms for Java apps in Azure App Service - https://learn.microsoft.com/en-us/azure/app-service/configure-language-java-apm
- Microsoft Learn: Application Insights connection strings - https://learn.microsoft.com/en-us/azure/azure-monitor/app/connection-strings
- Microsoft Azure Maven Plugins GitHub repository and wiki - https://github.com/microsoft/azure-maven-plugins
- Spring Boot project documentation - https://spring.io/projects/spring-boot

## Issues Found
- The Azure Web App Maven Plugin version was older than the current Microsoft quickstart. Updated `azure-webapp-maven-plugin` from `2.12.0` to `2.14.1`.
- The Maven plugin configuration omitted the recommended `schemaVersion` and JAR resource `type`. Added `<schemaVersion>v2</schemaVersion>` and `<type>jar</type>`.
- The sample scaling commands referenced `my-spring-boot-app-plan`, but the Maven plugin configuration did not name that App Service Plan. Added `<servicePlanName>my-spring-boot-app-plan</servicePlanName>`.
- The sample used `B1` while later demonstrating deployment slots. Deployment slots require Standard, Premium, or Isolated tiers, so the sample tier was changed to `S1` and a note was added.
- The service principal command scoped permissions to a resource group that might not exist yet. Changed the scope to the subscription used by the sample deployment.
- The Azure profile hard-coded `server.port=80`. Updated it to `server.port=${PORT:8080}` to align with Linux Java SE App Service port injection.
- The custom startup command placed JVM heap options after `-jar`, where they would be treated as application arguments. Moved `-Xms` and `-Xmx` before `-jar`.
- The Application Insights example used the older `applicationinsights-spring-boot-starter` and instrumentation-key properties. Replaced it with App Service-managed Java 3.x agent configuration using `APPLICATIONINSIGHTS_CONNECTION_STRING` and `ApplicationInsightsAgent_EXTENSION_VERSION=~3`.
- The scale-out command updated web app site configuration instead of the App Service Plan worker count. Replaced it with `az appservice plan update --number-of-workers 3`.
- The troubleshooting note said App Service expects `PORT` or port 80. Clarified that Linux Java SE exposes the port through the `PORT` environment variable.

## Review Notes
Spring Boot `3.2.0` is syntactically valid for the shown Java 17 example, but it is no longer a current Spring Boot line as of this review date. A future content refresh should consider moving the sample to a currently supported Spring Boot release line.
