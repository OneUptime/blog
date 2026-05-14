# Validation Summary: How to Configure Flux Notification Provider for Opsgenie

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets
- kubectl
- Opsgenie API integrations and Alert API

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Opsgenie Alert API documentation: https://docs.opsgenie.com/docs/alert-api
- Opsgenie API integration setup documentation: https://support.atlassian.com/opsgenie/docs/create-a-default-api-integration/
- Opsgenie pricing and end-of-sale information: https://www.atlassian.com/software/opsgenie/pricing
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Provider and Alert manifests used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for Provider and Alert resources; the documented `v1` API currently applies to Receiver resources. Updated all Provider and Alert examples to `v1beta3`.
- The Opsgenie Provider examples used only the Opsgenie API host, such as `https://api.opsgenie.com`. Flux documents the Opsgenie provider address as the Create Alert endpoint, and Opsgenie's Alert API documents `POST /v2/alerts`. Updated US and EU addresses to `https://api.opsgenie.com/v2/alerts` and `https://api.eu.opsgenie.com/v2/alerts`.
- The Opsgenie integration setup assumed all accounts use Settings > Integrations. Atlassian documents that Free, Essentials, and some Jira Service Management Standard accounts add API integrations from the team dashboard instead. Updated the setup step to account for both paths and to mention turning on the integration.
- The prerequisites and troubleshooting text did not reflect current Opsgenie account availability and API limits. Atlassian documents that new Opsgenie sales and signups ended on June 4, 2025, and support ends on April 5, 2027. Updated the wording to refer to an existing Opsgenie account and plan-specific API request limits.

## Review Notes
The Alert examples omit `eventSources[].namespace`, which is valid because Flux defaults the event source namespace to the Alert namespace. Users who want to receive events from Flux resources in other namespaces should add `namespace` to those event source entries, subject to the notification-controller cross-namespace reference settings.
