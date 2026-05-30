# Validation Summary: How to Troubleshoot Application Startup Failures in Azure Spring Apps

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Spring Apps
- Azure CLI
- Azure Monitor Activity Log
- Azure Database for PostgreSQL Flexible Server
- Spring Boot
- Spring Framework dependency injection
- Java runtime configuration
- HikariCP datasource configuration

## Sources Consulted
- Microsoft Learn: Azure Spring Apps documentation - https://learn.microsoft.com/en-us/azure/spring-apps/
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/architecture/example-scenario/blue-green-spring/blue-green-spring
- Microsoft Learn: Azure Spring Apps FAQ - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/faq
- Microsoft Learn: Azure CLI `az spring app` reference - https://learn.microsoft.com/en-us/cli/azure/spring/app?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az spring app deployment` reference - https://learn.microsoft.com/en-us/cli/azure/spring/app/deployment?view=azure-cli-latest
- Microsoft Learn: Debug your apps remotely in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-remote-debugging-app-instance
- Microsoft Learn: Monitor app lifecycle events using Azure Activity Log and Azure Service Health - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/monitor-app-lifecycle-events
- Microsoft Learn: Azure CLI `az monitor activity-log` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log
- Spring Boot Reference: Externalized Configuration - https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html
- Spring Boot Reference: Auto-configuration - https://docs.spring.io/spring-boot/reference/using/auto-configuration.html
- Spring Framework Reference: Dependency Injection - https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html
- Spring Framework Javadoc: `@Lazy` - https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/context/annotation/Lazy.html

## Issues Found
- The post did not mention the Azure Spring Apps retirement period. Added a note that Basic, Standard, and Enterprise plans entered retirement on March 17, 2025 and are scheduled for retirement on March 31, 2028, so the guide applies to existing workloads during the support window.
- The `az spring app deployment show` example used `--deployment default`, but the deployment command requires `--name`/`-n` for the deployment name. Changed it to `--name default`.
- The deployment status query only returned `properties.provisioningState` as `status`. Updated the query to return both `properties.status` and `properties.provisioningState`.
- The empty-logs troubleshooting command queried an app property rather than system or lifecycle events. Replaced it with an Azure Activity Log query scoped to the app resource ID.
- The environment-variable check queried the app resource instead of the deployment settings. Changed it to `az spring app deployment show --query "properties.deploymentSettings.environmentVariables"`.
- The Azure PostgreSQL Flexible Server JDBC example used the older `admin@server` username style. Changed it to a plain flexible-server username.
- The port guidance stated only port 1025 and implied Azure Spring Apps sets `SERVER_PORT` automatically. Updated it to distinguish Basic/Standard port 1025 from Enterprise port 8080 and removed the unsupported automatic `SERVER_PORT` claim.
- The remote debugging example used raw JDWP JVM options. Replaced it with the supported `az spring app enable-remote-debugging` command and noted IDE connection through the Azure Toolkit for IntelliJ or Azure Spring Apps VS Code extension.

## Review Notes
The Azure Spring Apps CLI command group is currently marked deprecated in Microsoft Learn because the service is in retirement, but the commands remain documented for existing customers during the support window. The Spring Boot examples are syntactically valid as snippets, assuming the usual imports are present in a real application.
