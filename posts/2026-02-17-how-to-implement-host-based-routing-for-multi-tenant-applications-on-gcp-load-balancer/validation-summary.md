# Validation Summary: How to Use Host-Based Routing for Multi-Tenant Applications on GCP Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud external Application Load Balancer
- Google Cloud URL maps and host-based routing
- Compute Engine backend services, health checks, target HTTPS proxies, and forwarding rules
- Google-managed SSL certificates
- Certificate Manager DNS authorizations and certificates
- Terraform Google provider resources
- Flask request handling

## Sources Consulted
- Google Cloud Load Balancing URL maps: https://cloud.google.com/load-balancing/docs/url-map
- Google Cloud URL map concepts: https://cloud.google.com/load-balancing/docs/url-map-concepts
- Compute Engine URL maps REST reference: https://cloud.google.com/compute/docs/reference/rest/v1/urlMaps
- Google Cloud Load Balancing Google-managed SSL certificates: https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud Load Balancing SSL certificates overview: https://cloud.google.com/load-balancing/docs/ssl-certificates
- Google Cloud Load Balancing quotas and limits: https://cloud.google.com/load-balancing/docs/quotas
- Certificate Manager certificate management: https://cloud.google.com/certificate-manager/docs/certificates
- Certificate Manager domain authorization types: https://cloud.google.com/certificate-manager/docs/domain-authorization
- Certificate Manager quotas and limits: https://cloud.google.com/certificate-manager/docs/quotas
- gcloud target HTTPS proxy create reference: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- Terraform Google provider google_compute_url_map resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_url_map

## Issues Found
- Removed an invalid `gcloud compute ssl-certificates create` example for a wildcard Google-managed SSL certificate. Compute Engine Google-managed SSL certificates do not support wildcard domains; the post already used the correct Certificate Manager DNS authorization flow immediately afterward.
- Added a note that Certificate Manager certificates must be attached with a certificate map or `--certificate-manager-certificates` rather than mixed with Compute Engine SSL certificates on the same target HTTPS proxy.
- Removed `defaultService` from the URL map custom header example because `defaultService` and `defaultRouteAction.weightedBackendServices` are mutually exclusive in a path matcher default.
- Fixed the Flask snippet by importing `jsonify` and adding a minimal `fetch_tenant_data` function so the example is syntactically valid and self-contained.
- Updated the URL map scaling claim from 100 host rules to the current documented limit of 1,000 host rules and path matchers for external Application Load Balancers.
- Clarified that the 15-certificate attachment limit applies to Compute Engine SSL certificates on a target proxy.

## Review Notes
The `gcloud` CLI is not installed in this workspace, so command validation was performed against official Google Cloud CLI and product documentation rather than local `--help` output. The Python snippet was syntax-checked with `python3 -m py_compile`.
