# How to Set Up Azure CDN with Rules Engine for URL Rewrite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, CDN, Rules Engine, URL Rewrite, Content Delivery, Web Performance, Routing

Description: Configure Azure CDN rules engine to perform URL rewrites for clean URLs, API versioning, and content routing without modifying your origin server.

---

URL rewriting at the CDN level is powerful. It lets you present clean, user-friendly URLs to your visitors while your origin server uses a completely different URL structure. You can handle API versioning, redirect legacy paths, route traffic based on device type, and more - all without touching your application code.

Azure CDN with the Rules Engine gives you this capability. In this post, I will walk through setting up Azure CDN with URL rewrite rules using the Standard Microsoft tier and the Premium Verizon tier, covering the most common rewrite scenarios you will encounter.

## When to Use URL Rewrites at the CDN

URL rewrites at the CDN layer are useful in several scenarios:

- **Clean URLs**: Rewrite `/products/shoes` to `/catalog/category.html?name=shoes` on the origin
- **API versioning**: Rewrite `/api/users` to `/api/v3/users` so clients always hit the latest version
- **SPA routing**: Rewrite all paths to `/index.html` for single-page applications
- **Language routing**: Rewrite `/fr/about` to `/about?lang=fr`
- **Legacy path migration**: Silently redirect old URL structures to new ones without client-side redirects

The key distinction is that a **rewrite** changes the URL internally (the user does not see it), while a **redirect** sends the user to a new URL (the browser URL changes). Rules Engine supports both.

## Setting Up Azure CDN

Let us start by creating the CDN infrastructure.

```bash
# Create a resource group
az group create \
  --name rg-cdn \
  --location eastus

# Create a CDN profile with the Standard Microsoft tier
# This tier supports the Rules Engine
az cdn profile create \
  --resource-group rg-cdn \
  --name cdn-profile-main \
  --sku Standard_Microsoft

# Create a CDN endpoint pointing to your origin
az cdn endpoint create \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --name cdn-myapp \
  --origin myapp.azurewebsites.net \
  --origin-host-header myapp.azurewebsites.net \
  --enable-compression true
```

## Configuring URL Rewrite Rules

Azure CDN Standard Microsoft tier supports rules through delivery rules. Let us configure some common rewrite patterns.

### Rewrite Clean URLs to Origin Paths

Your users visit `/products/shoes` but your origin expects `/catalog/index.php?category=shoes`. The CDN rewrites the URL before forwarding to the origin.

```bash
# Create a rule that rewrites /products/{category} to /catalog/index.php?category={category}
az cdn endpoint rule add \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --endpoint-name cdn-myapp \
  --order 1 \
  --rule-name rewrite-products \
  --match-variable UrlPath \
  --operator BeginsWith \
  --match-values "/products/" \
  --action-name UrlRewrite \
  --source-pattern "/products/(.*)" \
  --destination "/catalog/index.php?category=$1" \
  --preserve-unmatched-path false
```

The `--source-pattern` uses regex-like capture groups, and `$1` in the destination refers to the first captured group. So `/products/shoes` gets rewritten to `/catalog/index.php?category=shoes`.

### SPA Fallback Routing

Single-page applications need all routes to serve `index.html` so the client-side router can take over. This rule rewrites any path that does not match a file extension to the root.

```bash
# Rewrite paths without file extensions to index.html for SPA routing
az cdn endpoint rule add \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --endpoint-name cdn-myapp \
  --order 2 \
  --rule-name spa-fallback \
  --match-variable UrlFileExtension \
  --operator LessThan \
  --match-values "1" \
  --action-name UrlRewrite \
  --source-pattern "/" \
  --destination "/index.html" \
  --preserve-unmatched-path false
```

This catches requests like `/dashboard`, `/settings/profile`, or `/users/123` and rewrites them all to `/index.html`. Requests for actual files like `/styles.css` or `/app.js` (which have file extensions) pass through unchanged.

### API Version Routing

Route unversioned API calls to the latest API version automatically.

```bash
# Rewrite /api/ requests to include the current API version
az cdn endpoint rule add \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --endpoint-name cdn-myapp \
  --order 3 \
  --rule-name api-version-rewrite \
  --match-variable UrlPath \
  --operator BeginsWith \
  --match-values "/api/" \
  --negate-condition false \
  --action-name UrlRewrite \
  --source-pattern "/api/((?!v[0-9]).*)" \
  --destination "/api/v3/$1" \
  --preserve-unmatched-path false
```

This rewrites `/api/users` to `/api/v3/users` but leaves `/api/v2/users` untouched (since it already has a version prefix).

### Device-Based Routing

Route mobile users to a different origin path based on the User-Agent header.

```bash
# Rewrite requests from mobile devices to the mobile-optimized path
az cdn endpoint rule add \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --endpoint-name cdn-myapp \
  --order 4 \
  --rule-name mobile-rewrite \
  --match-variable RequestHeader \
  --selector "User-Agent" \
  --operator Contains \
  --match-values "Mobile" "Android" "iPhone" \
  --action-name UrlRewrite \
  --source-pattern "/" \
  --destination "/mobile/" \
  --preserve-unmatched-path true
```

With `--preserve-unmatched-path true`, a mobile request to `/about` gets rewritten to `/mobile/about`.

## URL Redirect Rules

Sometimes you need a redirect instead of a rewrite. Redirects change the URL in the user's browser.

```bash
# Redirect old blog paths to new blog paths (301 permanent redirect)
az cdn endpoint rule add \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --endpoint-name cdn-myapp \
  --order 5 \
  --rule-name redirect-old-blog \
  --match-variable UrlPath \
  --operator BeginsWith \
  --match-values "/blog-posts/" \
  --action-name UrlRedirect \
  --redirect-type Moved \
  --redirect-protocol Https \
  --custom-path "/blog/{url_path.1}"
```

The `--redirect-type Moved` sends a 301 status code. Options include:
- `Moved` (301) - Permanent redirect
- `Found` (302) - Temporary redirect
- `TemporaryRedirect` (307) - Temporary, preserves HTTP method
- `PermanentRedirect` (308) - Permanent, preserves HTTP method

## Combining Multiple Conditions

Rules can have multiple match conditions for more precise targeting.

```bash
# Rewrite only HTTPS GET requests to /search with a query parameter
az cdn endpoint rule add \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --endpoint-name cdn-myapp \
  --order 6 \
  --rule-name rewrite-search \
  --match-variable UrlPath \
  --operator Equal \
  --match-values "/search" \
  --action-name UrlRewrite \
  --source-pattern "/search" \
  --destination "/search/results.html" \
  --preserve-unmatched-path false
```

## Using Azure Front Door Rules Engine

If you are using Azure Front Door (which includes CDN capabilities), the rules engine is more powerful and supports additional match conditions and actions.

```bash
# Create a rule set in Azure Front Door
az afd rule-set create \
  --resource-group rg-cdn \
  --profile-name fd-profile \
  --rule-set-name rewrite-rules

# Add a URL rewrite rule in Front Door
az afd rule create \
  --resource-group rg-cdn \
  --profile-name fd-profile \
  --rule-set-name rewrite-rules \
  --rule-name rewrite-api \
  --order 1 \
  --match-variable RequestPath \
  --operator BeginsWith \
  --match-values "/api/" \
  --action-name RouteConfigurationOverride \
  --source-pattern "/api/" \
  --destination "/backend/api/" \
  --preserve-unmatched-path true
```

## Debugging URL Rewrites

When rewrites are not working as expected, debugging can be frustrating because the rewrite happens transparently. Here are some approaches:

**Check the origin access logs**: Your origin server logs the rewritten URL, not the original URL. Compare what the origin receives with what you expect.

**Use curl with verbose output**: Send requests through the CDN and check the response headers for clues.

```bash
# Check response headers from the CDN endpoint
curl -v -H "Host: cdn-myapp.azureedge.net" \
  https://cdn-myapp.azureedge.net/products/shoes 2>&1 | grep -i "x-cache\|location"
```

**Verify rule order**: Rules are evaluated in the order specified by the `--order` parameter. If a lower-order rule matches first, subsequent rules might not execute. Check that your rules are ordered from most specific to least specific.

**Purge the CDN cache**: Cached responses use the rewritten URL as the cache key. After changing rules, purge the cache to see the new behavior.

```bash
# Purge the CDN cache for a specific path
az cdn endpoint purge \
  --resource-group rg-cdn \
  --profile-name cdn-profile-main \
  --name cdn-myapp \
  --content-paths "/products/*" "/api/*"
```

## Performance Considerations

URL rewrites at the CDN edge add negligible latency - they are string operations that happen in microseconds. However, be aware of these interactions:

**Cache key impact**: The cache key is based on the original URL (pre-rewrite) by default. This means different original URLs that rewrite to the same origin path will be cached separately, which is usually what you want.

**Query string handling**: If your rewrite adds query strings, make sure your CDN caching rules account for query string variations.

**Compression**: URL rewrites do not affect compression. The CDN compresses based on the response content type, not the URL.

URL rewriting at the CDN level is one of those capabilities that is easy to overlook but incredibly useful once you start using it. It keeps your origin server clean, gives you routing flexibility, and lets you change URL structures without touching application code. Start with simple rules and build up complexity as needed.
