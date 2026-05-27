# Validation Summary: How to Set Up Cloud Run with a Custom Domain and Managed SSL Certificate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Run
- Cloud Run domain mappings
- Google Cloud CLI
- Cloud DNS
- Global external Application Load Balancer
- Serverless Network Endpoint Groups
- Google-managed SSL certificates
- DNS A, AAAA, CNAME, and CAA records

## Sources Consulted
- Cloud Run custom domain mappings: https://docs.cloud.google.com/run/docs/mapping-custom-domains
- Set up a global external Application Load Balancer with Cloud Run, App Engine, or Cloud Run functions: https://docs.cloud.google.com/load-balancing/docs/https/setup-global-ext-https-serverless
- Google-managed SSL certificates for Cloud Load Balancing: https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Serverless NEG overview and limitations: https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts
- gcloud dns record-sets create reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/create
- gcloud compute target-https-proxies create reference: https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- gcloud compute target-http-proxies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/target-http-proxies/create
- gcloud compute url-maps create/import references: https://cloud.google.com/sdk/gcloud/reference/compute/url-maps/create and https://docs.cloud.google.com/sdk/gcloud/reference/compute/url-maps/import

## Issues Found
- Cloud Run domain mappings were described as generally production-suitable and as handling DNS verification automatically. Updated the text to state that domain mappings are Preview, have limited regional availability, and still require domain verification and DNS record creation.
- Domain verification examples used `api.example.com`. Updated them to verify the base domain `example.com`, which is what Google documents for mapping a subdomain like `api.example.com`.
- Cloud Run domain mapping commands used `gcloud run domain-mappings`. Updated them to `gcloud beta run domain-mappings`, matching the current official documentation.
- The global external Application Load Balancer backend service omitted `--load-balancing-scheme=EXTERNAL_MANAGED`. Added it to match the documented global external Application Load Balancer setup.
- Several global load balancer commands omitted explicit `--global`, `--global-url-map`, or `--global-ssl-certificates` flags. Added these where appropriate to avoid ambiguous regional prompts and make the commands consistently target global resources.
- The CAA example allowed only `pki.goog`. Updated it to allow both `pki.goog` and `letsencrypt.org`, which Google recommends for best reliability with Google-managed certificates.
- The option-selection list claimed the load balancer approach should be chosen for custom health checks. Replaced that with production-ready custom domain support, because health checks are not supported for serverless NEG backends.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so CLI syntax was validated against official Google Cloud SDK reference documentation rather than local `gcloud --help` output.
