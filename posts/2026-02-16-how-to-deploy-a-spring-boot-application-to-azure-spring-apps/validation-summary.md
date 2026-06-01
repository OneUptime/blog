# Validation Summary: How to Deploy a Spring Boot Application to Azure Spring Apps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Spring Apps
- Azure CLI spring extension
- Spring Boot
- Java 17
- Maven
- Azure Key Vault
- Spring Cloud Azure
- GitHub Actions
- Spring Boot Actuator

## Sources Consulted
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- Microsoft Learn: Azure Spring Apps overview - https://learn.microsoft.com/en-us/azure/spring-apps/overview
- Microsoft Learn: How to deploy Spring Boot applications from Azure CLI - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-launch-from-source
- Microsoft Learn: Azure CLI az spring command reference - https://learn.microsoft.com/en-us/cli/azure/spring?view=azure-cli-latest
- Microsoft Learn: Azure CLI az spring app command reference - https://learn.microsoft.com/en-us/cli/azure/spring/app?view=azure-cli-latest
- Microsoft Learn: App and deployment in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concept-understand-app-and-deployment
- Microsoft Learn: Connect Azure Spring Apps to Key Vault using managed identities - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/tutorial-managed-identities-key-vault
- Microsoft Learn: Spring Cloud Azure secret management - https://learn.microsoft.com/en-us/azure/developer/java/spring-framework/secret-management
- Microsoft Learn: Configure health probes and graceful termination for Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/enterprise/how-to-configure-health-probes-graceful-termination
- GitHub: Azure/spring-apps-deploy action repository - https://github.com/Azure/spring-apps-deploy
- GitHub: actions/setup-java - https://github.com/actions/setup-java
- GitHub: Azure/login - https://github.com/Azure/login

## Issues Found
- Added the current Azure Spring Apps retirement caveat. Microsoft announced that Basic, Standard, and Enterprise plans entered retirement on March 17, 2025 and retire on March 31, 2028, so the original production guidance was incomplete for a 2026 post.
- Corrected the description of an Azure Spring Apps application. The original text described an application as a deployment slot; Azure documents apps and deployments as separate resource model concepts.
- Expanded the Key Vault example. Setting only the Key Vault endpoint environment variable is not enough; the app also needs a managed identity, Key Vault secret permissions, and the Spring Cloud Azure Key Vault starter.
- Replaced the GitHub Actions deployment action usage with an Azure CLI deployment step. The Azure/spring-apps-deploy repository is archived as of March 24, 2026, so using the CLI is a more current deployment path.
- Updated GitHub Actions examples from actions/setup-java@v3 and azure/login@v1 to current major versions.
- Corrected the health probe claim. Azure Spring Apps provides default TCP health probes; Actuator HTTP probe paths such as `/actuator/health/liveness` and `/actuator/health/readiness` must be configured explicitly if desired.

## Review Notes
The Azure CLI examples use the deprecated `az spring` command group because Azure Spring Apps itself is in retirement. The commands remain documented, but new long-term workloads should prefer Azure Container Apps or AKS migration paths.
