# Validation Summary: How to Configure Flux Receiver with Harbor Webhook Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller Receiver
- Flux image-reflector-controller and image-automation-controller
- Kubernetes Secrets and Ingress
- Harbor webhook events
- Docker image tagging and pushing

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux image update automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Harbor webhook notification documentation: https://goharbor.io/docs/2.13.0/working-with-projects/project-configuration/configure-webhooks/

## Issues Found
- The prerequisite listed Kubernetes v1.25 or later, which is outdated for current Flux documentation. Changed it to require a Kubernetes version supported by the installed Flux release.
- Receiver examples included downstream resources such as ImagePolicy, ImageUpdateAutomation, GitRepository, and Kustomization. Flux documentation recommends webhook receivers reconcile source/image source objects such as ImageRepository, with downstream automation handled by Flux dependencies. Updated the examples and explanation to target ImageRepository resources.
- The Harbor Receiver explanation said it validates a generic authentication header. Updated it to specify the Harbor `Authorization` header and the token stored in the Receiver Secret.
- The complete deployment chain implied that the Harbor webhook directly triggers image scanning and the entire Flux apply chain. Updated the wording to describe the actual flow: ImageRepository reconciliation, ImagePolicy evaluation, optional image automation commit, and normal GitOps reconciliation.
- The scan-completion section implied Flux would ensure only scanned or safe images deploy. Updated it to clarify that scan completion can delay reconciliation until after scan completion, but Flux does not evaluate Harbor vulnerability results without additional policy enforcement.
- The Ingress example routed to `notification-controller`; Flux documentation exposes webhook traffic through the `webhook-receiver` service on port 80. Updated the backend service name.
- The verification commands used `flux get image repository` and `flux get image policy`. Updated them to the current documented commands, `flux get images repository` and `flux get images policy`.
- The conclusion said the receiver eliminates scanning delays. Updated it to say it reduces polling delays and requires an enforcement policy for vulnerability-based promotion.

## Review Notes
The manifests use current Flux `v1` API versions for Receiver, ImageRepository, and ImagePolicy. The examples still assume users have installed the optional Flux image controllers and configured manifests with image policy markers for ImageUpdateAutomation to make Git commits.
