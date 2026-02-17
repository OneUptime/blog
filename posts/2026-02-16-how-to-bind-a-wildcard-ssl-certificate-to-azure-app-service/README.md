# How to Bind a Wildcard SSL Certificate to Azure App Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, App Service, SSL, Wildcard Certificate, HTTPS, Security, Custom Domains

Description: How to obtain, upload, and bind a wildcard SSL certificate to Azure App Service for securing multiple subdomains under a single certificate.

---

If you run multiple subdomains on Azure App Service - say `api.myapp.com`, `dashboard.myapp.com`, and `admin.myapp.com` - you do not want to manage a separate SSL certificate for each one. A wildcard SSL certificate covers all subdomains under a domain (e.g., `*.myapp.com`), making certificate management much simpler.

This post covers how to get a wildcard certificate, upload it to Azure App Service, and bind it to your custom domains.

## What is a Wildcard SSL Certificate?

A wildcard certificate uses an asterisk in the domain name, like `*.myapp.com`. It secures any subdomain at that level:

- `api.myapp.com` - covered
- `www.myapp.com` - covered
- `dashboard.myapp.com` - covered
- `deep.sub.myapp.com` - NOT covered (wildcards only work one level deep)

If you need to cover multiple levels, you would need a certificate for `*.sub.myapp.com` as well, or use a multi-domain (SAN) certificate.

## Obtaining a Wildcard Certificate

You have a few options for getting a wildcard certificate:

### Option 1: Azure App Service Certificate

Azure sells SSL certificates directly, including wildcards. This is convenient because Azure manages the certificate lifecycle for you.

1. Go to the Azure Portal and search for "App Service Certificates"
2. Click "Create"
3. Select "Wildcard" as the certificate type
4. Enter your domain (e.g., `*.myapp.com`)
5. Choose a resource group and Key Vault for storing the certificate
6. Complete the purchase

After purchase, you need to verify domain ownership (via email, DNS TXT record, or App Service verification).

### Option 2: Let's Encrypt (Free)

Let's Encrypt issues free wildcard certificates, but they require DNS-01 validation. You can use tools like certbot to obtain one:

```bash
# Install certbot if you do not have it
# Use DNS challenge for wildcard certificates
sudo certbot certonly \
    --manual \
    --preferred-challenges dns \
    -d "*.myapp.com" \
    -d "myapp.com"

# This will ask you to create DNS TXT records
# After validation, the certificate files are saved locally
```

Note that Let's Encrypt certificates expire every 90 days, so you need to set up automated renewal.

### Option 3: Third-Party Certificate Authority

Purchase a wildcard certificate from providers like DigiCert, Comodo, or GoDaddy. They typically issue certificates valid for 1-2 years.

## Preparing the Certificate for Upload

Azure App Service requires the certificate in PFX format (also called PKCS#12). If you have separate certificate and key files (common with Let's Encrypt), convert them:

```bash
# Convert PEM files to PFX format
# The -inkey flag specifies the private key
# The -in flag specifies the certificate
# The -certfile flag includes the CA chain
openssl pkcs12 -export \
    -out wildcard-certificate.pfx \
    -inkey privkey.pem \
    -in cert.pem \
    -certfile chain.pem \
    -password pass:YourStrongPassword
```

The resulting PFX file contains the private key, the certificate, and the CA chain - everything Azure needs.

## Uploading the Certificate to Azure

### Through the Azure Portal

1. Go to your App Service
2. Navigate to "Certificates" in the left menu (under Settings)
3. Click "Bring your own certificate (.pfx)"
4. Click "Add certificate"
5. Upload the PFX file and enter the password
6. Click "Validate" then "Add"

### Through Azure CLI

```bash
# Upload the PFX certificate to your App Service
az webapp config ssl upload \
    --name my-app-service \
    --resource-group my-resource-group \
    --certificate-file wildcard-certificate.pfx \
    --certificate-password "YourStrongPassword"
```

The command returns a thumbprint that you will need for binding.

## Adding Custom Domains

Before you can bind the certificate, you need to add the custom domains to your App Service:

```bash
# Add a custom domain
az webapp config hostname add \
    --webapp-name my-app-service \
    --resource-group my-resource-group \
    --hostname "api.myapp.com"

# Add another subdomain
az webapp config hostname add \
    --webapp-name my-app-service \
    --resource-group my-resource-group \
    --hostname "dashboard.myapp.com"

# And another
az webapp config hostname add \
    --webapp-name my-app-service \
    --resource-group my-resource-group \
    --hostname "admin.myapp.com"
```

For each domain, you need a DNS record pointing to your App Service:

- **CNAME record**: Point the subdomain to `my-app-service.azurewebsites.net`
- **TXT record**: Add a verification TXT record `asuid.api` with your App Service's custom domain verification ID

```bash
# Get the custom domain verification ID
az webapp show \
    --name my-app-service \
    --resource-group my-resource-group \
    --query "customDomainVerificationId" \
    --output tsv
```

## Binding the Certificate to Domains

Now bind the wildcard certificate to each custom domain:

```bash
# Get the certificate thumbprint
THUMBPRINT=$(az webapp config ssl list \
    --resource-group my-resource-group \
    --query "[?subjectName=='*.myapp.com'].thumbprint" \
    --output tsv)

# Bind the certificate to the first subdomain
az webapp config ssl bind \
    --name my-app-service \
    --resource-group my-resource-group \
    --certificate-thumbprint $THUMBPRINT \
    --ssl-type SNI

# The SNI type is recommended - it allows multiple SSL certificates on one IP
```

Repeat the bind command for each custom domain. Since it is a wildcard certificate, the same certificate works for all subdomains.

### SSL Types

There are two binding types:

- **SNI SSL** - Server Name Indication. The modern approach where the client includes the hostname in the TLS handshake. Works with all modern browsers and is the recommended option.
- **IP-based SSL** - Requires a dedicated IP address for each certificate. Only needed if you support very old clients that do not support SNI.

## Using Azure Key Vault for Certificate Storage

For better security and easier management, store your certificate in Azure Key Vault:

```bash
# Create a Key Vault if you do not have one
az keyvault create \
    --name my-cert-vault \
    --resource-group my-resource-group \
    --location eastus

# Import the certificate into Key Vault
az keyvault certificate import \
    --vault-name my-cert-vault \
    --name wildcard-myapp \
    --file wildcard-certificate.pfx \
    --password "YourStrongPassword"

# Grant App Service access to the Key Vault
# First, get the App Service resource provider's service principal
az ad sp show --id abfa0a7c-a6b6-4736-8310-5855508787cd --query objectId -o tsv

# Then grant it GET permissions on certificates and secrets
az keyvault set-policy \
    --name my-cert-vault \
    --object-id "<object-id-from-above>" \
    --certificate-permissions get \
    --secret-permissions get
```

Then import the certificate from Key Vault into your App Service:

```bash
# Import the certificate from Key Vault
az webapp config ssl import \
    --resource-group my-resource-group \
    --name my-app-service \
    --key-vault my-cert-vault \
    --key-vault-certificate-name wildcard-myapp
```

The advantage of this approach is that when you renew the certificate in Key Vault, App Service can automatically pick up the new version.

## Certificate Renewal

### Auto-Renewal with Azure App Service Certificates

If you purchased the certificate through Azure, auto-renewal is built in. Azure renews the certificate before it expires and updates all bindings automatically.

### Manual Renewal

For certificates from other sources:

1. Obtain the renewed certificate
2. Convert to PFX if needed
3. Upload the new certificate
4. Update the bindings to use the new thumbprint
5. Delete the old certificate

```bash
# Upload the renewed certificate
az webapp config ssl upload \
    --name my-app-service \
    --resource-group my-resource-group \
    --certificate-file renewed-wildcard.pfx \
    --certificate-password "NewPassword"

# Re-bind with the new thumbprint
NEW_THUMBPRINT="<new-thumbprint-from-upload>"
az webapp config ssl bind \
    --name my-app-service \
    --resource-group my-resource-group \
    --certificate-thumbprint $NEW_THUMBPRINT \
    --ssl-type SNI
```

## Enforcing HTTPS

After binding the certificate, enforce HTTPS so all HTTP requests redirect to HTTPS:

```bash
# Enable HTTPS-only mode
az webapp update \
    --name my-app-service \
    --resource-group my-resource-group \
    --set httpsOnly=true
```

You can also set the minimum TLS version to ensure only modern clients can connect:

```bash
# Set minimum TLS version to 1.2
az webapp config set \
    --name my-app-service \
    --resource-group my-resource-group \
    --min-tls-version 1.2
```

## Summary

Wildcard SSL certificates simplify HTTPS management when you have multiple subdomains on Azure App Service. Upload the certificate once, bind it to each subdomain, and you are covered. For the best experience, use Azure Key Vault to store the certificate and set up auto-renewal. And always enforce HTTPS-only mode and a minimum TLS version to keep your users' connections secure.
