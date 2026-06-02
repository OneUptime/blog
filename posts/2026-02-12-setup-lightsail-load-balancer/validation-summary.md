# Validation Summary: How to Set Up a Lightsail Load Balancer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Lightsail
- Lightsail load balancers
- AWS CLI
- Lightsail SSL/TLS certificates
- Lightsail DNS
- Lightsail load balancer health checks and metrics
- Node.js / Express

## Sources Consulted
- AWS CLI Command Reference: create-load-balancer - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-load-balancer.html
- AWS CLI Command Reference: get-load-balancer - https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-load-balancer.html
- AWS CLI Command Reference: attach-instances-to-load-balancer - https://docs.aws.amazon.com/cli/latest/reference/lightsail/attach-instances-to-load-balancer.html
- AWS CLI Command Reference: create-load-balancer-tls-certificate - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-load-balancer-tls-certificate.html
- AWS CLI Command Reference: update-load-balancer-attribute - https://docs.aws.amazon.com/cli/latest/reference/lightsail/update-load-balancer-attribute.html
- AWS CLI Command Reference: create-domain-entry - https://docs.aws.amazon.com/cli/latest/reference/lightsail/create-domain-entry.html
- AWS CLI Command Reference: get-load-balancer-metric-data - https://docs.aws.amazon.com/cli/latest/reference/lightsail/get-load-balancer-metric-data.html
- Amazon Lightsail User Guide: Distribute web traffic with Lightsail load balancers - https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-lightsail-load-balancers.html
- Amazon Lightsail FAQ: Load balancers - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-load-balancers.html
- Amazon Lightsail User Guide: Verify SSL/TLS certificate domains with CNAME records - https://docs.aws.amazon.com/lightsail/latest/userguide/verify-tls-ssl-certificate-using-dns-cname-https.html
- Amazon Lightsail User Guide: Redirect HTTP to HTTPS for Lightsail load balancers - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-configure-load-balancer-https-redirection.html
- Amazon Lightsail FAQ: Billing and account management - https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html

## Issues Found
- The post stated that Lightsail provides one free SSL/TLS certificate per load balancer. AWS documentation states that Lightsail load balancer certificates are free with load balancer use, and the CLI documentation allows up to two certificates associated with a load balancer and up to ten certificates in an account. Changed the wording to avoid the incorrect one-certificate limit.
- The post stated that Lightsail load balancers support up to five target instances. AWS documentation says you can add target instances up to your Lightsail account instance quota, with no separate per-load-balancer target limit. Updated the bullet accordingly.
- The post stated that the load balancer listens on ports 80 and 443 by default. AWS documentation says port 80 is open by default and HTTPS on port 443 is enabled after attaching a validated SSL/TLS certificate. Updated the explanation.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `aws help` output.
- The Express examples are illustrative and depend on application-specific helper functions such as `checkDatabaseConnection()` and `checkCacheConnection()`.
