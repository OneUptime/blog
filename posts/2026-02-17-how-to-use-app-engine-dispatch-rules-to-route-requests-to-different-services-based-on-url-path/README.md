# How to Use App Engine Dispatch Rules to Route Requests to Different Services Based on URL Path

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Dispatch Rules, Routing, Microservices

Description: Learn how to configure App Engine dispatch rules in dispatch.yaml to route incoming requests to different services based on URL patterns.

---

When you run multiple services on App Engine, every request initially hits the default service. Without dispatch rules, requests to `yourapp.appspot.com/api/users` and `yourapp.appspot.com/admin/dashboard` both go to the same service. Dispatch rules let you change that behavior by routing requests to different services based on URL path patterns.

This is a fundamental building block for microservices on App Engine. Instead of building one giant monolith that handles everything, you split your application into focused services and use dispatch rules to send traffic where it needs to go.

## How Dispatch Rules Work

Dispatch rules are defined in a `dispatch.yaml` file that lives at the root of your project. When a request comes in, App Engine checks the URL against each rule in order. The first matching rule determines which service handles the request. If no rule matches, the request goes to the default service.

Dispatch rules only affect requests that come through your application's external URL (the `*.appspot.com` domain or a custom domain). They do not affect direct service-to-service calls using the internal service URL format.

## Basic dispatch.yaml Configuration

Here is a typical dispatch.yaml for an application with three services:

```yaml
# dispatch.yaml - Route requests to the appropriate service
dispatch:
  # API requests go to the api service
  - url: "*/api/*"
    service: api

  # Admin panel requests go to the admin service
  - url: "*/admin/*"
    service: admin

  # Static asset requests go to a dedicated static service
  - url: "*/static/*"
    service: static-assets

  # Everything else falls through to the default service
```

The `*` at the beginning of the URL pattern matches any hostname. This is important if you have multiple custom domains pointing to your App Engine application.

## URL Pattern Syntax

Dispatch rules use a simple pattern matching syntax. It is not full regular expressions - it is more limited but easier to reason about:

- `*` matches any string of characters
- Patterns must start with `*/` or a specific hostname
- The path portion (after the hostname) must not contain `*` except at the end

Here are valid patterns:

```yaml
dispatch:
  # Match any host, specific path prefix
  - url: "*/api/*"
    service: api

  # Match specific hostname
  - url: "api.example.com/*"
    service: api

  # Match exact path prefix with wildcard suffix
  - url: "*/v2/api/*"
    service: api-v2

  # Match a specific subdomain pattern
  - url: "admin.example.com/*"
    service: admin
```

And here are patterns that will not work:

```yaml
# INVALID - Cannot have wildcard in the middle of the path
# - url: "*/api/*/users"

# INVALID - Cannot use regex
# - url: "*/api/v[0-9]/*"
```

The pattern matching is intentionally simple. If you need more complex routing logic, you should handle it within your application code or use a Cloud Load Balancer with URL maps.

## Order Matters

Dispatch rules are evaluated in order, and the first match wins. This means you need to put more specific rules before general ones:

```yaml
# dispatch.yaml - Order rules from most specific to least specific
dispatch:
  # This specific path should go to a special handler
  - url: "*/api/webhooks/*"
    service: webhook-processor

  # General API traffic - this comes AFTER the webhook rule
  - url: "*/api/*"
    service: api

  # Everything else goes to default (implicit)
```

If you reversed the order and put `*/api/*` first, webhook requests would match that rule and never reach the `webhook-processor` service.

## Hostname-Based Routing

Besides path-based routing, you can route based on the hostname. This works great when you have different subdomains for different parts of your application:

```yaml
# dispatch.yaml - Route based on hostname
dispatch:
  # API subdomain goes to the api service
  - url: "api.yourapp.com/*"
    service: api

  # Admin subdomain goes to the admin service
  - url: "admin.yourapp.com/*"
    service: admin

  # Docs subdomain goes to the docs service
  - url: "docs.yourapp.com/*"
    service: documentation

  # Main domain goes to default (implicit)
```

You can combine hostname and path-based routing in the same file:

```yaml
dispatch:
  # Specific path on a specific host
  - url: "api.yourapp.com/v2/*"
    service: api-v2

  # All other paths on the api host
  - url: "api.yourapp.com/*"
    service: api

  # Path-based routing for the main domain
  - url: "*/admin/*"
    service: admin
```

## Deploying Dispatch Rules

Deploy dispatch rules separately from your services:

```bash
# Deploy dispatch rules
gcloud app deploy dispatch.yaml --project=your-project-id
```

Dispatch rules are applied immediately after deployment. There is no downtime or gradual rollout - the new rules take effect right away. Keep this in mind if you are making significant routing changes.

You can verify the current dispatch rules:

```bash
# List current dispatch rules via the API
gcloud app describe --project=your-project-id
```

## Practical Example: API Versioning

Dispatch rules are excellent for API versioning. You can run different versions of your API as separate services and route based on the URL prefix:

```yaml
# dispatch.yaml - API version routing
dispatch:
  - url: "*/api/v3/*"
    service: api-v3

  - url: "*/api/v2/*"
    service: api-v2

  - url: "*/api/v1/*"
    service: api-v1

  # Default API version for unversioned requests
  - url: "*/api/*"
    service: api-v3
```

Each API version service has its own `app.yaml`, codebase, and scaling configuration. You can maintain and deploy them independently. When you deprecate a version, just remove its dispatch rule and delete the service.

## Practical Example: Separating Frontend and Backend

A common pattern is to have a frontend service serving your SPA (Single Page Application) and a backend API service:

```yaml
# dispatch.yaml - Frontend/Backend separation
dispatch:
  # All API calls go to the backend
  - url: "*/api/*"
    service: backend

  # WebSocket connections go to the real-time service
  - url: "*/ws/*"
    service: realtime

  # Health check endpoint goes to the backend
  - url: "*/health"
    service: backend

  # Everything else is served by the frontend
```

The frontend service serves your static HTML, CSS, and JavaScript. The backend service handles data operations. This separation lets you scale them independently and use different runtimes - maybe your frontend is a simple Node.js service while your backend runs Python.

## Limits and Restrictions

There are a few limits to be aware of:

- Maximum of 20 dispatch rules per application
- URL patterns cannot exceed 100 characters
- You cannot use dispatch rules to route to services in different projects
- Dispatch rules do not apply to requests made using the service-specific URL (e.g., `api-dot-project.appspot.com`)

The 20-rule limit usually is not a problem, but if you are hitting it, consolidate related routes. For example, instead of having separate rules for `/api/users/*`, `/api/orders/*`, and `/api/products/*`, use a single `/api/*` rule.

## Testing Dispatch Rules

Before deploying, you can test your routing logic locally. The local development server supports dispatch rules:

```bash
# Run the development server with dispatch rules
dev_appserver.py dispatch.yaml frontend/app.yaml api/app.yaml
```

For production testing, deploy your dispatch rules and verify by hitting different URL paths:

```bash
# Test that API requests reach the api service
curl -v https://your-project.appspot.com/api/health

# Check the response headers - they include which service handled the request
# Look for the X-AppEngine-Service header
```

## Removing Dispatch Rules

If you need to remove all dispatch rules and send everything to the default service:

```yaml
# dispatch.yaml - Empty dispatch (routes everything to default)
dispatch: []
```

Deploy this to clear all routing rules. You cannot delete the `dispatch.yaml` - you have to deploy it with an empty dispatch list.

## Summary

Dispatch rules are the glue that holds a multi-service App Engine application together. They let you present a unified URL structure to your users while routing requests to specialized services behind the scenes. The syntax is simple, the deployment is instant, and combined with independent service scaling, dispatch rules give you a clean microservices architecture without needing a separate API gateway or reverse proxy.
