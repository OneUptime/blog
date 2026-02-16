# How to Set Up Azure Blob Storage Static Website with a Custom SSL Certificate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Static Website, SSL Certificate, CDN, Custom Domain, HTTPS

Description: Step-by-step guide to hosting a static website on Azure Blob Storage with a custom domain and SSL certificate using Azure CDN.

---

Hosting a static website on Azure Blob Storage is one of the cheapest and simplest ways to serve HTML, CSS, and JavaScript files. But out of the box, the static website endpoint only supports HTTP on the default `*.web.core.windows.net` domain. If you want to use your own domain with HTTPS, you need to add Azure CDN in front and configure a custom SSL certificate.

This guide walks through the full setup from enabling the static website feature to serving it over HTTPS on your own domain.

## Why Azure Blob Storage for Static Sites?

Before we dive in, here is why this approach makes sense:

- **Cost**: Storage costs are fractions of a penny per GB per month. Serving a small website costs under $1/month.
- **Scalability**: Azure Blob Storage handles traffic spikes without any configuration.
- **Simplicity**: No web servers to manage, patch, or monitor.
- **Performance**: Combined with Azure CDN, your content is served from edge locations worldwide.

The trade-off is that you cannot run server-side code. For SPAs (Single Page Applications), marketing sites, documentation sites, and blogs, this is a perfect fit.

## Step 1: Enable Static Website Hosting

First, enable the static website feature on your storage account.

The following CLI command enables static website hosting and specifies the index and error documents:

```bash
# Enable static website hosting on the storage account
az storage blob service-properties update \
  --account-name stmywebsite2026 \
  --static-website \
  --index-document index.html \
  --404-document 404.html
```

This creates a special container called `$web` in your storage account. Any files you upload to this container are served through the static website endpoint.

The endpoint URL will be something like: `https://stmywebsite2026.z13.web.core.windows.net/`

## Step 2: Upload Your Website Files

Upload your static site files to the `$web` container.

This command uploads an entire directory while setting the correct content types automatically:

```bash
# Upload all files from local build directory to $web container
# --content-type is set automatically based on file extension
az storage blob upload-batch \
  --account-name stmywebsite2026 \
  --destination '$web' \
  --source ./build/ \
  --overwrite true

# Verify the upload
az storage blob list \
  --account-name stmywebsite2026 \
  --container-name '$web' \
  --output table
```

Test the default endpoint in your browser to make sure the site loads correctly before adding a custom domain.

## Step 3: Create an Azure CDN Profile and Endpoint

To use a custom domain with HTTPS, you need Azure CDN in front of the static website. Azure CDN also gives you caching, compression, and global distribution.

Create a CDN profile and endpoint pointing to the static website URL:

```bash
# Create a CDN profile using the Standard Microsoft tier
az cdn profile create \
  --resource-group rg-website \
  --name cdn-mywebsite \
  --sku Standard_Microsoft

# Create a CDN endpoint pointing to the static website origin
# Note: the origin hostname is the static website URL without https://
az cdn endpoint create \
  --resource-group rg-website \
  --profile-name cdn-mywebsite \
  --name mywebsite-endpoint \
  --origin stmywebsite2026.z13.web.core.windows.net \
  --origin-host-header stmywebsite2026.z13.web.core.windows.net \
  --enable-compression true \
  --content-types-to-compress "text/html" "text/css" "application/javascript" "application/json"
```

The CDN endpoint URL will be `https://mywebsite-endpoint.azureedge.net`. Test this URL to make sure content loads through the CDN.

## Step 4: Configure Your Custom Domain DNS

Before you can add a custom domain to the CDN endpoint, you need to create a CNAME record in your DNS provider.

Create these DNS records:

| Record Type | Name | Value |
|------------|------|-------|
| CNAME | www | mywebsite-endpoint.azureedge.net |
| CNAME | cdnverify.www | cdnverify.mywebsite-endpoint.azureedge.net |

The `cdnverify` record is used for domain validation without redirecting traffic. This is useful if you are migrating from another hosting provider and want to validate first.

If you are using Azure DNS, you can create the records via CLI:

```bash
# Create the CNAME record for www subdomain
az network dns record-set cname set-record \
  --resource-group rg-website \
  --zone-name example.com \
  --record-set-name www \
  --cname mywebsite-endpoint.azureedge.net

# Create the cdnverify record for domain validation
az network dns record-set cname set-record \
  --resource-group rg-website \
  --zone-name example.com \
  --record-set-name cdnverify.www \
  --cname cdnverify.mywebsite-endpoint.azureedge.net
```

Allow a few minutes for DNS propagation before proceeding.

## Step 5: Add the Custom Domain to CDN

Once DNS is configured, add the custom domain to your CDN endpoint:

```bash
# Add custom domain to the CDN endpoint
az cdn custom-domain create \
  --resource-group rg-website \
  --profile-name cdn-mywebsite \
  --endpoint-name mywebsite-endpoint \
  --hostname www.example.com \
  --name www-example-com
```

Azure validates the CNAME record before accepting the custom domain. If validation fails, double-check your DNS records and wait for propagation.

## Step 6: Enable HTTPS with a Managed Certificate

The simplest approach is to use Azure CDN's free managed certificate. Azure handles certificate issuance, renewal, and installation automatically.

```bash
# Enable HTTPS with CDN-managed certificate
az cdn custom-domain enable-https \
  --resource-group rg-website \
  --profile-name cdn-mywebsite \
  --endpoint-name mywebsite-endpoint \
  --name www-example-com
```

The managed certificate provisioning takes 6-8 hours. During this time, Azure:

1. Validates domain ownership via the CNAME record
2. Requests a certificate from DigiCert
3. Deploys the certificate to all CDN edge nodes

You can check the provisioning status in the portal or via CLI.

## Step 6 (Alternative): Use Your Own Certificate from Key Vault

If you need to use your own certificate (for example, an organization-validated or extended-validation cert), store it in Azure Key Vault and link it to the CDN.

First, import your certificate into Key Vault:

```bash
# Import a PFX certificate into Key Vault
az keyvault certificate import \
  --vault-name kv-mywebsite \
  --name www-example-com-cert \
  --file ./www-example-com.pfx \
  --password "pfx-password-here"
```

Then grant the CDN service principal access to your Key Vault. The CDN service principal ID for Microsoft CDN is `205478c0-bd83-4e1b-a9d6-db63a3e1e1c8`:

```bash
# Grant CDN access to Key Vault secrets and certificates
az keyvault set-policy \
  --name kv-mywebsite \
  --spn 205478c0-bd83-4e1b-a9d6-db63a3e1e1c8 \
  --secret-permissions get \
  --certificate-permissions get
```

Finally, enable HTTPS using the Key Vault certificate:

```bash
# Enable HTTPS with your own certificate from Key Vault
az cdn custom-domain enable-https \
  --resource-group rg-website \
  --profile-name cdn-mywebsite \
  --endpoint-name mywebsite-endpoint \
  --name www-example-com \
  --user-cert-subscription-id "<subscription-id>" \
  --user-cert-group-name rg-website \
  --user-cert-vault-name kv-mywebsite \
  --user-cert-secret-name www-example-com-cert \
  --user-cert-protocol-type sni
```

## Step 7: Configure CDN Rules for SPA Routing

If you are hosting a single-page application that uses client-side routing, you need a URL rewrite rule to redirect all requests to `index.html`.

This CDN rule catches any request that does not match a file and rewrites it to serve `index.html`:

```bash
# Create a rules engine rule for SPA routing
az cdn endpoint rule add \
  --resource-group rg-website \
  --profile-name cdn-mywebsite \
  --endpoint-name mywebsite-endpoint \
  --order 1 \
  --rule-name "SPARouting" \
  --match-variable UrlFileExtension \
  --operator LessThan \
  --match-values 1 \
  --action-name "UrlRewrite" \
  --source-pattern "/" \
  --destination "/index.html" \
  --preserve-unmatched-path false
```

## Step 8: Force HTTPS Redirect

You should redirect all HTTP requests to HTTPS. Add another CDN rule for this:

```bash
# Add HTTP to HTTPS redirect rule
az cdn endpoint rule add \
  --resource-group rg-website \
  --profile-name cdn-mywebsite \
  --endpoint-name mywebsite-endpoint \
  --order 0 \
  --rule-name "ForceHTTPS" \
  --match-variable RequestScheme \
  --operator Equal \
  --match-values HTTP \
  --action-name "UrlRedirect" \
  --redirect-type Found \
  --redirect-protocol Https
```

## Testing Your Setup

After everything is provisioned, test the following:

1. `http://www.example.com` should redirect to `https://www.example.com`
2. `https://www.example.com` should load your site with a valid SSL certificate
3. Check the certificate in your browser to confirm it shows your custom domain
4. Test SPA routes if applicable (deep links should load correctly)

Use `curl` for a quick check:

```bash
# Check HTTPS and certificate details
curl -vI https://www.example.com 2>&1 | grep -E "SSL|subject|issuer|HTTP"

# Verify HTTP redirects to HTTPS
curl -I http://www.example.com
```

## Purging the CDN Cache

When you update your website, you need to purge the CDN cache to serve fresh content:

```bash
# Purge all cached content
az cdn endpoint purge \
  --resource-group rg-website \
  --profile-name cdn-mywebsite \
  --name mywebsite-endpoint \
  --content-paths "/*"
```

For CI/CD pipelines, add the purge command after the upload step to automate this.

## Wrapping Up

Hosting a static website on Azure Blob Storage with a custom SSL certificate is a cost-effective and scalable solution. The key pieces are: enable static website hosting on the storage account, put Azure CDN in front of it, map your custom domain, and configure HTTPS. Whether you use the free managed certificate or bring your own from Key Vault, the process is well-documented and reliable. The whole setup takes about an hour of active work, plus the wait time for certificate provisioning.
