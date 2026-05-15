# Validation Summary: How to Set Up Skipper HTTP Router on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Skipper HTTP router and reverse proxy
- Eskip route definitions
- Skipper predicates and filters
- systemd
- Kubernetes Ingress
- Prometheus metrics

## Sources Consulted
- Skipper GitHub README: https://github.com/zalando/skipper
- Skipper v0.25.2 release page and release assets: https://github.com/zalando/skipper/releases/tag/v0.25.2
- Skipper predicates reference: https://opensource.zalando.com/skipper/reference/predicates/
- Skipper filters reference: https://opensource.zalando.com/skipper/reference/filters/
- Skipper basics tutorial: https://opensource.zalando.com/skipper/tutorials/basics/
- Skipper Kubernetes ingress controller documentation: https://opensource.zalando.com/skipper/kubernetes/ingress-controller/
- Skipper ingress usage documentation: https://opensource.zalando.com/skipper/kubernetes/ingress-usage/
- Local Skipper v0.25.2 `--help`, `-version`, and `eskip check` output from the official Linux amd64 release tarball.

## Issues Found
- The binary install URL pointed to `skipper-linux-amd64`, which is not a current release asset. Updated the commands to resolve the latest tag and download the matching `skipper-<version>-linux-amd64.tar.gz` archive.
- The version check used `skipper version`, but the current Skipper CLI uses `skipper -version`. Updated the command.
- The route file creation wrote directly to `/etc/skipper/routes.eskip` without creating the directory or using privileges. Updated it to create `/etc/skipper` and write with `sudo tee`.
- The response header example used `modResponseHeader("Server", "MyApp")`, which has invalid parameters for that filter. Replaced it with `setResponseHeader("Server", "MyApp")`.
- The `ratelimit` example requires Skipper rate limit filters to be enabled. Added the `-enable-ratelimits` startup flag where relevant.
- The traffic splitting example used lowercase `trafficSegment` as a filter. `TrafficSegment` is a predicate, so the example was corrected to use `Path(...) && TrafficSegment(...)`.
- The Kubernetes deployment used the mutable `latest` image tag and omitted the service account and RBAC needed for Skipper to read ingress, service, endpoint, pod, and EndpointSlice resources. Updated the manifest to pin `v0.25.2` and include the required service account, cluster role, and binding.
- The ingress example did not explicitly select Skipper. Added the `kubernetes.io/ingress.class: skipper` annotation.
- The metrics section said Prometheus metrics are exposed by default and used the deprecated `-enable-prometheus-metrics` flag. Updated it to say metrics are exposed on the support listener by default and to use `-metrics-flavour=prometheus`.

## Review Notes
- The Kubernetes deployment remains a compact example. Production deployments should normally include a load balancer or host network strategy, readiness probes, resource limits, pinned release upgrades, and any organization-specific ingress class configuration.
- Skipper's required Go version changes with upstream releases, so builders should check the current `go.mod` before building from source.
