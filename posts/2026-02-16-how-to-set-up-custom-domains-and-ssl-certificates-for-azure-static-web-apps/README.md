# How to Set Up Custom Domains and SSL Certificates for Azure Static Web Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Static Web Apps, Custom Domain, SSL, HTTPS, DNS, Web Hosting

Description: A practical guide to configuring custom domains and SSL certificates for Azure Static Web Apps, covering DNS setup, validation, and troubleshooting.

---

The default URL that Azure Static Web Apps gives you works fine for testing, but nobody wants to share a link like `happy-river-0a1b2c3d4.azurestaticapps.net` with their users. Setting up a custom domain gives your app a professional address, and Azure handles the SSL certificate automatically. No need to buy certificates, configure renewals, or worry about expiration.

This guide covers the full process of adding a custom domain to your Azure Static Web App, including both apex domains and subdomains.

## Understanding the Two Types of Custom Domains

There are two scenarios for custom domains:

**Subdomain** (like `app.example.com`): Uses a CNAME record pointing to your Static Web App's default hostname. This is the simpler and more common setup.

**Apex/root domain** (like `example.com`): Cannot use a CNAME record (that would break DNS standards). Instead, you use an ALIAS record or Azure DNS zone delegation.

Most DNS providers support CNAME records easily. Apex domain support varies by provider, so check your DNS provider's documentation if you need a root domain.

## Prerequisites

- A deployed Azure Static Web App.
- A domain name you own, with access to its DNS settings.
- The default URL of your Static Web App (found on the Overview page in the Azure portal).

## Step 1: Add a Subdomain

Let's start with the most common case - adding a subdomain like `app.example.com`.

### Configure DNS

Log in to your DNS provider and create a CNAME record:

- **Type**: CNAME
- **Name**: app (or whatever subdomain you want)
- **Value**: `happy-river-0a1b2c3d4.azurestaticapps.net` (your Static Web App's default URL)
- **TTL**: 3600 (or your provider's default)

DNS propagation usually takes between 5 minutes and an hour, though it can occasionally take longer.

### Add the Domain in Azure

After creating the DNS record, go to the Azure portal.

1. Navigate to your Static Web App resource.
2. Under Settings, click "Custom domains."
3. Click "Add."
4. Enter your subdomain (for example, `app.example.com`).
5. Select "CNAME" as the validation method.
6. Click "Add."

Azure will verify that the CNAME record exists and points to the correct hostname. Once validated, the domain is active and an SSL certificate is automatically provisioned.

Using the CLI, the process is even faster.

```bash
# Add a custom subdomain to your Static Web App
az staticwebapp hostname set \
  --name my-static-app \
  --resource-group myResourceGroup \
  --hostname app.example.com
```

## Step 2: Add an Apex Domain

For root domains like `example.com`, the process depends on whether you use Azure DNS or an external DNS provider.

### Option A: Using Azure DNS

If your domain's nameservers point to Azure DNS, you can use an ALIAS record.

First, create a DNS zone in Azure if you do not already have one.

```bash
# Create an Azure DNS zone for your domain
az network dns zone create \
  --resource-group myResourceGroup \
  --name example.com
```

Then update your domain registrar's nameservers to point to the Azure DNS nameservers shown in the zone.

Next, create an ALIAS record set.

```bash
# Get the resource ID of your Static Web App
RESOURCE_ID=$(az staticwebapp show \
  --name my-static-app \
  --resource-group myResourceGroup \
  --query id \
  --output tsv)

# Create an ALIAS record pointing to the Static Web App
az network dns record-set a create \
  --resource-group myResourceGroup \
  --zone-name example.com \
  --name "@" \
  --target-resource "$RESOURCE_ID"
```

### Option B: Using an External DNS Provider

If your DNS is managed outside Azure, you need a provider that supports ALIAS, ANAME, or flattened CNAME records at the apex. Cloudflare, for instance, supports CNAME flattening.

Create a CNAME record at the apex:

- **Type**: CNAME (with flattening enabled)
- **Name**: @ (apex)
- **Value**: Your Static Web App's default URL.

Then add the domain in Azure.

```bash
# Add the apex domain
az staticwebapp hostname set \
  --name my-static-app \
  --resource-group myResourceGroup \
  --hostname example.com
```

If your DNS provider does not support any form of apex aliasing, you have two options: migrate to Azure DNS or use a subdomain like `www.example.com` and set up a redirect from the apex.

## Step 3: SSL Certificate Provisioning

Azure Static Web Apps provides free SSL certificates automatically. When you add a custom domain, the certificate is provisioned within minutes. Here is what happens behind the scenes:

1. Azure validates domain ownership through the DNS record.
2. A certificate is requested from a certificate authority.
3. The certificate is installed on the CDN edge nodes serving your app.
4. Certificate renewal is handled automatically before expiration.

You do not need to do anything - it just works. The certificate covers the specific domain you added (not a wildcard).

### Checking Certificate Status

You can verify the SSL status in the portal under Custom domains. The certificate column shows one of:

- **Creating**: The certificate is being provisioned.
- **Ready**: The certificate is active and working.
- **Failed**: Something went wrong (usually a DNS issue).

Via the CLI, check the status with this command.

```bash
# List custom domains and their SSL status
az staticwebapp hostname list \
  --name my-static-app \
  --resource-group myResourceGroup \
  --output table
```

## Step 4: Configure WWW Redirect

Most sites want both `example.com` and `www.example.com` to work, with one redirecting to the other. Here is how to set that up.

First, add both domains to your Static Web App following the steps above. Then configure a redirect in your `staticwebapp.config.json`.

```json
{
  "routes": [
    {
      "route": "/*",
      "headers": {
        "Cache-Control": "public, max-age=3600"
      }
    }
  ],
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  },
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*", "/js/*"]
  }
}
```

For the actual www-to-apex redirect (or vice versa), you handle this at the DNS level rather than in the app config. Set up a redirect record with your DNS provider pointing `www.example.com` to `example.com`.

## Step 5: Verify HTTPS Works

After adding the domain and waiting for the certificate to provision, test your setup.

```bash
# Check that HTTPS is working with your custom domain
curl -I https://app.example.com

# Verify the certificate details
openssl s_client -connect app.example.com:443 -servername app.example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -dates
```

The output should show a valid certificate with your custom domain in the subject and an expiration date several months in the future.

## Step 6: Force HTTPS

Azure Static Web Apps serves content over HTTPS by default, but HTTP requests are also accepted and redirected. If you want to ensure all traffic uses HTTPS (which you should), the platform handles this automatically. All HTTP requests to your custom domain are 301 redirected to HTTPS.

You can verify this by testing an HTTP request.

```bash
# Verify HTTP is redirected to HTTPS
curl -I http://app.example.com
```

The response should include:

```
HTTP/1.1 301 Moved Permanently
Location: https://app.example.com/
```

## Troubleshooting Common Issues

**Domain validation fails**: This usually means the DNS record has not propagated yet. Use a tool like `dig` or `nslookup` to verify the record exists.

```bash
# Check if the CNAME record is visible
dig app.example.com CNAME +short
```

**Certificate stuck in "Creating" state**: This can happen if DNS propagation is slow. Wait 30 minutes and check again. If it is still stuck after an hour, remove the custom domain and re-add it.

**Mixed content warnings**: If your app loads resources over HTTP (images, scripts, stylesheets), browsers will block them on an HTTPS page. Update all resource URLs to use HTTPS or protocol-relative URLs.

**Multiple domains with different content**: Static Web Apps serves the same content on all custom domains. If you need different content per domain, you need separate Static Web App instances.

**DNS propagation delays**: After changing DNS records, propagation can take up to 48 hours in rare cases. Most of the time it is under an hour. Use `https://www.whatsmydns.net/` to check propagation status globally.

## Removing a Custom Domain

If you need to remove a custom domain, do it in the Azure portal or CLI first, then clean up the DNS record.

```bash
# Remove a custom domain from the Static Web App
az staticwebapp hostname delete \
  --name my-static-app \
  --resource-group myResourceGroup \
  --hostname app.example.com \
  --yes
```

After removing the domain from Azure, delete the corresponding DNS record from your DNS provider to avoid pointing a domain at a service that no longer claims it.

## Summary

Setting up custom domains on Azure Static Web Apps is straightforward. Subdomains use a simple CNAME record, apex domains need ALIAS records or Azure DNS, and SSL certificates are automatically provisioned and renewed. The whole process takes about 15 minutes of active work plus waiting time for DNS propagation. Once configured, you get free HTTPS with automatic certificate management, which is one less thing to worry about in your infrastructure.
