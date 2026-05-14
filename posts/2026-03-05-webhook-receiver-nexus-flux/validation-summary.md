# Validation Summary: How to Configure Webhook Receiver for Nexus in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Receiver custom resources
- Flux ImageRepository resources
- Kubernetes Secrets and Ingress
- Sonatype Nexus Repository Manager webhooks
- Docker container registry pushes

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver setup guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Sonatype Nexus Repository webhook capability documentation: https://help.sonatype.com/en/enabling-a-repository-webhook-capability.html
- Sonatype Nexus Repository webhook headers and payload examples: https://help.sonatype.com/en/example-headers-and-payloads.html

## Issues Found
- The Receiver examples used `.spec.events` with `CREATED`, but Flux documents that the `nexus` receiver type does not support filtering with events. Removed the `events` fields from both Nexus Receiver manifests.
- The Ingress example targeted the `notification-controller` service. Current Flux documentation says webhook traffic should be exposed through the `webhook-receiver` service on port 80. Updated the Ingress backend service name.
- The Nexus configuration wording implied Flux expects or filters a Nexus event type. Flux validates and unmarshals Nexus webhook payloads but does not filter Nexus receiver events through `.spec.events`. Updated the wording so event selection is described as Nexus-side configuration.
- The multiple repository section implied one Nexus repository webhook watches multiple Nexus repositories. Nexus repository webhooks are configured per repository capability, while a single Flux Receiver can reconcile multiple Flux resources. Updated the section to explain that each Nexus repository needs its own capability pointed at the same receiver URL.

## Review Notes
The `resources` examples omit `apiVersion` for `ImageRepository`. Flux examples commonly include `apiVersion: image.toolkit.fluxcd.io/v1`, but Kubernetes object references can be resolved by kind/name within the receiver namespace in common Flux usage. Adding `apiVersion` would make the examples more explicit in a future cleanup.
