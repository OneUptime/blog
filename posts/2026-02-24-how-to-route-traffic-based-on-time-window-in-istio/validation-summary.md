# Validation Summary: How to Route Traffic Based on Time Window in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes CronJob
- Kubernetes ConfigMap
- Kubernetes RBAC
- kubectl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- kubectl create job reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The VirtualService examples routed to subsets without noting that those subsets must be declared in a corresponding Istio DestinationRule. Added a sentence clarifying that the examples assume a DestinationRule for the referenced subsets.
- The CronJob examples did not specify `.spec.timeZone`, and the post said CronJobs use the cluster's configured timezone. Kubernetes documents that, when `.spec.timeZone` is omitted, schedules are interpreted using the kube-controller-manager local timezone. Added `timeZone: "Etc/UTC"` to the CronJob examples and corrected the timezone explanation.
- The EnvoyFilter Lua example used the deprecated `inline_code` field. Updated it to `default_source_code.inline_string`, which is the current Envoy v3 Lua configuration field.
- The EnvoyFilter example applied the Lua filter with `context: SIDECAR_INBOUND` on the destination workload, which would add the header after outbound or gateway route matching had already selected the destination subset. Updated the example to apply at the ingress gateway with `context: GATEWAY` and added a note that mesh-internal service-to-service routing should use `context: SIDECAR_OUTBOUND` on client sidecars.

## Review Notes
- The kubectl commands for creating ConfigMaps, manually creating a Job from a CronJob, reading Job logs, and querying VirtualService output are consistent with current kubectl behavior.
- The examples use short Kubernetes service hostnames such as `my-app`, which is valid in Istio but namespace-relative. Fully qualified service names can reduce ambiguity in multi-namespace deployments.
