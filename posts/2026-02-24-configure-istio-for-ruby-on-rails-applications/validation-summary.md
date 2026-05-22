# Validation Summary: How to Configure Istio for Ruby on Rails Applications

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio service mesh
- Kubernetes Deployments, Services, probes, lifecycle hooks, and Jobs
- Ruby on Rails
- Puma
- Rack middleware
- Net::HTTP
- Faraday
- Redis / Sidekiq
- PostgreSQL Active Record configuration

## Sources Consulted
- Istio application requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio protocol selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes container lifecycle hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Puma DSL documentation: https://puma.io/puma/Puma/DSL.html
- Puma 6 persistent timeout documentation: https://puma.io/puma6/Puma/DSL.html
- redis-rb official README: https://github.com/redis/redis-rb
- faraday-retry official README: https://github.com/lostisland/faraday-retry
- Faraday middleware documentation: https://rubyrubyrubyruby.dev/faraday/2.11/docs/middleware/index_md.html

## Issues Found
- The Puma `worker_timeout` comment incorrectly tied the setting to Istio retry timeouts. Puma documents it as a master/worker check-in timeout, so the comment was corrected.
- The Puma snippet used `on_worker_boot`, which is deprecated in current Puma in favor of `before_worker_boot`. The hook was updated.
- The Rails Redis readiness check used `Redis.current`, which is removed from current redis-rb. It now creates a Redis client with `REDIS_URL` and calls `ping`.
- The Net::HTTP helper did not enable TLS for HTTPS URLs. It now passes `use_ssl: uri.scheme == 'https'`.
- The Faraday trace middleware was registered after the default connection was constructed and was never added to the connection. The snippet now registers the middleware first and adds `conn.request :trace_headers`.
- The Faraday retry middleware can come from the separate `faraday-retry` package in current Faraday setups. The snippet now requires `faraday` and `faraday/retry` explicitly.
- The database configuration text described retry logic, but the shown PostgreSQL settings only configure connection behavior. The wording was changed to connection timeout, and the unsupported `reconnect: true` line was removed.
- The Kubernetes graceful shutdown sequence incorrectly said SIGTERM is sent before the preStop hook. Kubernetes runs preStop before sending TERM, so the sequence was corrected.
- The migration Job guidance referred to `sidecar.istio.io/inject` as an annotation. Istio now documents the annotation as deprecated in favor of the pod label, so the wording was changed to label.

## Review Notes
- The Istio VirtualService and DestinationRule examples use valid current `networking.istio.io/v1` fields.
- The Kubernetes startup probe calculation is correct: `periodSeconds: 5` with `failureThreshold: 30` allows about 150 seconds.
- The Faraday retry middleware requires the application to include the `faraday-retry` gem in its bundle.
