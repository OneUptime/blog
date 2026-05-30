# Validation Summary: How to Set Up Blue-Green Deployments with Staging Slots in Azure Spring Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Spring Apps
- Azure CLI spring extension
- Azure Spring Apps staging deployments
- Blue-green deployment
- Spring Boot
- GitHub Actions
- Bash

## Sources Consulted
- Microsoft Learn: Set up a staging environment in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/how-to-staging-environment
- Microsoft Learn: Blue-green deployment strategies in Azure Spring Apps - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/concepts-blue-green-deployment-strategies
- Microsoft Learn: Azure Spring Apps retirement announcement - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/retirement-announcement
- Microsoft Learn: Azure CLI `az spring app` reference - https://learn.microsoft.com/en-us/cli/azure/spring/app?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az spring app deployment` reference - https://learn.microsoft.com/en-us/cli/azure/spring/app/deployment?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az spring test-endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/spring/test-endpoint?view=azure-cli-latest
- Microsoft Learn: Azure Spring Apps API breaking changes - https://learn.microsoft.com/en-us/azure/spring-apps/basic-standard/breaking-changes

## Issues Found
- The prerequisites did not mention that Azure Spring Apps is in retirement and unavailable to new customers. Added a short caveat that the guide applies to existing Azure Spring Apps customers.
- The staging deployment example recommended matching production resource allocation but only set `--instance-count`. Added `--cpu 1` and `--memory 2Gi` to match the production deployment shown earlier.
- The `az spring test-endpoint list` example used `--service`, but the current CLI reference requires `--name` for the Azure Spring Apps service instance. Updated the command.
- The staging validation script hardcoded the `green` deployment path. Updated it to use `STAGING_DEPLOYMENT` with `green` as the default so it works with an alternating blue-green pipeline.
- The active deployment query used the deprecated `properties.activeDeploymentName` field. Updated it to `properties.activeDeployment.name`.
- The GitHub Actions workflow deleted the `green` deployment before every release, which would be wrong once `green` became production. Reworked the workflow to detect the active deployment, deploy to the inactive slot, validate that slot, and promote it.
- The GitHub Actions workflow initially implied resource settings could be passed to `az spring app deploy`. Current CLI docs do not support `--cpu`, `--memory`, or `--instance-count` on `az spring app deploy`, so the workflow now uses `az spring app scale` for existing staging deployments before deploying the artifact.

## Review Notes
The Azure CLI `spring` command group is currently marked deprecated in Microsoft Learn because Azure Spring Apps is in its retirement period. The commands remain documented for existing customers, but future content should consider Azure Container Apps or AKS migration guidance for new deployments.
