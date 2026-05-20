# Validation Summary: How to Configure Git Webhook for Azure DevOps in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Azure DevOps Service Hooks
- Azure Repos Git push events
- Kubernetes Secrets and ConfigMaps
- GitOps repository polling and webhook refresh
- Azure DevOps REST API

## Sources Consulted
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD webhook handler source: https://github.com/argoproj/argo-cd/blob/master/util/webhook/webhook.go
- Argo CD reconciliation interval FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD high availability documentation for `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Azure DevOps Webhooks service hook documentation: https://learn.microsoft.com/en-us/azure/devops/service-hooks/services/webhooks
- Azure DevOps Service Hook Events documentation: https://learn.microsoft.com/en-us/azure/devops/service-hooks/events
- Azure DevOps Service Hook Consumers documentation: https://learn.microsoft.com/en-us/azure/devops/service-hooks/consumers
- Azure DevOps Service Hooks Subscriptions REST API: https://learn.microsoft.com/en-us/rest/api/azure/devops/hooks/subscriptions
- Azure DevOps Service Hooks troubleshooting documentation: https://learn.microsoft.com/en-us/azure/devops/service-hooks/troubleshoot

## Issues Found
- The post described Azure DevOps webhook authentication as a basic auth username/password or webhook secret. Argo CD documents Azure DevOps webhook verification as optional basic authentication using `webhook.azuredevops.username` and `webhook.azuredevops.password`, so the wording was corrected.
- The Argo CD secret section implied a server restart was required after updating `argocd-secret`. Argo CD documentation says webhook secret changes should take effect automatically, so the restart was changed to a fallback only.
- The Azure DevOps REST API examples used `api-version=7.0` and separate `basicAuthUsername` / `basicAuthPassword` consumer inputs. Microsoft documents the current Service Hooks API as `7.1`, and the Web Hooks consumer input is `basicAuthCredentials`, so both REST examples were corrected.
- The REST API examples used a project name variable for the `projectId` publisher input. Microsoft documents `projectId` as the project ID/GUID for creating subscriptions, so the variable was renamed to `AZDO_PROJECT_ID` and reused in the repository-listing command.
- The Argo CD reconciliation example used `timeout.reconciliation: "600"`. Argo CD documents this value as a duration string such as `60s`, `1m`, or `1h`, so it was changed to `10m`.
- The service hook re-enable example used `PATCH` with a partial body against the Service Hooks subscription endpoint. Microsoft documents subscription updates as a replace operation with `PUT`, so the example now retrieves the subscription, updates `status`, and sends the full document back with `PUT`.
- The troubleshooting section stated Azure DevOps disables service hooks after consecutive failures, usually five. Microsoft documents probation, retries, and disabling after repeated failures over time rather than a fixed five-failure rule, so the wording was corrected.

## Review Notes
The main Argo CD `/api/webhook` endpoint, Azure DevOps `git.push` event ID, `tfs` publisher ID, `webHooks` consumer ID, `httpRequest` action ID, repository GUID filtering, branch filtering with `refs/heads/main`, and Azure DevOps `remoteUrl` matching guidance are consistent with official documentation and Argo CD's current webhook handler source. The post uses example shell variables and placeholder values, so the commands still require readers to supply real organization, project, repository, PAT, and subscription IDs.
