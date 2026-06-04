# Validation Summary: How to Use Contour HTTPProxy Rate Limiting and Circuit Breaking Features

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Contour HTTPProxy
- Contour ExtensionService
- Envoy rate limit service
- Redis
- Envoy circuit breakers

## Sources Consulted
- Contour API reference for HTTPProxy rateLimitPolicy, LocalRateLimitPolicy, RetryPolicy, Route, healthCheckPolicy, and LoadBalancerPolicy: https://projectcontour.io/docs/main/config/api-reference/
- Contour configuration reference for rateLimitService and cluster circuit-breakers: https://projectcontour.io/docs/main/configuration/
- Contour rate limiting guide for ExtensionService and global descriptor behavior: https://projectcontour.io/docs/1.21/config/rate-limiting/
- Contour annotations reference for Service circuit breaker annotations: https://projectcontour.io/docs/1.27/config/annotations/
- Envoyproxy ratelimit README for default HTTP/gRPC ports, runtime config path, Redis settings, and descriptor configuration: https://github.com/envoyproxy/ratelimit
- Docker Hub envoyproxy/ratelimit tags for available image tags: https://hub.docker.com/r/envoyproxy/ratelimit/tags

## Issues Found
- The ratelimit Deployment and Service had the Envoy rate limit service HTTP and gRPC ports reversed. The official ratelimit service listens on HTTP port 8080 and gRPC port 8081, and Contour's ExtensionService must point to the gRPC port. Updated the container ports, Service ports, and ExtensionService port.
- The post used `envoyproxy/ratelimit:latest`, but the upstream image uses `master` and commit-based tags. Updated the example image tag to `envoyproxy/ratelimit:master`.
- The post claimed circuit breakers were configured with `loadBalancerPolicy.circuitBreaker` on HTTPProxy routes. That is not a valid HTTPProxy schema field. Replaced those examples with supported `projectcontour.io/max-connections`, `projectcontour.io/max-pending-requests`, `projectcontour.io/max-requests`, and `projectcontour.io/max-retries` Kubernetes Service annotations.
- The post described an "Outlier Detection" example, but the YAML only configured Contour HTTP health checks and invalid route-level circuit breaker fields. Renamed and corrected the section to use `healthCheckPolicy` accurately.
- The post described per-route circuit breaking, but Contour circuit breaker annotations are applied to Services, not routes. Reworked the example to show different annotated Services routed by HTTPProxy.
- The combined protection example used invalid route-level circuit breaker YAML. Moved circuit breaker limits to the referenced Service annotations.
- The combined protection example used `retryPolicy.numRetries`, but the HTTPProxy API field is `retryPolicy.count`. Updated the field name.
- The opening description implied both rate limiting and circuit breaking are configured through HTTPProxy. Updated the wording to distinguish HTTPProxy rate limiting from Service annotation / Contour cluster default circuit breaker configuration.

## Review Notes
- The post now uses valid Contour HTTPProxy rate limiting fields and valid Service-level circuit breaker configuration. In production, pin the ratelimit image to a specific published commit tag rather than the mutable `master` tag.
