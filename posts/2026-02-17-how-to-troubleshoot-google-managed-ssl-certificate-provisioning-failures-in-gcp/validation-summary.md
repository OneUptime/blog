# Validation Summary: How to Troubleshoot Google-Managed SSL Certificate Provisioning Failures in GCP

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Load Balancing
- Google-managed SSL certificates
- Google Cloud CLI
- DNS A, AAAA, CNAME, and CAA records
- Certificate Authority domain validation
- Cloud Armor
- Cloudflare proxying

## Sources Consulted
- Google Cloud: Use Google-managed SSL certificates - https://cloud.google.com/load-balancing/docs/ssl-certificates/google-managed-certs
- Google Cloud: Troubleshoot SSL certificates - https://cloud.google.com/load-balancing/docs/ssl-certificates/troubleshooting
- Google Cloud SDK: gcloud compute ssl-certificates create - https://cloud.google.com/sdk/gcloud/reference/compute/ssl-certificates/create
- Google Cloud SDK: gcloud compute forwarding-rules create - https://cloud.google.com/sdk/gcloud/reference/compute/forwarding-rules/create
- Google Cloud SDK: gcloud compute target-https-proxies create - https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/create
- Google Cloud SDK: gcloud compute target-https-proxies update - https://cloud.google.com/sdk/gcloud/reference/compute/target-https-proxies/update
- Google Cloud: Set up a global external Application Load Balancer with an external backend - https://cloud.google.com/load-balancing/docs/https/setup-global-ext-https-external-backend
- RFC 8659: DNS Certification Authority Authorization (CAA) Resource Record - https://www.rfc-editor.org/rfc/rfc8659

## Issues Found
- The post incorrectly described Google-managed SSL certificate validation as an ACME HTTP-01 challenge at `/.well-known/acme-challenge/*`. Updated the explanation to match Google Cloud documentation: Google Cloud works with a CA, validates DNS visibility, and uses multi-perspective validation against the load balancer IP.
- The post said provisioning can take 15 minutes to several hours and suggested waiting up to 24 hours. Updated the timing to state that provisioning can take up to 60 minutes after DNS and load balancer changes propagate, while DNS propagation can take up to 72 hours.
- The DNS checks only covered A records. Added AAAA checks and noted that an incorrect AAAA record can cause `FAILED_NOT_VISIBLE` even when the A record is correct.
- The forwarding-rule section incorrectly said port 80 is needed for HTTP-01 validation and showed creating an HTTP forwarding rule. Replaced it with the documented requirement for a TCP 443 frontend forwarding rule and an HTTPS proxy example.
- The CAA section checked the TLD (`com`) and only required `pki.goog`. Changed it to check the exact hostname and registrable parent domain, and updated the guidance to allow both `pki.goog` and `letsencrypt.org` for best reliability.
- The firewall section referred to silent HTTP-01 failures and ACME challenge paths. Reworked it to describe validation-path blockers such as CDN layers, GeoDNS, redirects, and filtering, which matches Google Cloud's troubleshooting guidance.
- The rate-limiting section claimed Google follows Let's Encrypt-style rate limits and gave a reset window. Replaced this with the documented CA rate-limit and overlapping-domain request behavior.
- The target HTTPS proxy update examples omitted `--global-ssl-certificates`. Added the flag to the relevant commands.
- The renewal section did not mention the 90-day validity period and used "30 days" wording. Updated it to Google's documented 90-day validity and "about one month before expiry" renewal timing.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was validated against the official Google Cloud SDK reference documentation rather than local `--help` output.
