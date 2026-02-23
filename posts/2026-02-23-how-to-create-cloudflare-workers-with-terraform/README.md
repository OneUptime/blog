# How to Create Cloudflare Workers with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloudflare Workers, Edge Computing, Serverless, Infrastructure as Code

Description: Learn how to create and deploy Cloudflare Workers with Terraform for edge computing, request routing, A/B testing, header manipulation, and serverless API endpoints.

---

Cloudflare Workers allow you to run JavaScript, TypeScript, or WebAssembly code at Cloudflare's edge locations worldwide. They execute before requests reach your origin server, enabling use cases like request routing, A/B testing, header manipulation, and building serverless APIs. Managing Workers with Terraform brings the same infrastructure-as-code benefits to your edge computing layer.

In this guide, we will create Cloudflare Workers with Terraform for several practical use cases including request routing, response modification, and simple API endpoints.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "account_id" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## Basic Worker Script

```hcl
# basic-worker.tf - Simple hello world worker
resource "cloudflare_worker_script" "hello" {
  account_id = var.account_id
  name       = "hello-worker"
  content    = <<-JS
    addEventListener('fetch', event => {
      event.respondWith(handleRequest(event.request));
    });

    async function handleRequest(request) {
      return new Response(JSON.stringify({
        message: 'Hello from Cloudflare Workers!',
        timestamp: new Date().toISOString(),
        url: request.url,
        method: request.method,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  JS
}

# Route the worker to a URL pattern
resource "cloudflare_worker_route" "hello" {
  zone_id     = var.zone_id
  pattern     = "${var.domain}/hello/*"
  script_name = cloudflare_worker_script.hello.name
}
```

## Request Router Worker

```hcl
# router-worker.tf - Route requests based on path
resource "cloudflare_worker_script" "router" {
  account_id = var.account_id
  name       = "request-router"
  content    = <<-JS
    // Route configuration
    const routes = {
      '/api/v1': 'https://api-v1.origin.example.com',
      '/api/v2': 'https://api-v2.origin.example.com',
      '/legacy': 'https://legacy.origin.example.com',
    };

    addEventListener('fetch', event => {
      event.respondWith(handleRequest(event.request));
    });

    async function handleRequest(request) {
      const url = new URL(request.url);

      // Find matching route
      for (const [prefix, origin] of Object.entries(routes)) {
        if (url.pathname.startsWith(prefix)) {
          const newUrl = origin + url.pathname + url.search;
          return fetch(newUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body,
          });
        }
      }

      // Default: pass through to origin
      return fetch(request);
    }
  JS
}

resource "cloudflare_worker_route" "router" {
  zone_id     = var.zone_id
  pattern     = "${var.domain}/api/*"
  script_name = cloudflare_worker_script.router.name
}
```

## Security Headers Worker

```hcl
# headers-worker.tf - Add security headers to responses
resource "cloudflare_worker_script" "security_headers" {
  account_id = var.account_id
  name       = "security-headers"
  content    = <<-JS
    const SECURITY_HEADERS = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };

    addEventListener('fetch', event => {
      event.respondWith(addSecurityHeaders(event.request));
    });

    async function addSecurityHeaders(request) {
      // Fetch the original response
      const response = await fetch(request);

      // Clone the response and add security headers
      const newResponse = new Response(response.body, response);

      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        newResponse.headers.set(key, value);
      });

      // Remove potentially dangerous headers
      newResponse.headers.delete('Server');
      newResponse.headers.delete('X-Powered-By');

      return newResponse;
    }
  JS
}

resource "cloudflare_worker_route" "security_headers" {
  zone_id     = var.zone_id
  pattern     = "${var.domain}/*"
  script_name = cloudflare_worker_script.security_headers.name
}
```

## A/B Testing Worker

```hcl
# ab-testing.tf - A/B testing at the edge
resource "cloudflare_worker_script" "ab_test" {
  account_id = var.account_id
  name       = "ab-testing"
  content    = <<-JS
    const EXPERIMENT_COOKIE = 'ab_variant';

    addEventListener('fetch', event => {
      event.respondWith(handleRequest(event.request));
    });

    async function handleRequest(request) {
      const url = new URL(request.url);

      // Check for existing variant assignment
      const cookie = request.headers.get('Cookie') || '';
      let variant = getCookieValue(cookie, EXPERIMENT_COOKIE);

      // Assign variant if not set
      if (!variant) {
        variant = Math.random() < 0.5 ? 'A' : 'B';
      }

      // Modify request based on variant
      if (variant === 'B' && url.pathname === '/') {
        url.pathname = '/landing-v2';
      }

      // Fetch the appropriate page
      const response = await fetch(url.toString(), request);
      const newResponse = new Response(response.body, response);

      // Set the variant cookie
      newResponse.headers.append('Set-Cookie',
        EXPERIMENT_COOKIE + '=' + variant + '; Path=/; Max-Age=86400');
      newResponse.headers.set('X-AB-Variant', variant);

      return newResponse;
    }

    function getCookieValue(cookieString, name) {
      const match = cookieString.match(new RegExp(name + '=([^;]+)'));
      return match ? match[1] : null;
    }
  JS
}
```

## Worker with KV Store Bindings

```hcl
# kv-worker.tf - Worker with KV store for configuration
resource "cloudflare_workers_kv_namespace" "config" {
  account_id = var.account_id
  title      = "worker-config"
}

resource "cloudflare_workers_kv" "feature_flags" {
  account_id   = var.account_id
  namespace_id = cloudflare_workers_kv_namespace.config.id
  key          = "feature-flags"
  value = jsonencode({
    new_ui       = true
    beta_api     = false
    dark_mode    = true
  })
}

resource "cloudflare_worker_script" "with_kv" {
  account_id = var.account_id
  name       = "kv-worker"
  content    = <<-JS
    addEventListener('fetch', event => {
      event.respondWith(handleRequest(event.request));
    });

    async function handleRequest(request) {
      // Read feature flags from KV store
      const flags = JSON.parse(await CONFIG.get('feature-flags') || '{}');

      return new Response(JSON.stringify({
        features: flags,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  JS

  kv_namespace_binding {
    name         = "CONFIG"
    namespace_id = cloudflare_workers_kv_namespace.config.id
  }
}
```

## Outputs

```hcl
output "worker_names" {
  value = {
    hello    = cloudflare_worker_script.hello.name
    router   = cloudflare_worker_script.router.name
    security = cloudflare_worker_script.security_headers.name
  }
}
```

## Conclusion

Cloudflare Workers managed through Terraform bring edge computing into your infrastructure-as-code workflow. From request routing to security headers to A/B testing, Workers let you customize behavior at the edge without touching your origin servers. Combined with [Cloudflare DNS](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-dns-records-with-terraform/view) and [access policies](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-access-policies-with-terraform/view), you can build a complete edge infrastructure managed entirely through Terraform.
