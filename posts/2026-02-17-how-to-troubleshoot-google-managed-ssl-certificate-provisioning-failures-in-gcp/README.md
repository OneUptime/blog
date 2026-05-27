# How to Troubleshoot Google-Managed SSL Certificate Provisioning Failures in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, SSL, Certificate, Troubleshooting, Load Balancer

Description: Practical troubleshooting guide for resolving Google-managed SSL certificate provisioning failures in GCP, covering DNS issues, domain verification, and common error states.

---

You set up your external HTTP(S) load balancer, created a Google-managed SSL certificate, pointed your DNS, and waited. And waited. And the certificate status is still stuck on `PROVISIONING` or, worse, shows `FAILED_NOT_VISIBLE`. Google-managed SSL certificates are great when they work, but when provisioning fails, the error messages can be cryptic and the documentation does not always make the fix obvious.

This post is a practical troubleshooting guide based on the most common provisioning failures I have seen and fixed.

## Understanding the Provisioning Process

Before diving into fixes, it helps to understand what happens when you create a Google-managed certificate:

1. You create the certificate resource and attach it to a target HTTPS proxy
2. Google works with a Certificate Authority to validate that the domain resolves to the load balancer
3. The CA checks the domain's DNS records and attempts to contact the load balancer's IP address from multiple locations
4. If validation succeeds, Google issues the certificate
5. The certificate status changes from `PROVISIONING` to `ACTIVE`

Provisioning can take up to 60 minutes after DNS and load balancer changes have propagated, and DNS propagation itself can take up to 72 hours. But if something is wrong, it will sit in `PROVISIONING` or transition to a failure state.

## Checking Certificate Status

Start by checking the current status:

```bash
# Check the overall certificate status

gcloud compute ssl-certificates describe my-cert \
    --global \
    --format="yaml(managed)"
```

This shows the overall status and per-domain status. Look for these values:

- `PROVISIONING` - Still in progress, give it more time after DNS and load balancer changes have propagated
- `ACTIVE` - Successfully provisioned
- `FAILED_NOT_VISIBLE` - Domain validation failed
- `FAILED_CAA_CHECKING` - CAA record issue
- `FAILED_CAA_FORBIDDEN` - CAA record blocks Google
- `FAILED_RATE_LIMITED` - Too many certificate requests

## Problem 1: DNS Not Pointing to the Load Balancer

This is the single most common cause of provisioning failure. The domain must resolve only to the load balancer's external IP address or addresses before Google can validate it.

Check your DNS:

```bash
# Verify IPv4 DNS resolution for your domain
dig +short A app.example.com

# Also check IPv6 if you have an AAAA record
dig +short AAAA app.example.com

# Compare with your load balancer IP
gcloud compute addresses describe lb-ip --global --format="get(address)"
```

If these do not match, fix your DNS records. Common issues:

- DNS record pointing to the old server instead of the load balancer IP
- AAAA record pointing somewhere other than the load balancer, even if the A record is correct
- Using a CNAME instead of an A record (both work, but make sure the CNAME resolves correctly)
- DNS changes not yet propagated (check with multiple DNS servers)

```bash
# Check DNS from Google's public DNS
dig @8.8.8.8 +short A app.example.com
dig @8.8.8.8 +short AAAA app.example.com

# Check DNS from Cloudflare's DNS
dig @1.1.1.1 +short A app.example.com
dig @1.1.1.1 +short AAAA app.example.com
```

## Problem 2: Forwarding Rule Not Created

The load balancer must be fully configured with a forwarding rule before the certificate can be provisioned. For Application Load Balancers and external proxy Network Load Balancers, the frontend forwarding rule must include TCP port 443.

Verify the forwarding rule exists:

```bash
# List forwarding rules for the load balancer
gcloud compute forwarding-rules list --global
```

You should see a forwarding rule on port 443. A separate port 80 forwarding rule is useful for HTTP-to-HTTPS redirects, but it is not the requirement that makes Google-managed certificate provisioning work.

Create an HTTPS forwarding rule if missing:

```bash
# Create an HTTPS forwarding rule for the certificate-bearing proxy
gcloud compute target-https-proxies create https-proxy-for-cert \
    --url-map=my-url-map \
    --ssl-certificates=my-cert \
    --global-ssl-certificates \
    --global

gcloud compute forwarding-rules create https-rule \
    --address=lb-ip \
    --global \
    --target-https-proxy=https-proxy-for-cert \
    --ports=443
```

## Problem 3: CAA Record Blocking Google

Certificate Authority Authorization (CAA) records in DNS specify which certificate authorities are allowed to issue certificates for your domain. If you have a CAA record that does not include a CA Google Cloud can use, provisioning will fail.

Check for CAA records:

```bash
# Check CAA records for the exact hostname
dig CAA app.example.com

# Also check the registrable parent domain
dig CAA example.com
```

If you have CAA records, make sure they include the CAs Google Cloud can use. For best reliability, allow both `pki.goog` and `letsencrypt.org`:

```text
example.com.  CAA  0 issue "pki.goog"
example.com.  CAA  0 issue "letsencrypt.org"
```

If you allow only one of those CAs, Google Cloud uses only that CA for creation and renewal. If you do not have any CAA records, that is fine - the absence of CAA records allows Google Cloud to use either `pki.goog` or `letsencrypt.org`.

## Problem 4: Validation Path Blocked

The CA needs to validate the domain from multiple locations across the internet. If DNS points to an intermediate CDN, a location-based DNS answer, a redirect chain, or a filtering rule instead of directly to the load balancer IP, validation can fail.

Things to check:
- DNS A and AAAA records resolving only to the load balancer IP address or addresses
- GeoDNS or location-based DNS returning different answers in different regions
- Third-party CDN or proxy layers in front of the load balancer

If you have a Cloud Armor policy, check whether it is attached to the backend service and whether it could block validation traffic that reaches your load balancer:

```bash
# Check if Cloud Armor is attached to your backend service
gcloud compute backend-services describe my-backend --global \
    --format="get(securityPolicy)"
```

## Problem 5: Rate Limiting

If you have been creating and deleting certificates for the same domain repeatedly, you might hit Certificate Authority rate limits. Google Cloud also does not process certificate requests with overlapping domain sets in parallel.

There is not much you can do except wait, create a replacement certificate after fixing the configuration, or contact Google Cloud Support. Avoid creating and deleting certificates unnecessarily.

## Problem 6: Multi-Domain Certificate Issues

When a managed certificate covers multiple domains, all domains must pass validation. If even one domain fails, the entire certificate stays in `PROVISIONING`.

Check per-domain status:

```bash
# Check the status of each domain on the certificate
gcloud compute ssl-certificates describe my-multi-cert \
    --global \
    --format="yaml(managed.domainStatus)"
```

This shows the status for each domain individually. Fix the domains that are failing and leave the working ones alone.

If one domain is permanently broken, consider creating separate certificates:

```bash
# Create separate certificates for each domain
gcloud compute ssl-certificates create cert-app \
    --domains=app.example.com --global

gcloud compute ssl-certificates create cert-api \
    --domains=api.example.com --global
```

Then attach both to the target proxy:

```bash
# Attach multiple certificates to the proxy
gcloud compute target-https-proxies update my-proxy \
    --ssl-certificates=cert-app,cert-api \
    --global-ssl-certificates \
    --global
```

## Problem 7: Cloudflare Proxy Interfering

If you use Cloudflare for DNS and have the orange cloud (proxy) enabled, Cloudflare terminates TLS before traffic reaches GCP. This can interfere with Google's domain validation.

The fix is to temporarily disable Cloudflare proxying (set the record to DNS-only/grey cloud) until the certificate is provisioned. After the certificate is active, you can re-enable Cloudflare proxying, though having two CDN/proxy layers is usually not what you want.

## Forcing a Re-Provisioning Attempt

Sometimes the cleanest approach is to delete and recreate the certificate:

```bash
# Delete the stuck certificate
gcloud compute ssl-certificates delete my-cert --global

# Recreate it
gcloud compute ssl-certificates create my-cert \
    --domains=app.example.com --global

# Reattach to the proxy
gcloud compute target-https-proxies update my-proxy \
    --ssl-certificates=my-cert \
    --global-ssl-certificates \
    --global
```

## Monitoring Certificate Expiry

Google-managed certificates auto-renew, but it is good practice to monitor them. Set up an alert for certificate expiry:

```bash
# Check certificate expiry date
gcloud compute ssl-certificates describe my-cert \
    --global \
    --format="get(expireTime)"
```

Google-managed certificates are valid for 90 days, and Google typically starts the renewal process about one month before expiry. If you see a certificate getting close to expiry without renewal, the same troubleshooting steps above apply - renewal also requires the DNS and load balancer configuration to validate correctly.

## Quick Troubleshooting Checklist

Here is the checklist I run through every time a managed certificate is not provisioning:

1. DNS A and AAAA records point only to the load balancer IP address or addresses
2. Forwarding rule exists on port 443
3. No CAA records blocking `pki.goog` or `letsencrypt.org`
4. No CDN, GeoDNS, redirect, or filtering layer interfering with validation
5. No Cloudflare proxy interfering with validation
6. All domains on a multi-domain cert are individually valid
7. No rate limiting from recent certificate churn

Work through these in order and you will find the issue in 95% of cases. If everything checks out and provisioning still fails after DNS has fully propagated, contact GCP support.

## Wrapping Up

Google-managed SSL certificates save you from the hassle of certificate management, but the provisioning process has several potential failure points. DNS misconfiguration is by far the most common issue, followed by missing forwarding rules and CAA record conflicts. When in doubt, delete and recreate the certificate after fixing the underlying issue - a fresh provisioning attempt often succeeds where a stuck one does not.
