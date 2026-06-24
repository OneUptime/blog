# How to Set Up the Apigee Integrated Developer Portal for External API Consumers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apigee, GCP, Developer Portal, API Documentation, API Management

Description: Step-by-step guide to setting up and customizing the Apigee integrated developer portal so external API consumers can discover, test, and subscribe to your APIs.

---

An API without documentation is an API nobody uses. The Apigee integrated developer portal gives your external API consumers a self-service experience where they can browse your API catalog, read documentation, register apps, get API keys, and test endpoints. Setting it up properly is the difference between an API that developers adopt enthusiastically and one they abandon after ten minutes of confusion.

## Creating the Developer Portal

The Apigee integrated portal is built into the Apigee experience on GCP. You create it through the Apigee Console.

Through the Console, navigate to Distribution > Portals and click "Create." Give it a name and description. The portal's site ID is generated from the organization and portal name, such as `YOUR_ORG-developerportal` for a portal named `Developer Portal`.

## Adding API Documentation

The portal renders OpenAPI (Swagger) specifications as interactive documentation. Developers can see every endpoint, parameter, request body, and response schema.

### Creating an OpenAPI Spec

Write a comprehensive OpenAPI specification for your API:

```yaml
# openapi-spec.yaml
openapi: "3.0.0"
info:
  title: Acme Data API
  version: "2.0"
  description: |
    The Acme Data API provides access to our dataset of business records,
    analytics, and reporting endpoints.

    ## Getting Started

    1. Create a developer account on this portal
    2. Register a new application
    3. Subscribe to an API product (Free or Premium)
    4. Use your API key in the `x-api-key` header

    ## Authentication

    All API calls require an API key. Include it in the request header:

    ```
    x-api-key: YOUR_API_KEY
    ```yaml

    ## Rate Limits

    | Plan    | Requests/Day | Requests/Second |
    |---------|-------------|-----------------|
    | Free    | 1,000       | 5               |
    | Premium | 100,000     | 50              |

  contact:
    name: API Support
    email: api-support@acme.com
    url: https://acme.com/support
  termsOfService: https://acme.com/terms

servers:
  - url: https://api.acme.com/v2
    description: Production
  - url: https://api-sandbox.acme.com/v2
    description: Sandbox

security:
  - apiKey: []

components:
  securitySchemes:
    apiKey:
      type: apiKey
      in: header
      name: x-api-key

  schemas:
    Company:
      type: object
      properties:
        id:
          type: string
          example: "comp_12345"
        name:
          type: string
          example: "Acme Corporation"
        industry:
          type: string
          example: "Technology"
        employeeCount:
          type: integer
          example: 5000
        founded:
          type: string
          format: date
          example: "2010-03-15"
        website:
          type: string
          format: uri
          example: "https://acme.com"

    Error:
      type: object
      properties:
        code:
          type: integer
        message:
          type: string
        details:
          type: string

paths:
  /companies:
    get:
      summary: List companies
      description: Returns a paginated list of companies matching the filter criteria
      operationId: listCompanies
      tags:
        - Companies
      parameters:
        - name: industry
          in: query
          schema:
            type: string
          description: Filter by industry
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
          description: Number of results per page
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
          description: Pagination offset
      responses:
        "200":
          description: List of companies
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Company"
                  total:
                    type: integer
                  limit:
                    type: integer
                  offset:
                    type: integer
        "401":
          description: Invalid or missing API key
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "429":
          description: Rate limit exceeded
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"

  /companies/{id}:
    get:
      summary: Get company details
      description: Returns detailed information about a specific company
      operationId: getCompany
      tags:
        - Companies
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Company details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Company"
        "404":
          description: Company not found
```

### Publishing the Spec to the Portal

Upload your OpenAPI spec and link it to an API product:

```bash
# Create an API doc entry linked to your product
curl -X POST \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/sites/SITE_ID/apidocs" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Acme Data API v2",
    "description": "Complete reference documentation for the Acme Data API",
    "anonAllowed": true,
    "published": true,
    "apiProductName": "acme-data-api-free",
    "requireCallbackUrl": false
  }'
```

Then upload the spec content:

```bash
# Upload the OpenAPI spec content
curl -X PATCH \
  "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/sites/SITE_ID/apidocs/API_DOC/documentation" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "oasDocumentation": {
      "spec": {
        "displayName": "openapi-spec.yaml",
        "contents": "'"$(base64 -w0 openapi-spec.yaml)"'"
      }
    }
  }'
```

## Customizing Portal Appearance

The integrated portal supports customization for branding. You can set colors, logos, and custom pages.

### Theme Configuration

Configure the portal theme in the Console by opening Distribution > Portals, selecting your portal, and using the theme editor. You can customize:

- Logo and favicon
- Primary and secondary colors
- Navigation menu items
- Footer content
- Custom SCSS

To configure Google Analytics or custom analytics tracking, open your portal settings and use the Custom Scripts tab.

## Adding Custom Pages

Beyond API documentation, you might want pages for getting started guides, tutorials, and FAQs.

Create a custom page by opening your portal, clicking Pages, and clicking "+Page." Enter the page name and path, then edit the page content using Markdown and HTML in the page editor.

## Configuring Developer Registration

Control how developers register on your portal. You can allow self-registration or require manual approval.

### Self-Registration Flow

In the Apigee Console, go to your portal settings and configure:

1. **Built-in identity provider**: Let portal users create accounts with email and password
2. **Email configuration**: Configure the confirmation email and SMTP settings before launch
3. **Account activation**: Automatically activate new accounts or require manual activation
4. **Terms of Service**: Link to your ToS (registration requires acceptance)

### Custom Registration Fields

You can add up to three custom fields to the registration form to collect additional information. Open your portal, click Accounts, open the Authentication tab, click Edit in the Account creation and sign-in section, then add the custom field labels and mark any required fields.

## Enabling the API Playground

The portal includes a built-in API testing tool (sometimes called a "playground" or "try it" feature). Developers can make real API calls directly from the documentation page.

To enable this, make sure:

1. Your OpenAPI document defines the supported authentication method
2. CORS is configured on your API proxy to allow requests from the portal domain
3. The OpenAPI spec includes server URLs that developers can reach

Add CORS support to your API proxy:

```xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!-- apiproxy/policies/CORSPolicy.xml -->
<CORS continueOnError="false" enabled="true" name="add-cors">
    <DisplayName>Add CORS</DisplayName>
    <AllowOrigins>{request.header.origin}</AllowOrigins>
    <AllowMethods>GET, PUT, POST, DELETE</AllowMethods>
    <AllowHeaders>origin, x-requested-with, accept, content-type, authorization, x-api-key</AllowHeaders>
    <ExposeHeaders>*</ExposeHeaders>
    <MaxAge>3628800</MaxAge>
    <AllowCredentials>false</AllowCredentials>
    <GeneratePreflightResponse>true</GeneratePreflightResponse>
    <IgnoreUnresolvedVariables>true</IgnoreUnresolvedVariables>
</CORS>
```

If your proxy validates API keys in the ProxyEndpoint PreFlow, add a condition so the Verify API Key policy is skipped for `OPTIONS` preflight requests.

## Setting Up Custom Domain

By default, the portal is accessible at an Apigee-provided URL. For production use, configure a custom domain.

Steps:
1. Register your domain (e.g., `developers.acme.com`)
2. Create a TLS certificate for the custom domain
3. Determine the default hostname for your portal
4. Create an Internet network endpoint group (NEG) for the portal hostname
5. Create a global external Application Load Balancer that points to the Internet NEG
6. In the Apigee Console, open Distribution > Portals > your portal > Settings > Domains and enable the custom domain
7. Create an A record pointing to the load balancer IP address

```bash
# Verify DNS is configured correctly
dig developers.acme.com A

# The A record should point to the load balancer IP address
```

## Monitoring Portal Usage

Track how developers interact with your portal:

```bash
# List registered developers
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/developers" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"

# List apps for a developer
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/developers/developer@example.com/apps" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"

# Check API traffic analytics
curl "https://apigee.googleapis.com/v1/organizations/YOUR_ORG/environments/prod/stats/developer_app?select=sum(message_count)&timeRange=02/01/2026+00:00~02/17/2026+23:59" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Summary

The Apigee integrated developer portal transforms your APIs from internal tools into products that external developers can discover and adopt. Start by creating the portal and uploading well-written OpenAPI specs. Customize the branding, add getting-started guides, and enable the API playground for interactive testing. Configure self-registration so developers can onboard without waiting for manual approval. Finally, set up a custom domain for a professional appearance. A good developer portal reduces support burden and increases API adoption - developers who can self-serve are developers who stick around.
