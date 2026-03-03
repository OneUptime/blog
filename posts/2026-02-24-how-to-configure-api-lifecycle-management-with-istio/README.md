# How to Configure API Lifecycle Management with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Lifecycle, Versioning, Deprecation, Traffic Management

Description: How to manage the complete lifecycle of APIs using Istio from initial deployment through versioning, deprecation, and retirement.

---

API lifecycle management covers everything from the moment an API is first deployed to when it is finally shut down. The stages include deployment, versioning, monitoring, deprecation, and retirement. Istio gives you traffic management tools that map directly to each of these stages. Instead of building lifecycle management into each service, you handle it at the mesh layer.

## The API Lifecycle Stages

A typical API lifecycle looks like this:

1. **Development** - API is being built, tested internally
2. **Beta** - API is available to select users
3. **General Availability (GA)** - API is stable and available to all
4. **Deprecated** - API still works but users should migrate
5. **Sunset** - API returns errors, final warning period
6. **Retired** - API is completely removed

Istio can help manage the transitions between these stages.

## Stage 1: Beta Deployment

Deploy the new API version and restrict access using header-based routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-api
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    # Beta users only
    - match:
        - uri:
            prefix: /api/v2/payments
          headers:
            x-beta-access:
              exact: "true"
      route:
        - destination:
            host: payment-service
            subset: v2-beta
          headers:
            response:
              add:
                x-api-status: "beta"
                x-api-stability: "experimental"
    # GA version for everyone else
    - match:
        - uri:
            prefix: /api/v1/payments
      route:
        - destination:
            host: payment-service
            subset: v1
          headers:
            response:
              add:
                x-api-status: "stable"
```

The DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
spec:
  host: payment-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2-beta
      labels:
        version: v2-beta
    - name: v2
      labels:
        version: v2
```

## Stage 2: Gradual Rollout to GA

When the beta version is stable, gradually shift traffic from v1 to v2:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-api-rollout
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    # v2 is now available to everyone
    - match:
        - uri:
            prefix: /api/v2/payments
      route:
        - destination:
            host: payment-service
            subset: v2
          headers:
            response:
              add:
                x-api-status: "stable"
    # v1 still works but starts shifting some traffic to v2
    - match:
        - uri:
            prefix: /api/v1/payments
      route:
        - destination:
            host: payment-service
            subset: v1
          weight: 90
          headers:
            response:
              add:
                x-api-status: "stable"
        - destination:
            host: payment-service
            subset: v2
          weight: 10
          headers:
            response:
              add:
                x-api-status: "stable"
                x-api-migration: "testing-v2-compatibility"
```

Adjust the weights over time: 90/10 then 70/30 then 50/50 then 0/100.

## Stage 3: Deprecation

When v2 is fully rolled out and v1 needs to be deprecated, add deprecation headers:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-api-deprecated
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    # v2 is the current version
    - match:
        - uri:
            prefix: /api/v2/payments
      route:
        - destination:
            host: payment-service
            subset: v2
          headers:
            response:
              add:
                x-api-status: "stable"
    # v1 is deprecated
    - match:
        - uri:
            prefix: /api/v1/payments
      route:
        - destination:
            host: payment-service
            subset: v1
          headers:
            response:
              add:
                deprecation: "true"
                sunset: "Sat, 01 Jul 2026 00:00:00 GMT"
                link: '</api/v2/payments>; rel="successor-version"'
                x-api-status: "deprecated"
```

The `Deprecation`, `Sunset`, and `Link` headers follow established RFC standards for API deprecation signaling. Clients that parse these headers can be alerted about the upcoming change.

## Stage 4: Sunset Period

During the sunset period, start returning warnings and eventually errors for the old API:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: v1-sunset-warning
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: HTTP_FILTER
      match:
        context: GATEWAY
        listener:
          filterChain:
            filter:
              name: envoy.filters.network.http_connection_manager
              subFilter:
                name: envoy.filters.http.router
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")
                if path and path:find("^/api/v1/") then
                  -- After sunset date, return 410 Gone
                  local sunset_timestamp = 1751328000  -- July 1, 2026
                  if os.time() > sunset_timestamp then
                    request_handle:respond(
                      {[":status"] = "410",
                       ["content-type"] = "application/json",
                       ["link"] = '</api/v2/>; rel="successor-version"'},
                      '{"error": "This API version has been retired. Please migrate to /api/v2/."}'
                    )
                  end
                end
              end
```

## Stage 5: Retirement

When the API is retired, redirect all traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-api-retired
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    # Retired v1 returns 410 Gone
    - match:
        - uri:
            prefix: /api/v1/payments
      directResponse:
        status: 410
        body:
          string: '{"error":"API v1 has been retired. Use /api/v2/payments instead.","migration_guide":"https://docs.example.com/migration/v1-to-v2"}'
    # v2 continues serving
    - match:
        - uri:
            prefix: /api/v2/payments
      route:
        - destination:
            host: payment-service
            subset: v2
```

Now you can safely scale down and delete the v1 deployment.

## Monitoring Lifecycle Transitions

Track how many requests still hit deprecated endpoints:

```text
sum(rate(istio_requests_total{request_url_path=~"/api/v1/.*"}[1h]))
```

Compare v1 vs v2 traffic:

```text
sum(rate(istio_requests_total{request_url_path=~"/api/v1/.*"}[1h]))
/
(sum(rate(istio_requests_total{request_url_path=~"/api/v1/.*"}[1h])) + sum(rate(istio_requests_total{request_url_path=~"/api/v2/.*"}[1h])))
```

When v1 traffic approaches zero, it is safe to retire.

## Automating Lifecycle Transitions

Use GitOps to manage lifecycle transitions. Store your VirtualService configurations in Git and use Argo CD or Flux to apply them:

```bash
git checkout -b deprecate-v1
# Edit the VirtualService YAML to add deprecation headers
git commit -am "Deprecate API v1 payments endpoint"
git push origin deprecate-v1
# Create PR for review
```

For more automated transitions, create a simple controller that updates VirtualService configurations based on a schedule:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: api-lifecycle-manager
spec:
  schedule: "0 0 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: lifecycle-check
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Check if sunset date has passed for any API
                  current_date=$(date +%s)
                  # Apply retirement configuration if past sunset
                  kubectl apply -f /configs/retired-apis/
          restartPolicy: OnFailure
```

## Documentation During Lifecycle

Update documentation routing as APIs progress through lifecycle stages:

```yaml
http:
  - match:
      - uri:
          prefix: /docs/v1
    route:
      - destination:
          host: docs-service
          port:
            number: 80
        headers:
          response:
            add:
              x-docs-notice: "This API version is deprecated. See /docs/v2 for the current version."
```

## Communication Strategy

Beyond technical implementation, lifecycle management requires communication. Use Istio to enforce the technical aspects while your team handles the human side:

- Add deprecation headers weeks or months before sunset
- Monitor which clients are still using deprecated endpoints
- Reach out to heavy users of deprecated APIs directly
- Provide migration guides at the URLs referenced in Link headers

The combination of deprecation headers, traffic monitoring, and eventual 410 responses creates a clear lifecycle path that both machines and humans can follow. Istio handles the traffic management and header injection, while your team manages the communication and support.
