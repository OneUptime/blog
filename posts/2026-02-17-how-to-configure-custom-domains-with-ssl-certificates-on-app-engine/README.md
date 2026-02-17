# How to Configure Custom Domains with SSL Certificates on App Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Custom Domains, SSL, HTTPS

Description: Step-by-step instructions for setting up custom domains and SSL certificates on Google App Engine for production-ready applications.

---

When you deploy an application to App Engine, it gets a default URL like `your-project.appspot.com`. That works fine for development and testing, but for production you want your own domain - something like `app.yourdomain.com`. Google App Engine makes this relatively painless, and it even provides free managed SSL certificates so your custom domain serves traffic over HTTPS automatically.

In this guide, I will walk through the entire process of mapping a custom domain to your App Engine application and getting SSL certificates set up properly.

## Prerequisites

Before starting, you need:

- An App Engine application already deployed
- A domain name you own (purchased through any registrar)
- Access to your domain's DNS settings
- Owner or Editor role on the Google Cloud project

## Step 1: Verify Domain Ownership

Google needs to confirm that you actually own the domain before it will let you map it to your App Engine app. Go to the Cloud Console and navigate to App Engine, then Settings, then Custom Domains.

Click "Add a custom domain" and enter your domain name. If you have not verified it before, Google will ask you to prove ownership. The most common method is adding a TXT record to your domain's DNS:

```
# Example TXT record for domain verification
Type: TXT
Name: @
Value: google-site-verification=abc123xyz456...
TTL: 300
```

Add this record through your domain registrar's DNS management panel. DNS propagation can take anywhere from a few minutes to 48 hours, though it usually resolves within 15-30 minutes.

You can also verify ownership through Google Search Console if you have already verified the domain there. The verification carries over.

## Step 2: Map the Domain to App Engine

Once your domain is verified, you can map it to your App Engine service. In the Custom Domains settings, select your verified domain and choose which subdomains you want to map.

You have several options:

- Map the bare domain (e.g., `yourdomain.com`)
- Map a subdomain (e.g., `app.yourdomain.com`)
- Map a wildcard (e.g., `*.yourdomain.com`)

You can also do this from the command line using gcloud:

```bash
# Map a custom domain to your App Engine app
gcloud app domain-mappings create app.yourdomain.com --project=your-project-id
```

For mapping a bare domain:

```bash
# Map the bare domain (no subdomain)
gcloud app domain-mappings create yourdomain.com --project=your-project-id
```

## Step 3: Configure DNS Records

After mapping the domain, Google provides the DNS records you need to add. The specific records depend on whether you are mapping a subdomain or a bare domain.

For subdomains like `app.yourdomain.com`, you need a CNAME record:

```
# CNAME record for subdomain mapping
Type: CNAME
Name: app
Value: ghs.googlehosted.com.
TTL: 3600
```

For bare domains like `yourdomain.com`, you need A and AAAA records because bare domains cannot use CNAME records:

```
# A records for bare domain mapping
Type: A
Name: @
Value: 216.239.32.21

Type: A
Name: @
Value: 216.239.34.21

Type: A
Name: @
Value: 216.239.36.21

Type: A
Name: @
Value: 216.239.38.21

# AAAA records for IPv6 support
Type: AAAA
Name: @
Value: 2001:4860:4802:32::15

Type: AAAA
Name: @
Value: 2001:4860:4802:34::15

Type: AAAA
Name: @
Value: 2001:4860:4802:36::15

Type: AAAA
Name: @
Value: 2001:4860:4802:38::15
```

Add all of these records through your DNS provider. The more records you add, the better the redundancy and availability.

## Step 4: SSL Certificate Provisioning

Here is the good news: Google App Engine provides free managed SSL certificates through Let's Encrypt. Once your DNS records are properly configured and propagated, App Engine automatically provisions an SSL certificate for your custom domain.

You can check the status of your SSL certificate:

```bash
# List domain mappings and their SSL status
gcloud app domain-mappings list --project=your-project-id
```

The output shows each mapping along with its SSL certificate status. You will see one of these states:

- `PENDING` - DNS is not yet propagated or certificate is being provisioned
- `ACTIVE` - Certificate is issued and working
- `FAILED_PERMANENTLY` - Something went wrong (usually a DNS misconfiguration)

If the certificate is stuck in `PENDING`, double-check your DNS records. The most common issue is a typo in the CNAME value or missing A records for bare domains.

## Step 5: Enforcing HTTPS

Once your SSL certificate is active, you want to make sure all traffic uses HTTPS. You can enforce this in your `app.yaml`:

```yaml
# app.yaml - Force HTTPS for all requests
handlers:
  - url: /.*
    script: auto
    secure: always  # Redirect HTTP to HTTPS
```

The `secure: always` directive tells App Engine to redirect any HTTP requests to HTTPS automatically. This is important for security and also helps with SEO since search engines prefer HTTPS sites.

## Managing Multiple Domains

You can map multiple domains to the same App Engine application. This is useful if you want both `www.yourdomain.com` and `yourdomain.com` to point to your app:

```bash
# Map both bare domain and www subdomain
gcloud app domain-mappings create yourdomain.com --project=your-project-id
gcloud app domain-mappings create www.yourdomain.com --project=your-project-id
```

If you want one to redirect to the other (which is best practice for SEO), you will need to handle that in your application code or use a Cloud Load Balancer with URL maps.

## Mapping Domains to Specific Services

If you are running multiple services in App Engine (a microservices architecture), you can map different domains or subdomains to different services:

```bash
# Map a subdomain to a specific App Engine service
gcloud app domain-mappings create api.yourdomain.com \
  --project=your-project-id
```

Then in your dispatch rules (`dispatch.yaml`), route the domain to the correct service:

```yaml
# dispatch.yaml - Route domains to specific services
dispatch:
  - url: "api.yourdomain.com/*"
    service: api-service
  - url: "yourdomain.com/*"
    service: default
```

Deploy the dispatch rules:

```bash
# Deploy dispatch rules
gcloud app deploy dispatch.yaml
```

## Using Your Own SSL Certificate

While the managed certificates work great for most cases, sometimes you need to use your own certificate - for example, if you need an Extended Validation (EV) certificate or a wildcard certificate that covers all subdomains.

Upload your certificate and private key:

```bash
# Create a certificate resource from your own cert files
gcloud app ssl-certificates create \
  --display-name="My Custom Cert" \
  --certificate=path/to/cert.pem \
  --private-key=path/to/key.pem
```

Then update your domain mapping to use the custom certificate:

```bash
# Update domain mapping to use the custom certificate
gcloud app domain-mappings update yourdomain.com \
  --certificate-id=YOUR_CERT_ID
```

Keep in mind that you are responsible for renewing custom certificates before they expire. Managed certificates renew automatically.

## Troubleshooting Common Issues

DNS propagation delays are the number one source of frustration. If your domain mapping shows `PENDING` for the SSL certificate, give it time. You can verify your DNS records are correct using dig:

```bash
# Check if CNAME record is properly configured
dig app.yourdomain.com CNAME +short

# Check A records for bare domain
dig yourdomain.com A +short
```

If you see the correct values in the dig output but the certificate is still pending, wait a few more hours. Google's certificate authority sometimes takes time to verify records.

Another common issue is conflicting DNS records. If you have both an A record and a CNAME record for the same subdomain, the CNAME will not work. Remove any conflicting records.

If your certificate enters `FAILED_PERMANENTLY` status, delete the domain mapping and recreate it:

```bash
# Remove and recreate the domain mapping
gcloud app domain-mappings delete app.yourdomain.com
gcloud app domain-mappings create app.yourdomain.com
```

## Certificate Renewal

Managed SSL certificates renew automatically about 30 days before expiration. You do not need to do anything. However, renewal requires that your DNS records still point to App Engine. If you change your DNS records (for example, to point to a different service temporarily), the renewal will fail and your certificate will eventually expire.

## Summary

Setting up custom domains with SSL on App Engine involves verifying your domain, creating domain mappings, configuring DNS records, and waiting for SSL certificate provisioning. The managed SSL certificates are free and auto-renewing, which removes a significant operational burden. For most applications, the entire process takes about 30 minutes of active work plus some waiting time for DNS propagation.
