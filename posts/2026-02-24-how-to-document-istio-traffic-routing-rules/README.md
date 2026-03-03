# How to Document Istio Traffic Routing Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Routing, Documentation, VirtualService, Kubernetes

Description: Build clear and maintainable documentation for your Istio traffic routing rules so your team can understand and troubleshoot routing decisions.

---

Istio traffic routing rules can get complicated fast. Once you have dozens of VirtualServices with path-based routing, header-based matching, traffic splitting for canary deployments, and fault injection for testing, nobody on the team can keep the full picture in their head. Good documentation of your routing rules makes troubleshooting faster, onboarding smoother, and auditing possible.

## What to Document

Not every detail in a VirtualService needs documentation. Focus on the decisions and the "why" behind them:

- Why does this route exist?
- What traffic does it match?
- Where does the traffic go?
- What policies apply (timeouts, retries, fault injection)?
- When was this rule added and by whom?
- Are there any known issues or gotchas?

The YAML itself tells you the "what." Documentation should tell you the "why."

## Annotation-Based Documentation

The simplest approach is to use Kubernetes annotations directly on the Istio resources:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-routing
  namespace: production
  annotations:
    docs.team/description: "Routes checkout traffic between stable and canary versions"
    docs.team/owner: "payments-team"
    docs.team/contact: "#payments-slack"
    docs.team/last-reviewed: "2026-02-15"
    docs.team/related-ticket: "JIRA-4521"
spec:
  hosts:
  - checkout.production.svc.cluster.local
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: canary
  - route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: stable
      weight: 95
    - destination:
        host: checkout.production.svc.cluster.local
        subset: canary
      weight: 5
```

Then extract these annotations into documentation:

```bash
#!/bin/bash
# extract-routing-docs.sh

echo "# Traffic Routing Rules"
echo ""

kubectl get virtualservices -A -o json | jq -r '
  .items[] |
  "## " + .metadata.name + "\n" +
  "**Namespace:** " + .metadata.namespace + "\n" +
  "**Description:** " + (.metadata.annotations["docs.team/description"] // "No description") + "\n" +
  "**Owner:** " + (.metadata.annotations["docs.team/owner"] // "Unknown") + "\n" +
  "**Contact:** " + (.metadata.annotations["docs.team/contact"] // "N/A") + "\n" +
  "**Last Reviewed:** " + (.metadata.annotations["docs.team/last-reviewed"] // "Never") + "\n" +
  "**Related Ticket:** " + (.metadata.annotations["docs.team/related-ticket"] // "N/A") + "\n"
'
```

## Documenting Route Matching Logic

Route matching in Istio follows a specific order: the first matching rule wins. This order matters and is easy to get wrong. Document it explicitly:

```yaml
# Route evaluation order for checkout service:
#
# 1. Header match: x-canary: true -> canary subset (for testing)
# 2. Path match: /api/v2/* -> v2 deployment (new API version)
# 3. Path match: /api/v1/* -> v1 deployment (legacy API)
# 4. Default: 95% stable, 5% canary (gradual rollout)
#
# IMPORTANT: Route 2 must come before Route 3 because /api/v2/checkout
# would match /api/v1/* if v1 route had a less specific prefix.

apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-routing
  namespace: production
spec:
  hosts:
  - checkout.production.svc.cluster.local
  http:
  # Route 1: Canary header override
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: canary
  # Route 2: V2 API
  - match:
    - uri:
        prefix: /api/v2/
    route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: v2
  # Route 3: V1 API (legacy)
  - match:
    - uri:
        prefix: /api/v1/
    route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: v1
    timeout: 30s
    retries:
      attempts: 2
      perTryTimeout: 10s
      retryOn: connect-failure,unavailable
  # Route 4: Default with traffic split
  - route:
    - destination:
        host: checkout.production.svc.cluster.local
        subset: stable
      weight: 95
    - destination:
        host: checkout.production.svc.cluster.local
        subset: canary
      weight: 5
```

## Creating a Routing Decision Diagram

For complex routing setups, generate a visual diagram. You can use Mermaid syntax that renders in most Markdown viewers:

```bash
#!/bin/bash
# generate-routing-diagram.sh

echo '```mermaid'
echo 'graph TD'

kubectl get virtualservices -A -o json | jq -r '
  .items[] |
  .metadata.name as $vs |
  .spec.hosts[0] as $host |
  .spec.http[] |
  . as $route |
  ($route.match // [{"uri": {"prefix": "/*"}}])[0] as $match |
  $route.route[] |
  "    " + $vs + "[" + $host + "] -->|" +
  ($match.uri.prefix // $match.uri.exact // $match.headers // "default" | tostring) +
  "| " + .destination.host + "_" + (.destination.subset // "default")
'

echo '```'
```

A manually maintained diagram often communicates better:

```markdown
## Checkout Service Routing

    ```
    Incoming Request
         |
         v
    [Header: x-canary=true?]
         |Yes            |No
         v               v
    [canary]      [Path: /api/v2/*?]
                       |Yes        |No
                       v            v
                    [v2]     [Path: /api/v1/*?]
                                |Yes        |No
                                v            v
                             [v1]      [95% stable / 5% canary]
    ```text
```

## Documenting Traffic Policies

DestinationRules define how traffic behaves after routing. Document these alongside the VirtualService rules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-dr
  namespace: production
  annotations:
    docs.team/description: |
      Traffic policies for checkout service.
      - Circuit breaker: 5 consecutive 5xx errors triggers 30s ejection
      - Max 200 concurrent connections per pod
      - Connections cycle after 100 requests to enable gradual drain
spec:
  host: checkout.production.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        maxRequestsPerConnection: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
  - name: v1
    labels:
      api-version: v1
  - name: v2
    labels:
      api-version: v2
```

## Generating a Route Table

Create a comprehensive route table that shows all routes in the mesh:

```bash
#!/bin/bash
# route-table.sh

echo "| Service | Namespace | Match | Destination | Timeout | Retries | Weight |"
echo "|---------|-----------|-------|-------------|---------|---------|--------|"

kubectl get virtualservices -A -o json | jq -r '
  .items[] |
  .metadata.name as $svc |
  .metadata.namespace as $ns |
  .spec.http[]? |
  . as $route |
  .route[] |
  "| " + $svc +
  " | " + $ns +
  " | " + (($route.match[0].uri.prefix // $route.match[0].uri.exact // "*") // "*") +
  " | " + .destination.host + ":" + (.destination.port.number // 80 | tostring) +
  " | " + ($route.timeout // "15s") +
  " | " + (($route.retries.attempts // 0) | tostring) +
  " | " + ((.weight // 100) | tostring) + "%" +
  " |"
'
```

## Documenting Routing Changes

Track routing changes over time. A simple approach is a changelog file:

```markdown
# Routing Changelog

## 2026-02-24 - Canary deployment for checkout v2
- Added 5% canary split to checkout-routing VirtualService
- Added canary header override for testing
- Ticket: JIRA-4521
- Rollback: Set canary weight to 0

## 2026-02-20 - Added v2 API routes
- New path-based route for /api/v2/ endpoints
- V1 routes unchanged
- Ticket: JIRA-4480

## 2026-02-15 - Circuit breaker tuning
- Increased consecutive5xxErrors from 3 to 5 (too many false ejections)
- Reduced baseEjectionTime from 60s to 30s
- Ticket: JIRA-4465
```

## GitOps-Based Route Documentation

If you're using GitOps (ArgoCD, Flux), your routing configuration is already in git. Add a README.md alongside your Istio manifests:

```text
k8s/
  production/
    istio/
      README.md           # Routing documentation
      checkout-vs.yaml    # VirtualService
      checkout-dr.yaml    # DestinationRule
      gateway.yaml        # Gateway
```

The README should explain the overall routing architecture, any non-obvious decisions, and troubleshooting steps:

```markdown
# Production Routing Configuration

## Architecture

Traffic enters through the `production-gateway` Gateway on ports 80 and 443.
The gateway terminates TLS using a cert-manager certificate.

## Services

### checkout
- 95/5 canary split between stable and canary
- Header override available for testing (x-canary: true)
- V1 and V2 API paths routed to separate deployments

### inventory
- Simple round-robin routing
- 30s timeout for bulk operations on /api/v1/bulk/*

## Troubleshooting

If checkout returns 503, check:
1. Are both stable and canary pods running? (`kubectl get pods -l app=checkout`)
2. Is the canary weight set correctly? (`kubectl get vs checkout-routing -o yaml`)
3. Are circuit breakers tripping? (`istioctl proxy-config clusters deploy/checkout`)
```

Keep your routing documentation close to the configuration it describes. If a developer needs to understand why traffic is being routed a certain way, they should be able to find the answer without hunting through a wiki or asking on Slack. Annotations on the resources themselves, combined with a README in the same directory, cover most documentation needs.
