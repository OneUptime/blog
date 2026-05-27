# Validation Summary: How to Set Up Internet NEGs to Load Balance External Third-Party API Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Load Balancing
- Global external Application Load Balancer
- Internet network endpoint groups
- Google Cloud CLI
- Cloud CDN
- Cloud Armor
- URL maps and traffic management

## Sources Consulted
- Google Cloud Load Balancing internet NEG concepts: https://cloud.google.com/load-balancing/docs/negs/internet-neg-concepts
- Google Cloud guide for global external Application Load Balancer with an external backend: https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-external-backend
- Google Cloud SDK `backend-services add-backend` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/add-backend
- Google Cloud SDK `backend-services update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Google Cloud SDK `url-maps add-path-matcher` reference: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/add-path-matcher
- Google Cloud custom headers for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/custom-headers-global
- Google Cloud traffic management for global external Application Load Balancers: https://cloud.google.com/load-balancing/docs/https/traffic-management-global
- Google Cloud CDN external backends using internet NEGs: https://cloud.google.com/cdn/docs/external-backends-internet-neg-overview
- Google Cloud Armor security policy configuration: https://cloud.google.com/armor/docs/configure-security-policies

## Issues Found
- The post said multiple endpoints could be added to one global internet NEG. Google Cloud supports only one endpoint per global internet NEG and one internet NEG per backend service, so the example was changed to create a second NEG for a second endpoint.
- The IP-based NEG example did not mention certificate validation and SNI limitations. Added a note that HTTPS and HTTP/2 backends should prefer FQDN endpoints because global `INTERNET_IP_PORT` endpoints do not validate backend certificates and do not send SNI.
- The backend service command did not specify the external managed load balancing scheme. Added `--load-balancing-scheme=EXTERNAL_MANAGED`.
- The backend attachment command used `--network-endpoint-group-zone=""`, which is not the documented way to attach a global NEG. Replaced it with `--global-network-endpoint-group`.
- The custom header commands used plural flags and an unsupported `{client_host}` variable. Replaced them with documented `--custom-request-header`, `--custom-response-header`, and `{hostname}`.
- The URL map path matcher example omitted a host binding. Added `--new-hosts=api.mycompany.com`.
- The load balancer frontend commands omitted explicit global external Application Load Balancer settings. Added Premium Tier and `EXTERNAL_MANAGED` where applicable, plus `--global` on the target HTTPS proxy command.
- The Cloud CDN claim said cached responses do not count against the external API's limits. Reworded it to state the directly verifiable behavior: Cloud CDN cache hits do not send a request to the external API.
- The Cloud Armor example used private RFC 1918 ranges for a public client allowlist. Replaced them with documentation IP ranges and added a comment to substitute real allowed public client ranges.
- The health check and failover sections implied global internet NEGs can be treated like normally health-checked backends. Updated them to state that backend services with global internet NEGs do not support health checks, unreachable external backends return HTTP 502, and automatic health-check-based failover is not available.
- The opening claim said internet NEGs expose all GCP load balancing features. Narrowed it to supported load balancers and specific relevant features.

## Review Notes
The post now focuses on global internet NEGs. Regional internet NEGs have different limits and health-check behavior, so future updates should call that out explicitly if regional load balancers are added.
