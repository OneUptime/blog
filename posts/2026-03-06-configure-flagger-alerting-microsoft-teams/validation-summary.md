# Validation Summary: How to Configure Flagger Alerting with Microsoft Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger canary deployments
- Flagger AlertProvider and Canary custom resources
- Flux GitOps
- Kubernetes Secrets and kubectl
- Microsoft Teams webhooks and Workflows

## Sources Consulted
- Flagger alerting documentation: https://fluxcd.io/flagger/usage/alerting/
- Flagger CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger source code for Teams notifier and alert secret lookup: https://github.com/fluxcd/flagger
- Microsoft Teams webhooks and connectors documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/what-are-webhooks-and-connectors
- Microsoft Teams connector management documentation: https://learn.microsoft.com/en-us/microsoftteams/m365-custom-connectors
- Microsoft 365 Dev Blog on Office 365 connector retirement: https://devblogs.microsoft.com/microsoft365dev/retirement-of-office-365-connectors-within-microsoft-teams/

## Issues Found
- The original examples stored webhook Secrets in `flagger-system` while the referenced AlertProviders were in `default`. Flagger reads the Secret from the AlertProvider namespace, so those AlertProviders would not find the Secret. I changed the same-namespace examples to create the Secrets in `default`, and added a `flagger-system` Secret to the cluster-wide example.
- The Teams setup focused on legacy Microsoft 365 Connector creation. Microsoft now recommends Teams Workflows for incoming webhook scenarios and is retiring Office 365 Connectors. I updated the setup flow, URL examples, and migration text to use Workflows first while keeping legacy connector URLs as a retirement-only note.
- The post said Flagger sends Adaptive Card messages with green/yellow/red color coding and timestamps. Flagger's Teams notifier sends MessageCard payloads, uses blue for normal notifications and red for errors, and formats event data as MessageCard sections and facts. I corrected that section.
- The troubleshooting section described webhook URL expiration. I changed this to the current Teams risk: legacy connector retirement or disabled/orphaned Workflows.
- The prerequisites listed the Flux CLI as unconditionally required, but the commands only require `kubectl`. I clarified that the Flux CLI is only needed if applying the manifests through GitOps workflows.

## Review Notes
- The Flagger AlertProvider API, `msteams` provider type, `secretRef.name`, required `address` Secret key, `providerRef.namespace`, and alert severity values are current and match the Flagger documentation and CRD schema.
- Microsoft Teams Workflows support MessageCard payloads, but not MessageCard button rendering. Flagger's Teams messages do not use interactive buttons, so the AlertProvider configuration can remain unchanged when using a Workflow webhook URL.
