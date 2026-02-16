# How to Configure a Custom Domain and SSL Certificate on Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, Custom Domain, SSL Certificate, HTTPS, Web Security

Description: Step-by-step guide to mapping a custom domain to Azure App Service and configuring SSL certificates for secure HTTPS connections.

---

Every Azure App Service gets a default domain like `myapp.azurewebsites.net`. That works for testing, but no one wants to run a production application on a `.azurewebsites.net` subdomain. You want your own domain - `myapp.com` or `app.mycompany.com` - with a proper SSL certificate so browsers show the lock icon and your traffic is encrypted.

Setting this up involves three pieces: DNS configuration, domain verification, and SSL certificate installation. Each piece has options and gotchas that I will walk through in detail.

## Prerequisites

Before starting, you need:
- An Azure App Service on a paid tier (Basic B1 or higher - free and shared tiers do not support custom domains)
- A domain name that you own and can manage DNS for
- Access to your DNS provider's management panel

## Step 1: Verify Your Domain Ownership

Azure needs to verify that you actually own the domain before it lets you map it to your App Service. There are two verification methods:

### Method A: CNAME Record (for subdomains like www.myapp.com)

Add a CNAME record in your DNS provider that points your subdomain to your App Service:

```
Type: CNAME
Host: www
Value: myapp.azurewebsites.net
TTL: 3600
```

### Method B: TXT Record (for root/apex domains like myapp.com)

For root domains, you cannot use a CNAME (it breaks DNS standards). Instead, add a TXT record for verification and an A record for routing:

```
Type: TXT
Host: asuid
Value: <verification-id>
TTL: 3600
```

Get the verification ID from the Azure portal (Custom domains section) or the CLI:

```bash
# Get the custom domain verification ID
az webapp show \
  --resource-group myAppRG \
  --name myapp \
  --query "customDomainVerificationId" -o tsv
```

Then add the TXT record:

```
Type: TXT
Host: asuid.myapp.com
Value: <the-verification-id-from-above>
TTL: 3600
```

And add an A record pointing to your App Service's IP:

```bash
# Get the App Service IP address
az webapp show \
  --resource-group myAppRG \
  --name myapp \
  --query "inboundIpAddress" -o tsv
```

```
Type: A
Host: @
Value: <app-service-ip>
TTL: 3600
```

## Step 2: Add the Custom Domain to App Service

Once DNS records are in place (allow 5-10 minutes for propagation), add the domain:

```bash
# Add a subdomain (www.myapp.com)
az webapp config hostname add \
  --resource-group myAppRG \
  --webapp-name myapp \
  --hostname www.myapp.com

# Add a root domain (myapp.com)
az webapp config hostname add \
  --resource-group myAppRG \
  --webapp-name myapp \
  --hostname myapp.com
```

Verify the custom domain is mapped:

```bash
# List all custom domains on the app
az webapp config hostname list \
  --resource-group myAppRG \
  --webapp-name myapp \
  --query "[].{Hostname:name, SSL:sslState}" -o table
```

## Step 3: Configure SSL Certificates

You have three options for SSL certificates:

### Option 1: App Service Managed Certificate (Free)

Azure provides free SSL certificates for custom domains. These are issued by DigiCert and automatically renewed.

```bash
# Create a free managed certificate for a subdomain
az webapp config ssl create \
  --resource-group myAppRG \
  --name myapp \
  --hostname www.myapp.com

# Bind the certificate to the hostname
az webapp config ssl bind \
  --resource-group myAppRG \
  --name myapp \
  --certificate-thumbprint <thumbprint-from-previous-command> \
  --ssl-type SNI
```

Limitations of managed certificates:
- Only supports subdomains, not root/apex domains
- No wildcard support
- Cannot be exported
- Auto-renews every 6 months

### Option 2: Azure Key Vault Certificate

For more control, use a certificate stored in Azure Key Vault:

```bash
# Create a Key Vault (if you do not have one)
az keyvault create \
  --resource-group myAppRG \
  --name myAppKeyVault \
  --location eastus

# Import an existing certificate
az keyvault certificate import \
  --vault-name myAppKeyVault \
  --name myapp-cert \
  --file myapp.pfx \
  --password <pfx-password>

# Or create a certificate request through Key Vault
az keyvault certificate create \
  --vault-name myAppKeyVault \
  --name myapp-cert \
  --policy "$(az keyvault certificate get-default-policy)"

# Import the Key Vault certificate to App Service
az webapp config ssl import \
  --resource-group myAppRG \
  --name myapp \
  --key-vault myAppKeyVault \
  --key-vault-certificate-name myapp-cert

# Bind it
az webapp config ssl bind \
  --resource-group myAppRG \
  --name myapp \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

### Option 3: Upload Your Own Certificate

If you have a certificate from a third-party CA (like Let's Encrypt):

```bash
# Upload a PFX certificate
az webapp config ssl upload \
  --resource-group myAppRG \
  --name myapp \
  --certificate-file myapp.pfx \
  --certificate-password <pfx-password>

# Bind the certificate
az webapp config ssl bind \
  --resource-group myAppRG \
  --name myapp \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

## Step 4: Enforce HTTPS

After configuring SSL, force all traffic to use HTTPS:

```bash
# Redirect all HTTP traffic to HTTPS
az webapp update \
  --resource-group myAppRG \
  --name myapp \
  --set httpsOnly=true
```

This tells App Service to return a 301 redirect for any HTTP request, sending the client to the HTTPS version of the URL.

You can also enforce HTTPS at the application level for more control:

```javascript
// Express middleware to enforce HTTPS on App Service
app.use((req, res, next) => {
  // App Service sets x-forwarded-proto header
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.hostname}${req.url}`);
  }
  next();
});
```

## Setting Up Both Root and WWW Domains

Most sites want both `myapp.com` and `www.myapp.com` to work. The best practice is to choose one as canonical and redirect the other:

```bash
# Add both domains
az webapp config hostname add --resource-group myAppRG --webapp-name myapp --hostname myapp.com
az webapp config hostname add --resource-group myAppRG --webapp-name myapp --hostname www.myapp.com

# Create and bind certificates for both
# (Managed certificate for www, Key Vault or uploaded cert for root)
```

In your application, redirect the non-canonical domain:

```javascript
// Redirect www to non-www (or vice versa)
app.use((req, res, next) => {
  if (req.hostname === 'www.myapp.com') {
    return res.redirect(301, `https://myapp.com${req.url}`);
  }
  next();
});
```

## Wildcard Certificates

If you have multiple subdomains (api.myapp.com, admin.myapp.com, etc.), a wildcard certificate simplifies management:

```bash
# Upload a wildcard certificate (*.myapp.com)
az webapp config ssl upload \
  --resource-group myAppRG \
  --name myapp \
  --certificate-file wildcard-myapp.pfx \
  --certificate-password <password>

# Bind it to specific hostnames
az webapp config ssl bind \
  --resource-group myAppRG \
  --name myapp \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

Note that App Service managed certificates do not support wildcards. You need to use Key Vault or uploaded certificates for wildcard domains.

## Certificate Renewal

### Managed Certificates

Managed certificates renew automatically. No action needed on your part.

### Key Vault Certificates

If you set up auto-renewal in Key Vault, App Service picks up the renewed certificate automatically when the Key Vault certificate is updated.

### Uploaded Certificates

You need to manually upload the renewed certificate and update the binding. Set a calendar reminder 30 days before expiration.

Monitor certificate expiration with Azure Monitor alerts:

```bash
# List certificates and their expiration dates
az webapp config ssl list \
  --resource-group myAppRG \
  --query "[].{Thumbprint:thumbprint, ExpirationDate:expirationDate, SubjectName:subjectName}" \
  -o table
```

## Troubleshooting Common Issues

### DNS Propagation Delays

DNS changes can take up to 48 hours to propagate globally, though most providers propagate within minutes. If Azure cannot verify your domain:

```bash
# Check DNS resolution
nslookup www.myapp.com
dig www.myapp.com CNAME
dig asuid.myapp.com TXT
```

### Certificate Binding Failures

If the certificate binding fails, check:
- The certificate must be in PFX format with the private key included
- The certificate must match the hostname (exact match or wildcard)
- The certificate must not be expired

### Mixed Content Warnings

After enabling HTTPS, your site might load resources (images, scripts, CSS) over HTTP. Browsers will block these or show warnings. Update all resource URLs to use HTTPS or protocol-relative URLs (//).

## Monitoring SSL Health

Set up monitoring to catch SSL issues before they affect users:

```bash
# Check the current SSL state of all custom domains
az webapp config hostname list \
  --resource-group myAppRG \
  --webapp-name myapp \
  --query "[].{Host:name, SSL:sslState, Thumbprint:thumbprint}" \
  -o table
```

Use OneUptime to monitor your HTTPS endpoint. Configure alerts for certificate expiration warnings (30 days, 14 days, 7 days before expiry) and for any SSL handshake failures.

## Wrapping Up

Custom domains and SSL on Azure App Service involve DNS configuration, domain verification, and certificate management. Use managed certificates for the simplest setup on subdomains, Key Vault certificates for root domains and wildcard needs, and always enforce HTTPS. Set up certificate expiration monitoring early so you never have an unexpected expiration take down your site. The whole process takes about 30 minutes from start to finish, assuming DNS propagation cooperates.
