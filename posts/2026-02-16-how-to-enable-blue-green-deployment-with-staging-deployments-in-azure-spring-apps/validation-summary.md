# Validation Summary: How to Enable Blue-Green Deployment with Staging Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Spring Apps
- Azure CLI spring extension
- Blue-green deployments
- Staging deployments
- GitHub Actions
- Maven
- Spring Boot actuator endpoints
- SQL database migrations

## Sources Consulted
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- Microsoft Learn: Set up a staging environment in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-staging-environment
- Microsoft Learn: Blue-green deployment strategies in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concepts-blue-green-deployment-strategies
- Microsoft Learn: Zero downtime deployment in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concept-zero-downtime-deployment
- Microsoft Learn: App and Deployment in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concept-understand-app-and-deployment
- Microsoft Learn: Azure CLI az spring app reference - https://learn.microsoft.com/en-us/cli/azure/spring/app?view=azure-cli-latest
- Microsoft Learn: Azure CLI az spring app deployment reference - https://learn.microsoft.com/en-us/cli/azure/spring/app/deployment?view=azure-cli-latest
- Microsoft Learn: Azure CLI az spring test-endpoint reference - https://learn.microsoft.com/en-us/cli/azure/spring/test-endpoint?view=azure-cli-latest
- Azure Login GitHub Action README - https://github.com/Azure/login
- GitHub Docs: Building and testing Java with Maven - https://docs.github.com/en/actions/guides/building-and-testing-java-with-maven

## Issues Found
- Azure Spring Apps is in retirement and the Azure CLI `spring` command group is deprecated. Added a note that the tutorial applies to existing Azure Spring Apps customers during the retirement period ending March 31, 2028.
- The post implied all Azure Spring Apps plans support two deployments. Updated the wording to Standard and Enterprise plans, matching Microsoft documentation.
- The staging test endpoint example used `az spring test-endpoint list --service`, but the CLI reference requires `--name` for the Azure Spring Apps service instance. Updated the command.
- The staging test endpoint section queried deployment instances while saying it was retrieving a test URL. Changed that example to check `properties.provisioningState` and added a `primaryTestEndpoint` query for the actual test endpoint URL.
- The test endpoint enable instruction showed a list command. Changed it to `az spring test-endpoint enable`.
- The production endpoint example had the app and service names reversed. Corrected it to the documented `<service-name>-<app-name>.azuremicroservices.io` pattern.
- The GitHub Actions workflow used older action versions. Updated `actions/setup-java` to v4 and `azure/login` to v2.
- The GitHub Actions workflow used `az spring app deployment create` for every run, which would fail after the staging deployment already exists. Changed it to `az spring app deploy --deployment staging`.
- The database migration note said both versions briefly handle traffic during the swap. Adjusted it to the more accurate rollout and rollback window, where either version may need to run against the shared database.
- The troubleshooting section attributed slow swaps to DNS caching. Reworded it to Azure Spring Apps ingress routing and service registration, which matches the documented switch behavior.

## Review Notes
The remaining Azure Spring Apps commands are technically valid for existing customers but are deprecated because the service is in retirement. Future posts should prefer Azure Container Apps or AKS for new workloads.
