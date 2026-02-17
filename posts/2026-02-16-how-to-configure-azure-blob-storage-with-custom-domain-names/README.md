# How to Configure Azure Blob Storage with Custom Domain Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Custom Domain, DNS, CDN, HTTPS, Web Hosting

Description: Step-by-step guide to mapping your own domain name to Azure Blob Storage for cleaner URLs and branded content delivery.

---

By default, Azure Blob Storage URLs look like `https://mystorageaccount.blob.core.windows.net/container/file.jpg`. That works fine for backend applications, but if you are serving public content - images, downloads, static websites - you probably want URLs under your own domain like `https://assets.yourdomain.com/images/logo.png`. Azure supports mapping custom domains to blob storage, but there are some important details around HTTPS support that you need to know.

## Two Approaches to Custom Domains

There are two ways to use a custom domain with Azure Blob Storage:

1. **Direct CNAME mapping**: Point your domain directly to the blob endpoint. Simple but does not support HTTPS on the custom domain.
2. **Azure CDN with custom domain**: Put Azure CDN in front of your storage account and map the custom domain to the CDN endpoint. Supports HTTPS with free managed certificates.

For most production scenarios, the CDN approach is the way to go because HTTPS is a hard requirement for modern web applications.

## Approach 1: Direct CNAME Mapping

This is the simpler setup, suitable when you do not need HTTPS on the custom domain (or when the storage is accessed over HTTP only, which is increasingly rare).

### Step 1: Create the DNS Record

At your DNS provider, create a CNAME record that points your subdomain to the blob storage endpoint:

```
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

```
# Default URL
https://mystorageaccount.blob.core.windows.net/images/logo.png

# Custom domain URL (HTTP only without CDN)
http://assets.yourdomain.com/images/logo.png
```

### Limitation: No HTTPS

The direct CNAME approach does not support HTTPS on the custom domain. Azure Blob Storage cannot present a certificate for your domain. If you access `https://assets.yourdomain.com`, you will get a certificate error because the storage endpoint presents a certificate for `*.blob.core.windows.net`. This is why most people use the CDN approach.

## Approach 2: Azure CDN with Custom Domain and HTTPS

This is the recommended approach for production. Azure CDN handles caching, HTTPS, and custom domain certificates.

### Step 1: Create a CDN Profile and Endpoint

```bash
# Create a CDN profile
az cdn profile create \
  --resource-group myResourceGroup \
  --name my-cdn-profile \
  --sku Standard_Microsoft \
  --location global

# Create a CDN endpoint pointing to the storage account
az cdn endpoint create \
  --resource-group myResourceGroup \
  --profile-name my-cdn-profile \
  --name my-cdn-endpoint \
  --origin "mystorageaccount.blob.core.windows.net" \
  --origin-host-header "mystorageaccount.blob.core.windows.net"
```

The CDN endpoint gets a default URL like `https://my-cdn-endpoint.azureedge.net`. This already works with HTTPS.

### Step 2: Add the Custom Domain to CDN

First, create a CNAME record at your DNS provider pointing to the CDN endpoint:

```
assets.yourdomain.com  CNAME  my-cdn-endpoint.azureedge.net
```

Then register the custom domain on the CDN endpoint:

```bash
# Add the custom domain to the CDN endpoint
az cdn custom-domain create \
  --resource-group myResourceGroup \
  --profile-name my-cdn-profile \
  --endpoint-name my-cdn-endpoint \
  --hostname "assets.yourdomain.com" \
  --name "assets-domain"
```

### Step 3: Enable HTTPS with a Managed Certificate

Azure CDN can automatically provision and manage a TLS certificate for your custom domain:

```bash
# Enable HTTPS with a CDN-managed certificate
az cdn custom-domain enable-https \
  --resource-group myResourceGroup \
  --profile-name my-cdn-profile \
  --endpoint-name my-cdn-endpoint \
  --name "assets-domain" \
  --min-tls-version "1.2"
```

Certificate provisioning takes 6-8 hours to complete. Azure handles:
- Domain validation
- Certificate issuance
- Certificate deployment to all CDN edge nodes
- Automatic renewal before expiry

Check the HTTPS provisioning status:

```bash
# Check HTTPS provisioning status
az cdn custom-domain show \
  --resource-group myResourceGroup \
  --profile-name my-cdn-profile \
  --endpoint-name my-cdn-endpoint \
  --name "assets-domain" \
  --query "customHttpsParameters"
```

### Step 4: Configure CDN Caching Rules

Optimize the CDN caching behavior for your content:

```bash
# Set caching rules on the CDN endpoint
# Cache images for 7 days, other content for 1 day
az cdn endpoint rule add \
  --resource-group myResourceGroup \
  --profile-name my-cdn-profile \
  --endpoint-name my-cdn-endpoint \
  --order 1 \
  --rule-name "CacheImages" \
  --match-variable UrlFileExtension \
  --operator Contains \
  --match-values "jpg" "png" "gif" "svg" "webp" \
  --action-name CacheExpiration \
  --cache-behavior Override \
  --cache-duration "7.00:00:00"
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

# Enable HTTPS with your own certificate
az cdn custom-domain enable-https \
  --resource-group myResourceGroup \
  --profile-name my-cdn-profile \
  --endpoint-name my-cdn-endpoint \
  --name "assets-domain" \
  --user-cert-group-name myResourceGroup \
  --user-cert-vault-name myKeyVault \
  --user-cert-secret-name assets-cert \
  --user-cert-protocol-type sni
```

## Static Website Hosting with Custom Domain

If you are using Azure Blob Storage's static website feature, the process is slightly different. Static websites use a different endpoint (`mystorageaccount.z13.web.core.windows.net`) instead of the standard blob endpoint.

```bash
# Enable static website hosting
az storage blob service-properties update \
  --account-name mystorageaccount \
  --static-website \
  --index-document "index.html" \
  --404-document "404.html"
```

For the CDN origin, point to the static website endpoint:

```bash
# Create CDN endpoint for static website
az cdn endpoint create \
  --resource-group myResourceGroup \
  --profile-name my-cdn-profile \
  --name my-website-endpoint \
  --origin "mystorageaccount.z13.web.core.windows.net" \
  --origin-host-header "mystorageaccount.z13.web.core.windows.net"
```

Then follow the same custom domain and HTTPS steps as before.

## Apex Domain Support

If you want to use an apex domain (like `yourdomain.com` instead of `assets.yourdomain.com`), you cannot use a CNAME record because of DNS protocol restrictions. Instead, use Azure DNS with alias records:

```bash
# Create an alias record in Azure DNS that points to the CDN endpoint
az network dns record-set a create \
  --resource-group myResourceGroup \
  --zone-name yourdomain.com \
  --name "@" \
  --target-resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Cdn/profiles/my-cdn-profile/endpoints/my-cdn-endpoint"
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

The certificate should show your domain as the subject and should be valid. If you see a certificate for `*.azureedge.net` instead, the custom domain HTTPS provisioning is not complete yet.

Custom domains for blob storage are one of those things that seem like they should be simple but have enough moving parts to trip you up. The CDN approach is the right default because it gives you HTTPS, caching, and global distribution all in one. If you are just serving a few files and HTTPS does not matter, the direct CNAME works. But for anything user-facing, go with CDN.
