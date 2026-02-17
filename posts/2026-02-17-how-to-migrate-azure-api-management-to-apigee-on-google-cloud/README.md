# How to Migrate Azure API Management to Apigee on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Apigee, API Management, Azure Migration, API Gateway, APIs

Description: A comprehensive guide to migrating your API management layer from Azure API Management to Apigee on Google Cloud with practical steps and examples.

---

If your organization is moving from Azure to Google Cloud, one of the trickier migrations is the API management layer. Azure API Management (APIM) and Apigee are both full-featured API management platforms, but they have different terminology, policy models, and deployment architectures. This guide breaks down the migration process so you can move your APIs without disrupting your consumers.

## Service Comparison

Both platforms cover the same ground - API proxying, rate limiting, authentication, developer portals, analytics - but they approach it differently.

| Feature | Azure API Management | Apigee |
|---------|---------------------|--------|
| API proxy model | API definition + policies | API proxy bundles |
| Policy language | XML-based policies | XML-based policies (different schema) |
| Developer portal | Built-in (customizable) | Integrated developer portal |
| Tiers | Consumption, Developer, Basic, Standard, Premium | Apigee X (pay-as-you-go), Apigee hybrid |
| Analytics | Built-in analytics | Advanced analytics with custom reports |
| Versioning | Built-in API versioning | API revisions and versioning |
| Products | Products and subscriptions | API products with developer apps |
| Authentication | Subscription keys, OAuth, JWT, certificates | API keys, OAuth, JWT, SAML |

Apigee's model revolves around API proxies that you deploy as bundles. Each proxy contains policies, flows, and target endpoint configurations. It is more granular than Azure APIM's approach.

## Step 1: Inventory Your Azure APIM Configuration

Start by exporting everything from Azure APIM:

```bash
# List all APIs in your APIM instance
az apim api list \
    --resource-group my-rg \
    --service-name my-apim \
    --output table

# Export API definitions (OpenAPI/Swagger)
az apim api export \
    --resource-group my-rg \
    --service-name my-apim \
    --api-id my-api \
    --export-format OpenApiJson \
    > my-api-spec.json

# List all products
az apim product list \
    --resource-group my-rg \
    --service-name my-apim \
    --output table

# List all policies
az apim api policy show \
    --resource-group my-rg \
    --service-name my-apim \
    --api-id my-api
```

Document each API's policies, products, subscriptions, and backends. This inventory drives the rest of the migration.

## Step 2: Set Up Apigee

Provision an Apigee organization in your GCP project:

```bash
# Enable the Apigee API
gcloud services enable apigee.googleapis.com

# Create an Apigee organization (for Apigee X)
gcloud apigee organizations provision \
    --project=my-project \
    --authorized-network=default \
    --runtime-location=us-central1 \
    --analytics-region=us-central1
```

For production use, Apigee X requires setting up networking with a VPC, external load balancer, and managed instance groups. The provisioning process takes about 45 minutes to complete.

## Step 3: Create API Proxies

For each API in Azure APIM, create an API proxy in Apigee. You can use the OpenAPI spec you exported.

Apigee proxies are organized as bundles with this structure. Understanding this helps with the migration:

```
apiproxy/
  my-api.xml           # Proxy configuration
  proxies/
    default.xml         # ProxyEndpoint (incoming requests)
  targets/
    default.xml         # TargetEndpoint (backend connection)
  policies/
    rate-limit.xml      # Individual policy files
    verify-api-key.xml
```

Use the Apigee CLI or API to create a proxy from your OpenAPI spec:

```bash
# Create an API proxy from an OpenAPI spec using the Apigee API
curl -X POST \
    "https://apigee.googleapis.com/v1/organizations/my-org/apis?name=my-api&action=import" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: multipart/form-data" \
    -F "file=@my-api-proxy-bundle.zip"
```

Alternatively, you can use the Apigee UI to import your OpenAPI spec and it will generate the proxy structure for you.

## Step 4: Migrate Policies

This is the most labor-intensive part. Azure APIM policies and Apigee policies use different XML schemas and different names for similar concepts.

### Rate Limiting

Azure APIM rate limiting policy:

```xml
<!-- Azure APIM rate-limit policy -->
<rate-limit calls="100" renewal-period="60" />
```

Equivalent Apigee Spike Arrest and Quota policies:

```xml
<!-- Apigee SpikeArrest policy - protects against traffic bursts -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<SpikeArrest name="SA-RateLimit">
    <Rate>100pm</Rate>
    <!-- 100 per minute, similar to Azure APIM rate-limit -->
</SpikeArrest>
```

```xml
<!-- Apigee Quota policy - for longer-term rate limiting -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Quota name="Q-DailyQuota">
    <Interval>1</Interval>
    <TimeUnit>day</TimeUnit>
    <Allow count="10000"/>
    <!-- Enforces a daily limit of 10000 calls -->
</Quota>
```

### JWT Validation

Azure APIM JWT validation:

```xml
<!-- Azure APIM validate-jwt policy -->
<validate-jwt header-name="Authorization" require-scheme="Bearer">
    <openid-config url="https://login.microsoftonline.com/tenant/.well-known/openid-configuration" />
    <required-claims>
        <claim name="aud" match="all">
            <value>api://my-api</value>
        </claim>
    </required-claims>
</validate-jwt>
```

Equivalent Apigee JWT verification:

```xml
<!-- Apigee VerifyJWT policy - validates incoming JWT tokens -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<VerifyJWT name="VJ-VerifyAccessToken">
    <Algorithm>RS256</Algorithm>
    <Source>request.header.Authorization</Source>
    <!-- JWKS URI for token verification -->
    <PublicKey>
        <JWKS uri="https://accounts.google.com/.well-known/openid-configuration"/>
    </PublicKey>
    <Audience>api://my-api</Audience>
    <IgnoreUnresolvedVariables>false</IgnoreUnresolvedVariables>
</VerifyJWT>
```

### Request/Response Transformation

Azure APIM set-header policy:

```xml
<!-- Azure APIM set-header -->
<set-header name="X-Custom-Header" exists-action="override">
    <value>custom-value</value>
</set-header>
```

Apigee AssignMessage policy:

```xml
<!-- Apigee AssignMessage policy - modifies request/response headers -->
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<AssignMessage name="AM-SetHeaders">
    <Set>
        <Headers>
            <Header name="X-Custom-Header">custom-value</Header>
        </Headers>
    </Set>
    <AssignTo createNew="false" transport="http" type="request"/>
</AssignMessage>
```

## Step 5: Migrate Products and Developer Access

Azure APIM Products map to Apigee API Products, and APIM Subscriptions map to Apigee Developer Apps.

```bash
# Create an API Product in Apigee (equivalent to Azure APIM Product)
curl -X POST \
    "https://apigee.googleapis.com/v1/organizations/my-org/apiproducts" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "standard-plan",
        "displayName": "Standard Plan",
        "description": "Standard API access plan",
        "apiResources": ["/"],
        "proxies": ["my-api"],
        "environments": ["prod"],
        "quota": "10000",
        "quotaInterval": "1",
        "quotaTimeUnit": "day",
        "attributes": [
            {"name": "access", "value": "public"}
        ]
    }'

# Create a developer (equivalent to APIM user)
curl -X POST \
    "https://apigee.googleapis.com/v1/organizations/my-org/developers" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "developer@example.com",
        "firstName": "John",
        "lastName": "Developer",
        "userName": "johndeveloper"
    }'

# Create a developer app with API key (equivalent to APIM subscription)
curl -X POST \
    "https://apigee.googleapis.com/v1/organizations/my-org/developers/developer@example.com/apps" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "johns-app",
        "apiProducts": ["standard-plan"]
    }'
```

## Step 6: Deploy and Test

Deploy your API proxy to the Apigee environment:

```bash
# Deploy the proxy revision to the prod environment
curl -X POST \
    "https://apigee.googleapis.com/v1/organizations/my-org/environments/prod/apis/my-api/revisions/1/deployments" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)"

# Test the deployed proxy
curl -X GET \
    "https://my-org-prod.apigee.net/my-api/resource" \
    -H "x-api-key: YOUR_API_KEY"
```

## Step 7: DNS Cutover

Once testing passes, update your custom domain to point to Apigee instead of Azure APIM:

```bash
# Set up a custom domain in Apigee using environment groups
curl -X POST \
    "https://apigee.googleapis.com/v1/organizations/my-org/envgroups" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "prod-group",
        "hostnames": ["api.example.com"]
    }'
```

## Migration Checklist

Before cutting over production traffic:

- All API proxies deployed and returning correct responses
- Rate limiting and quotas configured and tested
- Authentication policies verified (JWT, API keys, OAuth)
- Developer portal migrated and accessible
- API keys/credentials distributed to consumers (or mapped from old keys)
- Monitoring and alerting configured in Apigee analytics
- Custom domain configured and SSL certificates provisioned
- Error responses match the format consumers expect

## Conclusion

Migrating from Azure APIM to Apigee is primarily a policy translation exercise. The concepts are similar, but the implementation details differ. Take time on policy migration - it is where most bugs hide. Use Apigee's trace/debug tool extensively during testing to verify that requests flow through policies correctly. And plan for a parallel-run period where both gateways serve traffic, so you can validate behavior before fully committing to the switch.
