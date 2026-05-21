# Validation Summary: How to Configure Timeout and Retry Together in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- VirtualService
- HTTP route timeouts
- HTTP retries

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy router filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy HTTP routing and retry semantics: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/http_routing.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Python json.tool documentation/help output: https://docs.python.org/3/library/json.html#module-json.tool

## Issues Found
- The post treated Istio `retries.attempts` as the total number of tries. Istio documents `attempts` as the number of retries, with a maximum of `1 + attempts` upstream requests. The formula, example math, timeout values, and quick reference table were updated to account for the original request plus retries.
- The post stated that an unset Istio route timeout defaults to 15 seconds. Istio's VirtualService reference documents the HTTP route `timeout` default as disabled, while Envoy's raw route timeout default is 15 seconds. The section was updated to describe Istio's VirtualService behavior and still recommend an explicit route timeout.
- The bad per-try timeout example said there would be no retries at all. That is only reliably true for slow attempts where the route timeout fires before the per-try timeout; immediate retryable responses could still retry before the overall timeout expires. The explanation was narrowed accordingly.
- The fast API and background processing examples used `attempts` values that did not match their explanatory text or left insufficient room for the maximum number of tries. The examples were adjusted so the text and timeout budget match Istio retry semantics.
- The database proxy example used an HTTP `VirtualService` route with port 5432, implying that Istio HTTP retries apply directly to raw PostgreSQL traffic. The example was changed to an HTTP proxy port and the text now states that raw database protocols are not handled by an HTTP `VirtualService` route.

## Review Notes
The VirtualService YAML structure, `timeout`, `retries`, `perTryTimeout`, and `retryOn` field names are current for Istio. The `retryOn` policy names used in the post are valid Envoy retry conditions. The debugging commands use the current `kubectl exec TYPE/NAME -c CONTAINER -- COMMAND` form; `kubectl` was not installed locally, so command syntax was checked against the official Kubernetes reference rather than local help output.
