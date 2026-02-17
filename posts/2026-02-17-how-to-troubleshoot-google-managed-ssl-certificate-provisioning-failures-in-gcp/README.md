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
2. Google attempts to validate domain ownership via the HTTP-01 challenge
3. Google's infrastructure makes an HTTP request to `http://YOUR_DOMAIN/.well-known/acme-challenge/TOKEN`
4. If the challenge succeeds, Google issues the certificate
5. The certificate status changes from `PROVISIONING` to `ACTIVE`

The entire process can take 15 minutes to several hours. But if something is wrong, it will sit in `PROVISIONING` or transition to a failure state.

## Checking Certificate Status

Start by checking the current status:

```bash
# Check the overall certificate status
gcloud compute ssl-certificates describe my-cert \
    --global \
    --format="yaml(managed)"
```

This shows the overall status and per-domain status. Look for these values:

- `PROVISIONING` - Still in progress, give it more time (up to 24 hours)
- `ACTIVE` - Successfully provisioned
- `FAILED_NOT_VISIBLE` - Domain validation failed
- `FAILED_CAA_CHECKING` - CAA record issue
- `FAILED_CAA_FORBIDDEN` - CAA record blocks Google
- `FAILED_RATE_LIMITED` - Too many certificate requests

## Problem 1: DNS Not Pointing to the Load Balancer

This is the single most common cause of provisioning failure. The domain must resolve to the load balancer's external IP address before Google can validate it.

Check your DNS:

```bash
# Verify DNS resolution for your domain
dig +short A app.example.com

# Compare with your load balancer IP
gcloud compute addresses describe lb-ip --global --format="get(address)"
```

If these do not match, fix your DNS records. Common issues:

- DNS record pointing to the old server instead of the load balancer IP
- Using a CNAME instead of an A record (both work, but make sure the CNAME resolves correctly)
- DNS changes not yet propagated (check with multiple DNS servers)

```bash
# Check DNS from Google's public DNS
dig @8.8.8.8 +short A app.example.com

# Check DNS from Cloudflare's DNS
dig @1.1.1.1 +short A app.example.com
```

## Problem 2: Forwarding Rule Not Created

The load balancer must be fully configured with a forwarding rule before the certificate can be provisioned. Google's validation system needs to reach the load balancer on port 80 and/or port 443.

Verify the forwarding rule exists:

```bash
# List forwarding rules for the load balancer
gcloud compute forwarding-rules list --global
```

You should see a forwarding rule on port 443 (and ideally port 80 as well). If you only have a port 443 rule, the HTTP-01 challenge might fail because it needs port 80 access.

Create an HTTP forwarding rule if missing:

```bash
# Create an HTTP forwarding rule to support ACME validation
gcloud compute target-http-proxies create http-proxy-for-cert \
    --url-map=my-url-map

gcloud compute forwarding-rules create http-rule \
    --address=lb-ip \
    --global \
    --target-http-proxy=http-proxy-for-cert \
    --ports=80
```

## Problem 3: CAA Record Blocking Google

Certificate Authority Authorization (CAA) records in DNS specify which certificate authorities are allowed to issue certificates for your domain. If you have a CAA record that does not include Google's CA, provisioning will fail.

Check for CAA records:

```bash
# Check CAA records for your domain
dig CAA example.com

# Also check the parent domain
dig CAA com
```

If you have CAA records, make sure they include `pki.goog`:

```
example.com.  CAA  0 issue "pki.goog"
```

Or if you want to allow both Let's Encrypt and Google:

```
example.com.  CAA  0 issue "pki.goog"
example.com.  CAA  0 issue "letsencrypt.org"
```

If you do not have any CAA records, that is fine - the absence of CAA records means any CA can issue certificates.

## Problem 4: Firewall Blocking Validation Requests

Google's ACME validation system needs to reach your load balancer on port 80. If something is blocking this traffic, the HTTP-01 challenge fails silently.

Things to check:
- VPC firewall rules blocking port 80 ingress
- Cloud Armor security policies blocking the validation requests
- The load balancer URL map returning a non-200 response to the challenge path

If you have a Cloud Armor policy, make sure it does not block requests to `/.well-known/acme-challenge/*`:

```bash
# Check if Cloud Armor is attached to your backend service
gcloud compute backend-services describe my-backend --global \
    --format="get(securityPolicy)"
```

## Problem 5: Rate Limiting

If you have been creating and deleting certificates for the same domain repeatedly, you might hit rate limits. Google follows Let's Encrypt-style rate limits.

There is not much you can do except wait. Rate limits typically reset after a few hours to a day. Avoid creating and deleting certificates unnecessarily.

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
    --ssl-certificates=my-cert --global
```

## Monitoring Certificate Expiry

Google-managed certificates auto-renew, but it is good practice to monitor them. Set up an alert for certificate expiry:

```bash
# Check certificate expiry date
gcloud compute ssl-certificates describe my-cert \
    --global \
    --format="get(expireTime)"
```

Google typically starts the renewal process 30 days before expiry. If you see a certificate getting close to expiry without renewal, the same troubleshooting steps above apply - the renewal uses the same validation process as the initial provisioning.

## Quick Troubleshooting Checklist

Here is the checklist I run through every time a managed certificate is not provisioning:

1. DNS A record points to the load balancer IP
2. Forwarding rule exists on port 443 (and preferably port 80)
3. No CAA records blocking `pki.goog`
4. No Cloud Armor rules blocking ACME challenge paths
5. No Cloudflare proxy interfering with validation
6. All domains on a multi-domain cert are individually valid
7. No rate limiting from recent certificate churn

Work through these in order and you will find the issue in 95% of cases. If everything checks out and provisioning still fails after 24 hours, contact GCP support.

## Wrapping Up

Google-managed SSL certificates save you from the hassle of certificate management, but the provisioning process has several potential failure points. DNS misconfiguration is by far the most common issue, followed by missing forwarding rules and CAA record conflicts. When in doubt, delete and recreate the certificate after fixing the underlying issue - a fresh provisioning attempt often succeeds where a stuck one does not.
