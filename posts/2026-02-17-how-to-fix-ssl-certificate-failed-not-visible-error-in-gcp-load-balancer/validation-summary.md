# Validation Summary: How to Fix SSL Certificate FAILED_NOT_VISIBLE Error in GCP Load Balancer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Load Balancing
- Compute Engine Google-managed SSL certificates
- Certificate Manager
- Cloud DNS
- DNS A, AAAA, CNAME, and CAA records
- Google Cloud CLI

## Sources Consulted
- Google Cloud Load Balancing: Use Google-managed SSL certificates: https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud Load Balancing: Troubleshoot SSL certificates: https://docs.cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting
- Google Cloud Certificate Manager: Deploy a global Google-managed certificate with DNS authorization: https://docs.cloud.google.com/certificate-manager/docs/deploy-google-managed-dns-auth
- Google Cloud SDK: gcloud certificate-manager certificates create: https://docs.cloud.google.com/sdk/gcloud/reference/certificate-manager/certificates/create
- Google Cloud SDK: gcloud certificate-manager maps entries create: https://docs.cloud.google.com/sdk/gcloud/reference/certificate-manager/maps/entries/create
- Google Cloud SDK: gcloud dns record-sets transaction add: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/transaction/add

## Issues Found
- The post incorrectly said CNAME records are not supported for GCP load balancers. Google Cloud documents that managed certificate validation can succeed through a CNAME if the target resolves to an A or AAAA record for the load balancer IP. Updated the DNS guidance to recommend direct A records while noting valid CNAME behavior.
- The post described `FAILED_NOT_VISIBLE` too narrowly as a failed DNS-only check. Google Cloud also lists load balancer target proxy attachment, port 443, Certificate Manager map precedence, AAAA mismatches, and DNS propagation as causes. Updated the explanation and closing checklist.
- The provisioning timing said certificates can take up to 24 hours after DNS is correct. Google Cloud documents up to 60 minutes after DNS and load balancer changes have propagated, while DNS propagation can take up to 72 hours. Updated the timing and flowchart.
- The replacement workflow detached the only certificate from the target HTTPS proxy before creating the replacement. Google Cloud requires target proxies to reference at least one certificate, and replacement certificates should be attached to the proxy for validation. Updated the workflow to attach old and new certificates together, then remove and delete the old certificate after the replacement is active.
- The target HTTPS proxy update examples for Compute Engine global SSL certificates omitted `--global-ssl-certificates`. Added it to match the official gcloud workflow.
- The Certificate Manager example used one DNS authorization for two distinct domains and did not attach the certificate map to the target proxy. Google Cloud documents that DNS authorizations cover a single domain name and that certificate maps must be attached to the target HTTPS proxy. Updated the example to create authorizations and map entries for both hostnames and attach the map.
- The post described Certificate Manager DNS authorization as more reliable than HTTP-based verification. Compute Engine Google-managed certificates use load balancer authorization and DNS/load balancer visibility checks, not a generic HTTP-based verification flow. Updated the wording.

## Review Notes
The `gcloud` CLI was not installed in the local environment, so command verification was performed against official Google Cloud SDK and product documentation instead of local `--help` output.
