# How to Configure URL Maps for Path-Based Routing on a GCP Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, URL Maps, Routing, Google Cloud

Description: Learn how to configure URL maps for path-based and host-based routing on GCP load balancers to direct traffic to different backend services based on request URLs.

---

One of the most powerful features of GCP's HTTP(S) load balancers is URL maps. Instead of sending all traffic to a single backend, you can route requests based on the URL path, the hostname, or both. This lets you run a single load balancer in front of multiple services - your API on `/api`, your frontend on `/`, and your admin panel on `/admin`, all served by different backend services.

This post covers everything from basic path-based routing to advanced configurations with header-based routing and traffic splitting.

## What Is a URL Map?

A URL map is a GCP resource that defines routing rules for an HTTP(S) load balancer. When a request comes in, the load balancer evaluates the URL map rules in order and routes the request to the matching backend service.

URL maps support three levels of routing:

1. **Host rules** - Match based on the hostname (e.g., `api.example.com` vs `www.example.com`)
2. **Path matchers** - Match based on the URL path (e.g., `/api/*` vs `/static/*`)
3. **Route rules** - Advanced matching with headers, query parameters, and more

## Basic Path-Based Routing

Let's start with the most common use case: routing different URL paths to different backend services. Suppose you have three services - a web frontend, an API, and a static content service.

First, create the backend services (assuming you already have instance groups and health checks):

```bash
# Create backend services for each of the three services
gcloud compute backend-services create web-frontend \
    --protocol=HTTP --health-checks=http-check --global

gcloud compute backend-services create api-backend \
    --protocol=HTTP --health-checks=http-check --global

gcloud compute backend-services create static-backend \
    --protocol=HTTP --health-checks=http-check --global
```

Now create the URL map with path rules:

```bash
# Create the URL map with path-based routing rules
gcloud compute url-maps create my-url-map \
    --default-service=web-frontend \
    --global

# Add a path matcher with rules for API and static paths
gcloud compute url-maps add-path-matcher my-url-map \
    --path-matcher-name=my-paths \
    --default-service=web-frontend \
    --path-rules="/api/*=api-backend,/static/*=static-backend" \
    --global
```

With this configuration:
- Requests to `/api/users`, `/api/orders`, etc. go to `api-backend`
- Requests to `/static/images/logo.png`, `/static/css/style.css`, etc. go to `static-backend`
- Everything else goes to `web-frontend`

## Host-Based Routing

You can also route based on the hostname in the request. This is useful when you want multiple domains behind a single load balancer.

```bash
# Import a URL map with host-based routing
gcloud compute url-maps import multi-host-map \
    --global \
    --source=/dev/stdin <<'EOF'
name: multi-host-map
defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
hostRules:
- hosts:
  - 'api.example.com'
  pathMatcher: api-matcher
- hosts:
  - 'admin.example.com'
  pathMatcher: admin-matcher
- hosts:
  - 'www.example.com'
  - 'example.com'
  pathMatcher: web-matcher
pathMatchers:
- name: api-matcher
  defaultService: projects/MY_PROJECT/global/backendServices/api-backend
- name: admin-matcher
  defaultService: projects/MY_PROJECT/global/backendServices/admin-backend
- name: web-matcher
  defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
EOF
```

This sends requests for `api.example.com` to one backend, `admin.example.com` to another, and `www.example.com` to a third.

## Combining Host and Path Routing

You can combine both - first match on the host, then within each host, match on the path:

```bash
# Import a URL map combining host and path routing
gcloud compute url-maps import combined-map \
    --global \
    --source=/dev/stdin <<'EOF'
name: combined-map
defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
hostRules:
- hosts:
  - 'api.example.com'
  pathMatcher: api-paths
pathMatchers:
- name: api-paths
  defaultService: projects/MY_PROJECT/global/backendServices/api-v1
  pathRules:
  - paths:
    - '/v2/*'
    service: projects/MY_PROJECT/global/backendServices/api-v2
  - paths:
    - '/v3/*'
    service: projects/MY_PROJECT/global/backendServices/api-v3
EOF
```

Now `api.example.com/v2/users` goes to the v2 API backend, `api.example.com/v3/users` goes to v3, and anything else on `api.example.com` defaults to v1.

## Advanced Route Rules

Route rules give you more fine-grained control. You can match on prefixes, exact paths, or regex patterns, and you can also match on headers and query parameters.

```bash
# Import a URL map with advanced route rules
gcloud compute url-maps import advanced-map \
    --global \
    --source=/dev/stdin <<'EOF'
name: advanced-map
defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
hostRules:
- hosts:
  - '*'
  pathMatcher: advanced-routes
pathMatchers:
- name: advanced-routes
  defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
  routeRules:
  - priority: 1
    matchRules:
    - prefixMatch: /api/
      headerMatches:
      - headerName: X-API-Version
        exactMatch: beta
    service: projects/MY_PROJECT/global/backendServices/api-beta
  - priority: 2
    matchRules:
    - prefixMatch: /api/
    service: projects/MY_PROJECT/global/backendServices/api-stable
  - priority: 3
    matchRules:
    - pathTemplateMatch: /users/{id}/profile
    service: projects/MY_PROJECT/global/backendServices/user-profiles
EOF
```

This configuration does three things:
- Requests to `/api/*` with the header `X-API-Version: beta` go to the beta API
- Other requests to `/api/*` go to the stable API
- Requests matching `/users/{id}/profile` go to the user profiles service

## Traffic Splitting for Canary Deployments

URL maps support weighted traffic splitting, which is perfect for gradual rollouts:

```bash
# Import a URL map with traffic splitting between services
gcloud compute url-maps import canary-map \
    --global \
    --source=/dev/stdin <<'EOF'
name: canary-map
defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
hostRules:
- hosts:
  - '*'
  pathMatcher: canary-routes
pathMatchers:
- name: canary-routes
  defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
  routeRules:
  - priority: 1
    matchRules:
    - prefixMatch: /
    routeAction:
      weightedBackendServices:
      - backendService: projects/MY_PROJECT/global/backendServices/web-v1
        weight: 90
      - backendService: projects/MY_PROJECT/global/backendServices/web-v2
        weight: 10
EOF
```

This sends 90% of traffic to v1 and 10% to v2. Adjust the weights as you gain confidence in the new version.

## URL Rewrites and Redirects

URL maps can also rewrite paths before forwarding to backends:

```bash
# Import a URL map with path rewriting
gcloud compute url-maps import rewrite-map \
    --global \
    --source=/dev/stdin <<'EOF'
name: rewrite-map
defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
hostRules:
- hosts:
  - '*'
  pathMatcher: rewrite-routes
pathMatchers:
- name: rewrite-routes
  defaultService: projects/MY_PROJECT/global/backendServices/web-frontend
  routeRules:
  - priority: 1
    matchRules:
    - prefixMatch: /new-api/
    routeAction:
      urlRewrite:
        pathPrefixRewrite: /api/v2/
      weightedBackendServices:
      - backendService: projects/MY_PROJECT/global/backendServices/api-v2
        weight: 100
  - priority: 2
    matchRules:
    - prefixMatch: /old-page
    urlRedirect:
      pathRedirect: /new-page
      redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF
```

## Viewing and Debugging URL Maps

To see the current configuration of a URL map:

```bash
# Export the URL map configuration to YAML
gcloud compute url-maps describe my-url-map --global
```

To validate that your URL map routes correctly, you can use the `url-maps validate` command:

```bash
# Validate the URL map configuration
gcloud compute url-maps validate --source=my-url-map.yaml
```

## Common Pitfalls

**Path matching is prefix-based by default**: `/api` matches `/api`, `/api/`, `/api/users`, and even `/apiary`. Use `/api/*` or `/api/` to be more specific, or use `fullPathMatch` in route rules for exact matching.

**Priority matters in route rules**: Lower numbers have higher priority. If you have overlapping rules, the one with the lowest priority number wins.

**Forgetting the default service**: Every path matcher needs a default service. If a request does not match any path rule, it goes to the default. If you do not want unmatched traffic to go anywhere, consider creating a backend that returns 404.

**Wildcard hosts**: Use `*` to match any hostname. This is useful as a catch-all but be careful not to accidentally route traffic to the wrong backend.

## Wrapping Up

URL maps are one of the most flexible parts of GCP load balancing. They let you consolidate multiple services behind a single load balancer, implement canary deployments with traffic splitting, and handle complex routing scenarios with header-based and path-based rules. Start simple with basic path rules and add complexity as your routing needs grow.
