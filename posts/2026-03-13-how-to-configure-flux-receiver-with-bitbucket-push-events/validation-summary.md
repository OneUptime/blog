# Validation Summary: How to Configure Flux Receiver with Bitbucket Push Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller Receiver API
- Kubernetes manifests, Secrets, Services, and Ingress
- Bitbucket Server/Data Center webhooks
- Bitbucket Cloud webhooks
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Bitbucket Data Center event payload documentation: https://confluence.atlassian.com/bitbucketserver/event-payload-938025882.html
- Bitbucket Cloud manage webhooks documentation: https://support.atlassian.com/bitbucket-cloud/docs/manage-webhooks/

## Issues Found
- The post incorrectly stated that Flux's `type: bitbucket` receiver works for Bitbucket Cloud and that Bitbucket Cloud may use `repo:push` events with that receiver. Updated the Bitbucket Cloud guidance to use `type: generic` without an `events` filter, matching the Flux documentation.
- The post incorrectly implied Bitbucket Cloud token validation relies on Flux Receiver verification. Updated the text to explain that Flux's generic receiver does not validate Bitbucket Cloud HMAC signatures and that ingress-level protections should be used.
- The Ingress example pointed directly at the `notification-controller` service. Updated it to point at the Flux `webhook-receiver` service on port 80, matching Flux's webhook receiver guide.
- The troubleshooting and conclusion sections referred to Bitbucket Cloud event filtering and shared setup details that were only correct for Bitbucket Server. Updated those statements to distinguish Bitbucket Server event filtering from Bitbucket Cloud generic receiver behavior.

## Review Notes
The `resources` entries omit `apiVersion`, which is allowed by the Flux API because the field is optional, though Flux's official examples include it for clarity. The LoadBalancer example still points directly at notification-controller pods on target port 9292, which matches Flux's official LoadBalancer pattern.
