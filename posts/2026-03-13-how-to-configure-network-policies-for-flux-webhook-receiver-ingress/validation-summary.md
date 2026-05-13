# Validation Summary: How to Configure Network Policies for Flux Webhook Receiver Ingress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller and Receiver resources
- Kubernetes NetworkPolicy
- Kubernetes Ingress
- ingress-nginx annotations
- GitHub webhooks and Meta API IP ranges
- Prometheus metrics scraping
- kubectl

## Sources Consulted
- Flux webhook receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Flux optional components and default NetworkPolicy behavior: https://v2-6.docs.fluxcd.io/flux/installation/configuration/optional-components/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- GitHub IP address documentation: https://docs.github.com/en/github/authenticating-to-github/about-githubs-ip-addresses
- GitHub webhook best practices: https://docs.github.com/webhooks/using-webhooks/best-practices-for-using-webhooks
- GitHub Meta API output from https://api.github.com/meta

## Issues Found
- The post described the Receiver URL as `/hook/<receiver-token>`. Flux does not expose the raw secret token in the path; it reports a generated `.status.webhookPath` value in the format `/hook/sha256sum(token+name+namespace)`. Updated the endpoint and verification examples to use `<webhook-path>`.
- The GitHub IP allowlist example omitted current GitHub webhook ranges. Updated the example to include the current `hooks` ranges returned by the GitHub Meta API on 2026-05-13 and clarified that the list should be refreshed before applying the Ingress.
- The verification curl example implied that a bare JSON POST should be a valid webhook. Flux validates provider webhook payloads and signatures, so an unsigned test request can be rejected while still proving ingress reachability. Updated the text to describe it as a reachability check and to look for a request or validation error in the logs.

## Review Notes
kubectl was not installed in the local review environment, so kubectl command syntax was checked against standard Kubernetes usage and official documentation rather than local `kubectl --help` output.
