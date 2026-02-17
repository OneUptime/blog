# How to Host a Static Website Using Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Static Website, Web Hosting, Azure Storage, Cloud Hosting, Frontend

Description: A complete guide to hosting static websites on Azure Blob Storage including setup, custom domains, HTTPS, and deployment automation.

---

Not every website needs a web server. If your site is a collection of HTML, CSS, JavaScript, and images - a single-page application, a documentation site, a marketing landing page - you can host it directly from Azure Blob Storage. It is cheap, fast, and requires zero server management.

Azure Blob Storage has a built-in static website hosting feature that serves files directly from a special `$web` container. When enabled, Azure gives you a public endpoint that serves your files as a regular website, complete with index and error documents.

## Why Host Static Sites on Blob Storage?

There are several practical reasons:

- **Cost.** Blob storage is significantly cheaper than running a VM or App Service for static content. You pay only for storage and bandwidth.
- **Scalability.** Azure Storage handles massive traffic without any configuration on your part.
- **Simplicity.** No web server to patch, configure, or monitor. Upload your files and you are done.
- **Speed.** Combined with Azure CDN, your site loads quickly from edge locations worldwide.

The tradeoff is that you get no server-side processing. No PHP, no Node.js backend, no server-side rendering. If your site needs that, look at Azure App Service or Azure Static Web Apps instead.

## Enabling Static Website Hosting

### Azure Portal

1. Navigate to your storage account.
2. Under "Data management," click "Static website."
3. Toggle the status to "Enabled."
4. Set the index document name (typically `index.html`).
5. Optionally set the error document path (like `404.html`).
6. Click Save.

Azure creates a `$web` container and provides you with a primary endpoint URL like `https://mystorageaccount.z13.web.core.windows.net/`.

### Azure CLI

```bash
# Enable static website hosting on the storage account
az storage blob service-properties update \
  --account-name mystorageaccount \
  --static-website \
  --index-document index.html \
  --404-document 404.html
```

To verify the configuration and get the endpoint URL:

```bash
# Get the static website endpoint URL
az storage account show \
  --name mystorageaccount \
  --resource-group myresourcegroup \
  --query "primaryEndpoints.web" \
  --output tsv
```

### Bicep Template

```bicep
// Enable static website hosting via Bicep
// Note: Static website properties are set on the storage account itself
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: 'mystorageaccount'
  location: 'eastus'
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
}

// The $web container is created automatically when static website is enabled
// Static website must be enabled via a separate REST call or CLI command
```

Note that Bicep does not have native support for the static website property. You typically enable it via Azure CLI or a deployment script.

## Uploading Your Website Files

Once static website hosting is enabled, upload your files to the `$web` container. Azure serves files from this container as your website.

### Using Azure CLI

```bash
# Upload all files from a local build directory to the $web container
az storage blob upload-batch \
  --account-name mystorageaccount \
  --source ./build \
  --destination '$web' \
  --overwrite
```

The `--overwrite` flag replaces existing files. Without it, uploads that match existing blob names will fail.

### Setting Content Types

Azure CLI usually detects content types automatically based on file extensions, but sometimes you need to set them manually. Incorrect content types can cause browsers to download files instead of rendering them.

```bash
# Upload a file with an explicit content type
az storage blob upload \
  --account-name mystorageaccount \
  --container-name '$web' \
  --file ./build/app.js \
  --name app.js \
  --content-type "application/javascript" \
  --overwrite
```

### Using AzCopy for Larger Sites

For sites with many files, AzCopy is faster than the CLI:

```bash
# Sync a local directory to the $web container using AzCopy
azcopy sync './build' 'https://mystorageaccount.blob.core.windows.net/$web' \
  --delete-destination=true
```

The `--delete-destination=true` flag removes files from the container that no longer exist locally, keeping the deployed site clean.

## Configuring a Custom Domain

The default endpoint URL (`mystorageaccount.z13.web.core.windows.net`) works but is not professional. You can map a custom domain to your static website.

### Step 1: Create a CNAME Record

In your DNS provider, create a CNAME record pointing your domain to the Azure endpoint:

```
www.example.com  CNAME  mystorageaccount.z13.web.core.windows.net
```

### Step 2: Configure the Custom Domain in Azure

```bash
# Add a custom domain to the storage account
az storage account update \
  --name mystorageaccount \
  --resource-group myresourcegroup \
  --custom-domain www.example.com
```

There is a catch here: Azure Blob Storage custom domains do not natively support HTTPS. For HTTPS on a custom domain, you need Azure CDN in front of the storage account.

## Adding HTTPS with Azure CDN

To get HTTPS on your custom domain:

1. Create an Azure CDN profile and endpoint pointing to your static website origin.
2. Configure the custom domain on the CDN endpoint.
3. Enable HTTPS using an Azure-managed certificate or your own certificate.

```bash
# Create a CDN profile
az cdn profile create \
  --name mycdnprofile \
  --resource-group myresourcegroup \
  --sku Standard_Microsoft

# Create a CDN endpoint pointing to the static website
az cdn endpoint create \
  --name mycdnendpoint \
  --profile-name mycdnprofile \
  --resource-group myresourcegroup \
  --origin mystorageaccount.z13.web.core.windows.net \
  --origin-host-header mystorageaccount.z13.web.core.windows.net

# Add a custom domain to the CDN endpoint
az cdn custom-domain create \
  --name www-example-com \
  --endpoint-name mycdnendpoint \
  --profile-name mycdnprofile \
  --resource-group myresourcegroup \
  --hostname www.example.com

# Enable HTTPS with an Azure-managed certificate
az cdn custom-domain enable-https \
  --name www-example-com \
  --endpoint-name mycdnendpoint \
  --profile-name mycdnprofile \
  --resource-group myresourcegroup
```

Certificate provisioning takes 6-8 hours. After that, your site will be available over HTTPS on your custom domain.

## Handling Single-Page Application Routing

Single-page applications (React, Vue, Angular) use client-side routing, which means URLs like `/about` or `/dashboard` do not correspond to actual files on the server. When a user refreshes the page on one of these routes, the storage account returns a 404.

The solution is to set your error document to `index.html`. This way, any request that does not match an actual file gets served the index page, and your JavaScript router takes over.

```bash
# Set the error document to index.html for SPA routing
az storage blob service-properties update \
  --account-name mystorageaccount \
  --static-website \
  --index-document index.html \
  --404-document index.html
```

If you are using Azure CDN, you can also configure URL rewrite rules on the CDN endpoint for more control over routing.

## Automating Deployments with GitHub Actions

You do not want to manually upload files every time you make a change. Here is a GitHub Actions workflow that deploys your site automatically on every push to the main branch:

```yaml
# .github/workflows/deploy-static-site.yml
name: Deploy Static Site to Azure Blob Storage

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # Check out the repository code
      - uses: actions/checkout@v4

      # Install dependencies and build the site
      - name: Install and build
        run: |
          npm ci
          npm run build

      # Log in to Azure using service principal credentials
      - name: Azure Login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      # Upload the built files to the $web container
      - name: Deploy to Azure Blob Storage
        run: |
          az storage blob upload-batch \
            --account-name mystorageaccount \
            --source ./build \
            --destination '$web' \
            --overwrite

      # Purge the CDN cache so users get the latest version
      - name: Purge CDN
        run: |
          az cdn endpoint purge \
            --name mycdnendpoint \
            --profile-name mycdnprofile \
            --resource-group myresourcegroup \
            --content-paths "/*"
```

The CDN purge step is important. Without it, users might see cached versions of your site for hours after a deployment.

## Cache Control Headers

Setting proper cache headers improves performance and ensures users get updated content:

```bash
# Set cache control for HTML files (short cache, always revalidate)
az storage blob upload \
  --account-name mystorageaccount \
  --container-name '$web' \
  --file ./build/index.html \
  --name index.html \
  --content-cache-control "no-cache, must-revalidate" \
  --overwrite

# Set cache control for hashed assets (long cache)
az storage blob upload-batch \
  --account-name mystorageaccount \
  --source ./build/static \
  --destination '$web/static' \
  --content-cache-control "public, max-age=31536000, immutable" \
  --overwrite
```

HTML files should have short cache times so updates are picked up quickly. Hashed assets (like `app.abc123.js`) can be cached aggressively because the filename changes when the content changes.

## Limitations

There are some things static website hosting on Blob Storage cannot do:

- No server-side rendering or dynamic content
- No built-in authentication (you would need Azure CDN with Azure AD or a separate auth service)
- No custom HTTP headers beyond cache-control and content-type
- No URL rewrite rules (unless using Azure CDN)
- Limited to a single region (the CDN mitigates this)

For more advanced scenarios, consider Azure Static Web Apps, which adds API integration, authentication, and staging environments on top of static hosting.

## Wrapping Up

Hosting static websites on Azure Blob Storage is one of the simplest and most cost-effective ways to serve web content. Enable static website hosting, upload your files to the `$web` container, and optionally add a CDN for HTTPS and performance. Combined with automated deployments from your CI/CD pipeline, you get a solid hosting setup with minimal operational overhead.
