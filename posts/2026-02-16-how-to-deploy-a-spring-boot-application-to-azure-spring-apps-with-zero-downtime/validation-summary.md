# Validation Summary: How to Deploy a Spring Boot Application to Azure Spring Apps with Zero Downtime

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Azure Spring Apps
- Azure CLI spring extension
- Spring Boot
- Spring Boot Actuator health probes
- Azure DevOps Pipelines
- Blue-green deployment / zero-downtime deployment
- Java

## Sources Consulted
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- Microsoft Learn: Blue-green deployment strategies in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concepts-blue-green-deployment-strategies
- Microsoft Learn: Zero Downtime Deployment in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concept-zero-downtime-deployment
- Microsoft Learn: Set up a staging environment in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-staging-environment
- Microsoft Learn: az spring app CLI reference - https://learn.microsoft.com/en-us/cli/azure/spring/app
- Microsoft Learn: az spring app deployment CLI reference - https://learn.microsoft.com/en-us/cli/azure/spring/app/deployment
- Microsoft Learn: az spring test-endpoint CLI reference - https://learn.microsoft.com/en-us/cli/azure/spring/test-endpoint
- Microsoft Learn: Azure Spring Apps FAQ - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/faq
- Spring Boot Reference: Graceful Shutdown - https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Spring Boot Reference: Actuator endpoints and Kubernetes probes - https://docs.spring.io/spring-boot/reference/actuator/endpoints.html

## Issues Found
- The post did not mention that Azure Spring Apps entered retirement on March 17, 2025 and is scheduled for retirement on March 31, 2028. Added a caveat that the guide applies to existing Azure Spring Apps customers during the retirement period.
- The prerequisites implied any Azure subscriber could create a new Azure Spring Apps workload. Added the current new-customer restriction for Basic, Standard, and Enterprise plans after March 17, 2025.
- The Azure CLI examples did not mention that the `az spring` command group is deprecated during Azure Spring Apps retirement. Added a short note while keeping the commands, because they remain the documented CLI surface for existing workloads.
- The staging test endpoint command used `--service`, but `az spring test-endpoint list` takes the service instance name with `--name` and accepts `--app` and `--deployment` for deployment-specific endpoints. Corrected the command.
- The post described the staging deployment as having its own ordinary endpoint. Updated the wording to say it is tested through the Azure Spring Apps test endpoint and noted default basic authentication.
- The traffic switch comment claimed the swap happens without dropping connections. Rephrased it to the documented behavior: switching the active production deployment without taking the app offline.
- The deployment flow and pipeline implied that future releases could always deploy to a deployment literally named `staging`. Clarified that after the first swap, the old production deployment, such as `default`, is the inactive deployment and should be used for the next cycle.
- The pipeline used `az spring app deployment create` for deployment updates. Changed the pipeline to use `az spring app deploy --deployment staging`, which is the documented command for deploying new code to an existing deployment.
- The pipeline claimed validation but did not include a validation step. Added a smoke-test curl against the corrected test endpoint.

## Review Notes
The Spring Boot graceful shutdown and Actuator probe configuration is syntactically valid. The Azure Spring Apps service and `az spring` command group are deprecated because the service is retiring, so future content should prefer Azure Container Apps or AKS for new Spring Boot deployments.
