# How to Configure Azure Blob Storage with Custom Domain Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Custom Domain, DNS, CDN, HTTPS, Web Hosting

Description: Step-by-step guide to mapping your own domain name to Azure Blob Storage for cleaner URLs and branded content delivery.

---

By default, Azure Blob Storage URLs look like `https://mystorageaccount.blob.core.windows.net/container/file.jpg`. That works fine for backend applications, but if you are serving public content - images, downloads, static websites - you probably want URLs under your own domain like `https://assets.yourdomain.com/images/logo.png`. Azure supports mapping custom domains to blob storage, but there are some important details around HTTPS support that you need to know.

## Two Approaches to Custom Domains

There are two ways to use a custom domain with Azure Blob Storage:

1. **Direct CNAME mapping**: Point your domain directly to the blob endpoint. Simple but does not support HTTPS on the custom domain.
2. **Azure Front Door with custom domain**: Put Azure Front Door in front of your storage account and map the custom domain to the Front Door endpoint. Supports HTTPS with free managed certificates.

For most production scenarios, the Front Door approach is the way to go because HTTPS is a hard requirement for modern web applications.

## Approach 1: Direct CNAME Mapping

This is the simpler setup, suitable when you do not need HTTPS on the custom domain and the storage account allows HTTP access, which is increasingly rare.

### Step 1: Create the DNS Record

At your DNS provider, create a CNAME record that points your subdomain to the blob storage endpoint:

```text
assets.yourdomain.com  CNAME  mystorageaccount.blob.core.windows.net
```

The record needs to propagate before Azure will accept the mapping. You can verify propagation with:

```bash
# Check if the CNAME record has propagated

nslookup assets.yourdomain.com
# Should return mystorageaccount.blob.core.windows.net
```

### Step 2: Register the Custom Domain in Azure

```bash
# Map the custom domain to the storage account
az storage account update \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --custom-domain "assets.yourdomain.com"
```

If this fails because the CNAME has not propagated yet, you can use the intermediary `asverify` subdomain for zero-downtime registration:

```bash
# Step 1: Create an asverify CNAME record at your DNS provider
# asverify.assets.yourdomain.com  CNAME  asverify.mystorageaccount.blob.core.windows.net

# Step 2: Register using the validation flag
az storage account update \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --custom-domain "assets.yourdomain.com" \
  --use-subdomain true
```

The `asverify` approach lets you validate ownership without affecting any existing DNS records pointing to other services.

### Step 3: Test the Custom Domain

After the mapping is in place, blobs are accessible at both the default and custom domain URLs:

```text
# Default URL
https://mystorageaccount.blob.core.windows.net/images/logo.png

# Custom domain URL (HTTP only without Front Door)
http://assets.yourdomain.com/images/logo.png
```

### Limitation: No HTTPS

The direct CNAME approach does not support HTTPS on the custom domain. Azure Blob Storage cannot present a certificate for your domain. If you access `https://assets.yourdomain.com`, you will get a certificate error because the storage endpoint presents a certificate for `*.blob.core.windows.net`. This is why most people use the Front Door approach.

## Approach 2: Azure Front Door with Custom Domain and HTTPS

This is the recommended approach for production. Azure Front Door handles caching, HTTPS, and custom domain certificates.

### Step 1: Create a Front Door Profile and Endpoint

```bash
# Create a Front Door profile
az afd profile create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --sku Standard_AzureFrontDoor

# Create a Front Door endpoint
az afd endpoint create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --endpoint-name my-front-door-endpoint \
  --enabled-state Enabled

# Create an origin group
az afd origin-group create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --origin-group-name storage-origin-group \
  --probe-request-type HEAD \
  --probe-protocol Https \
  --probe-interval-in-seconds 100 \
  --probe-path /

# Add the storage account as an origin
az afd origin create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --origin-group-name storage-origin-group \
  --origin-name storage-origin \
  --host-name mystorageaccount.blob.core.windows.net \
  --origin-host-header mystorageaccount.blob.core.windows.net \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled
```

The Front Door endpoint gets a default URL like `https://my-front-door-endpoint.azurefd.net`. This already works with HTTPS.

### Step 2: Add the Custom Domain to Front Door

First, create a CNAME record at your DNS provider pointing to the Front Door endpoint:

```text
assets.yourdomain.com  CNAME  my-front-door-endpoint.azurefd.net
```

Then register the custom domain on the Front Door profile:

```bash
# Add the custom domain to Front Door
az afd custom-domain create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --custom-domain-name assets-domain \
  --host-name "assets.yourdomain.com" \
  --certificate-type ManagedCertificate \
  --minimum-tls-version TLS12
```

If the domain is not already validated or prevalidated in Azure, Front Door returns a DNS validation token. Add the requested TXT record at your DNS provider, then wait for domain validation to complete before attaching the domain to a route.

### Step 3: Enable HTTPS with a Managed Certificate

Azure Front Door can automatically provision and manage a TLS certificate for your custom domain. Create a route that attaches the custom domain to the endpoint and origin group:

```bash
# Route requests from the custom domain to the storage origin
az afd route create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --endpoint-name my-front-door-endpoint \
  --route-name storage-route \
  --origin-group storage-origin-group \
  --origins storage-origin \
  --supported-protocols Http Https \
  --patterns-to-match "/*" \
  --forwarding-protocol HttpsOnly \
  --https-redirect Enabled \
  --link-to-default-domain Enabled \
  --custom-domains assets-domain
```

Certificate provisioning can take several minutes to complete after domain validation. Azure handles:
- Domain validation
- Certificate issuance
- Certificate deployment to all Front Door edge nodes
- Automatic renewal before expiry

Check the HTTPS provisioning status:

```bash
# Check HTTPS provisioning status
az afd custom-domain show \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --custom-domain-name assets-domain \
  --query "{validation:domainValidationState,deployment:deploymentStatus}"
```

### Step 4: Configure Front Door Caching

Optimize Front Door caching behavior for your content:

```bash
# Enable caching on the route
az afd route update \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --endpoint-name my-front-door-endpoint \
  --route-name storage-route \
  --enable-caching true \
  --query-string-caching-behavior IgnoreQueryString
```

## Using Your Own Certificate

If you need to use a certificate from your own CA (for example, an extended validation certificate), you can bring your own certificate stored in Azure Key Vault:

```bash
# First, upload your certificate to Azure Key Vault
az keyvault certificate import \
  --vault-name myKeyVault \
  --name assets-cert \
  --file ./assets-yourdomain-com.pfx \
  --password "cert-password"

# Register the Key Vault certificate as a Front Door secret
az afd secret create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --secret-name assets-cert-secret \
  --secret-source "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.KeyVault/vaults/myKeyVault/secrets/assets-cert"

# Update the custom domain to use your certificate
az afd custom-domain update \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --custom-domain-name assets-domain \
  --certificate-type CustomerCertificate \
  --secret assets-cert-secret \
  --minimum-tls-version TLS12
```

## Static Website Hosting with Custom Domain

If you are using Azure Blob Storage's static website feature, the process is slightly different. Static websites use a different endpoint (`mystorageaccount.<zone-id>.web.core.windows.net`) instead of the standard blob endpoint.

```bash
# Enable static website hosting
az storage blob service-properties update \
  --account-name mystorageaccount \
  --static-website \
  --index-document "index.html" \
  --404-document "404.html"
```

For the Front Door origin, point to the static website endpoint:

```bash
# Create a Front Door origin for the static website endpoint
az afd origin create \
  --resource-group myResourceGroup \
  --profile-name my-front-door-profile \
  --origin-group-name storage-origin-group \
  --origin-name static-website-origin \
  --host-name mystorageaccount.<zone-id>.web.core.windows.net \
  --origin-host-header mystorageaccount.<zone-id>.web.core.windows.net \
  --priority 1 \
  --weight 1000 \
  --enabled-state Enabled
```

Then follow the same custom domain and HTTPS steps as before.
Use `static-website-origin` instead of `storage-origin` when you create or update the route for the static website.

## Apex Domain Support

If you want to use an apex domain (like `yourdomain.com` instead of `assets.yourdomain.com`), you cannot use a CNAME record because of DNS protocol restrictions. Instead, use Azure DNS with alias records:

```bash
# Create an alias record in Azure DNS that points to the Front Door endpoint
az network dns record-set a create \
  --resource-group myResourceGroup \
  --zone-name yourdomain.com \
  --name "@" \
  --target-resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Cdn/profiles/my-front-door-profile/afdEndpoints/my-front-door-endpoint"
```

This requires your domain's DNS to be hosted in Azure DNS.

## Testing and Verification

After everything is set up, verify the full chain:

```bash
# Test DNS resolution
nslookup assets.yourdomain.com

# Test HTTPS connectivity
curl -v https://assets.yourdomain.com/images/logo.png

# Check the certificate details
openssl s_client -connect assets.yourdomain.com:443 -servername assets.yourdomain.com < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

The certificate should show your domain as the subject and should be valid. If you see a certificate for `*.azurefd.net` instead, the custom domain HTTPS provisioning is not complete yet.

Custom domains for blob storage are one of those things that seem like they should be simple but have enough moving parts to trip you up. The Front Door approach is the right default because it gives you HTTPS, caching, and global distribution all in one. If you are just serving a few files and HTTPS does not matter, the direct CNAME works. But for anything user-facing, go with Front Door.
