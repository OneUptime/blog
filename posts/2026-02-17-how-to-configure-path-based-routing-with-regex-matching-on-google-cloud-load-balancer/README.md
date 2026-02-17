# How to Configure Path-Based Routing with Regex Matching on Google Cloud Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, Path-Based Routing, Regex, URL Map, Google Cloud

Description: Configure Google Cloud HTTP(S) Load Balancer with regex-based path matching for advanced URL routing to different backend services.

---

Google Cloud's HTTP(S) Load Balancer supports path-based routing out of the box, but most guides only cover simple prefix matching. When you need to route based on URL patterns like API version numbers, file extensions, or dynamic path segments, regex matching gives you the flexibility to express complex routing rules.

This guide shows you how to configure regex-based path matching in your load balancer URL map, covering both the gcloud CLI approach and Terraform.

## Understanding URL Map Matching

Google Cloud URL maps support three types of path matching:

- Prefix match: Routes all paths that start with a given prefix (like `/api/`)
- Full path match: Routes only the exact path specified
- Regex match: Routes paths matching a regular expression using RE2 syntax

The load balancer evaluates rules in priority order. Higher priority rules (lower priority numbers) take precedence. This matters when regex rules might overlap with prefix rules.

## Setting Up Backend Services

Before configuring routing, create the backend services that will receive traffic.

```bash
# Create health checks for each backend
gcloud compute health-checks create http api-health-check \
  --port=8080 \
  --request-path=/health \
  --project=my-project

gcloud compute health-checks create http static-health-check \
  --port=80 \
  --request-path=/health \
  --project=my-project

# Create backend services
gcloud compute backend-services create api-v1-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=api-health-check \
  --global \
  --project=my-project

gcloud compute backend-services create api-v2-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=api-health-check \
  --global \
  --project=my-project

gcloud compute backend-services create static-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=static-health-check \
  --global \
  --project=my-project

gcloud compute backend-services create default-backend \
  --protocol=HTTP \
  --port-name=http \
  --health-checks=api-health-check \
  --global \
  --project=my-project

# Add instance groups or NEGs as backends (example with instance groups)
gcloud compute backend-services add-backend api-v1-backend \
  --instance-group=api-v1-ig \
  --instance-group-zone=us-central1-a \
  --global \
  --project=my-project
```

## Creating a URL Map with Regex Matching

The URL map defines routing rules. Here is a YAML configuration that uses regex path matching.

```yaml
# url-map-regex.yaml
# URL map with regex-based path matching for advanced routing scenarios
name: my-advanced-url-map
defaultService: projects/my-project/global/backendServices/default-backend
hostRules:
  - hosts:
      - "api.example.com"
      - "*.example.com"
    pathMatcher: api-matcher
pathMatchers:
  - name: api-matcher
    defaultService: projects/my-project/global/backendServices/default-backend
    routeRules:
      # Route API v1 requests (matches /api/v1/anything)
      - priority: 1
        matchRules:
          - regexMatch: "/api/v1/.*"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-v1-backend
              weight: 100

      # Route API v2 requests (matches /api/v2/anything)
      - priority: 2
        matchRules:
          - regexMatch: "/api/v2/.*"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-v2-backend
              weight: 100

      # Route requests for static assets (CSS, JS, images)
      - priority: 3
        matchRules:
          - regexMatch: ".*\\.(css|js|png|jpg|jpeg|gif|svg|woff2?)$"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/static-backend
              weight: 100

      # Route requests with numeric resource IDs
      # Matches paths like /users/12345 or /orders/67890
      - priority: 4
        matchRules:
          - regexMatch: "/(users|orders|products)/[0-9]+"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-v2-backend
              weight: 100

      # Route UUID-based resource paths
      # Matches paths like /resources/550e8400-e29b-41d4-a716-446655440000
      - priority: 5
        matchRules:
          - regexMatch: "/resources/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-v2-backend
              weight: 100
```

Import the URL map.

```bash
# Create or update the URL map from the YAML file
gcloud compute url-maps import my-advanced-url-map \
  --source=url-map-regex.yaml \
  --global \
  --project=my-project
```

## Adding Advanced Route Actions

Regex matching can be combined with route actions like URL rewrites, header modifications, and redirects.

```yaml
# URL map with regex matching and route actions
name: my-advanced-url-map-v2
defaultService: projects/my-project/global/backendServices/default-backend
hostRules:
  - hosts:
      - "api.example.com"
    pathMatcher: api-matcher-v2
pathMatchers:
  - name: api-matcher-v2
    defaultService: projects/my-project/global/backendServices/default-backend
    routeRules:
      # Redirect old API paths to new ones
      # /v1/users -> /api/v2/users with a 301 redirect
      - priority: 1
        matchRules:
          - regexMatch: "/v1/(.*)"
        urlRedirect:
          pathRedirectRegex: "/api/v2/\\1"
          httpsRedirect: true
          redirectResponseCode: MOVED_PERMANENTLY_DEFAULT

      # Rewrite path before sending to backend
      # Strip /public prefix: /public/files/doc.pdf -> /files/doc.pdf
      - priority: 2
        matchRules:
          - regexMatch: "/public/(.*)"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/static-backend
              weight: 100
          urlRewrite:
            pathPrefixRewrite: "/"

      # Add custom headers based on matched path
      - priority: 3
        matchRules:
          - regexMatch: "/api/v[0-9]+/admin/.*"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-v2-backend
              weight: 100
          requestHeadersToAdd:
            - headerName: X-Admin-Request
              headerValue: "true"
              replace: true

      # Route with timeout and retry policy for slow endpoints
      - priority: 4
        matchRules:
          - regexMatch: "/api/v[0-9]+/reports/.*"
        routeAction:
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-v2-backend
              weight: 100
          timeout: 60s
          retryPolicy:
            retryConditions:
              - "5xx"
              - "connect-failure"
            numRetries: 2
            perTryTimeout: 30s
```

## Terraform Configuration

For infrastructure-as-code, here is the Terraform equivalent.

```hcl
# Terraform configuration for URL map with regex path matching
resource "google_compute_url_map" "advanced_routing" {
  name            = "my-advanced-url-map"
  default_service = google_compute_backend_service.default.id
  project         = "my-project"

  host_rule {
    hosts        = ["api.example.com"]
    path_matcher = "api-matcher"
  }

  path_matcher {
    name            = "api-matcher"
    default_service = google_compute_backend_service.default.id

    # Route API v1 requests using regex
    route_rules {
      priority = 1
      match_rules {
        regex_match = "/api/v1/.*"
      }
      route_action {
        weighted_backend_services {
          backend_service = google_compute_backend_service.api_v1.id
          weight          = 100
        }
      }
    }

    # Route API v2 requests using regex
    route_rules {
      priority = 2
      match_rules {
        regex_match = "/api/v2/.*"
      }
      route_action {
        weighted_backend_services {
          backend_service = google_compute_backend_service.api_v2.id
          weight          = 100
        }
      }
    }

    # Route static assets using file extension regex
    route_rules {
      priority = 3
      match_rules {
        regex_match = ".*\\.(css|js|png|jpg|jpeg|gif|svg)$"
      }
      route_action {
        weighted_backend_services {
          backend_service = google_compute_backend_service.static.id
          weight          = 100
        }
      }
    }

    # Route with custom timeout for report generation
    route_rules {
      priority = 4
      match_rules {
        regex_match = "/api/v[0-9]+/reports/.*"
      }
      route_action {
        weighted_backend_services {
          backend_service = google_compute_backend_service.api_v2.id
          weight          = 100
        }
        timeout {
          seconds = 60
        }
        retry_policy {
          num_retries = 2
          retry_conditions = ["5xx", "connect-failure"]
          per_try_timeout {
            seconds = 30
          }
        }
      }
    }
  }
}
```

## Testing Regex Routes

Use curl to verify your routing rules work as expected.

```bash
# Get the load balancer's external IP
LB_IP=$(gcloud compute forwarding-rules describe my-lb-forwarding-rule \
  --global \
  --format='value(IPAddress)' \
  --project=my-project)

# Test API v1 routing
curl -s -o /dev/null -w "%{http_code}" -H "Host: api.example.com" "http://${LB_IP}/api/v1/users"

# Test API v2 routing
curl -s -o /dev/null -w "%{http_code}" -H "Host: api.example.com" "http://${LB_IP}/api/v2/users"

# Test static asset routing
curl -s -o /dev/null -w "%{http_code}" -H "Host: api.example.com" "http://${LB_IP}/styles/main.css"

# Test numeric resource ID routing
curl -s -o /dev/null -w "%{http_code}" -H "Host: api.example.com" "http://${LB_IP}/users/12345"
```

## RE2 Regex Syntax Notes

Google Cloud URL maps use RE2 regex syntax, not PCRE. A few differences to keep in mind:

RE2 does not support backreferences, lookahead, or lookbehind assertions. The `.*` pattern is non-greedy by default in RE2. Character classes like `\d` are not supported - use `[0-9]` instead. Named capture groups use `(?P<name>...)` syntax.

Keep your regex patterns as simple as possible. Complex regex adds latency to request routing and makes debugging harder. If a prefix match or full path match can express the same rule, prefer those over regex.

Regex path matching on Google Cloud Load Balancer gives you the flexibility to handle complex URL patterns without restructuring your application. Combined with route actions like rewrites, redirects, and header modifications, it covers most real-world routing scenarios you will encounter.
