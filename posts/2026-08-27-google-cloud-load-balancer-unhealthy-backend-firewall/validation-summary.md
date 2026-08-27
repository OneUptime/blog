# Validation Summary: Diagnose Unhealthy Google Cloud Load Balancer Backends

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Google Cloud Load Balancing, including GFE-based, managed Envoy, and passthrough load balancers
- Google Cloud backend services
- Google Cloud health checks and legacy health checks
- Instance groups and network endpoint groups (zonal, hybrid, internet, serverless, and Private Service Connect NEGs)
- VPC firewall rules, Cloud Next Generation Firewall policies, and Shared VPC
- Google Cloud CLI (`gcloud`)
- Cloud Logging health-check and load-balancer request logs
- Linux networking diagnostics (`ss`, `curl`, and `tcpdump`)

## Sources Consulted
- [Cloud Load Balancing firewall rules](https://cloud.google.com/load-balancing/docs/firewall-rules) - load-balancer-specific health-check, GFE, proxy-only-subnet, IPv4, and IPv6 source requirements.
- [Evaluation order for firewall policies and rules](https://cloud.google.com/firewall/docs/firewall-policies-rule-eval-order) and [VPC firewall rules](https://cloud.google.com/firewall/docs/firewalls) - cross-policy evaluation order, enforcement-order settings, rule priorities, and same-priority deny precedence.
- [Health checks overview](https://cloud.google.com/load-balancing/docs/health-check-concepts) - supported protocols and backends, probe sources and destinations, HTTP success criteria, TLS certificate behavior, health states, and threshold behavior.
- [Use health checks](https://cloud.google.com/load-balancing/docs/health-checks) - global and regional resource commands, fixed versus serving-port behavior, expected response matching, legacy health checks, and firewall guidance.
- [Health-check logging](https://cloud.google.com/load-balancing/docs/health-check-logging) - transition-only logging, the Cloud Logging query, detailed states, probe-result fields, and logging limitations.
- [Serverless NEG overview](https://cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts), [hybrid NEG overview](https://cloud.google.com/load-balancing/docs/negs/hybrid-neg-concepts), and [internet NEG overview](https://cloud.google.com/load-balancing/docs/negs/internet-neg-concepts) - unsupported health checks and distributed Envoy health-check behavior.
- [External Application Load Balancer logging overview](https://cloud.google.com/load-balancing/docs/https/https-logs-monitor-overview), [regional external Application Load Balancer logging](https://cloud.google.com/load-balancing/docs/https/https-reg-logging-monitoring), and [internal Application Load Balancer logging](https://cloud.google.com/load-balancing/docs/l7-internal/monitoring) - `statusDetails`, `proxyStatus`, and backend failure detail meanings.
- [Troubleshoot external Application Load Balancers](https://cloud.google.com/load-balancing/docs/https/troubleshooting-ext-https-lbs) - backend health verification and `failed_to_pick_backend` / `failed_to_connect_to_backend` diagnostics.
- [`gcloud compute backend-services get-health`](https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health), [`backend-services describe`](https://cloud.google.com/sdk/gcloud/reference/compute/backend-services/describe), and [`health-checks describe`](https://cloud.google.com/sdk/gcloud/reference/compute/health-checks/describe) - command names, positional arguments, and global/regional flags.
- [`gcloud compute http-health-checks describe`](https://cloud.google.com/sdk/gcloud/reference/compute/http-health-checks/describe) and [`https-health-checks describe`](https://cloud.google.com/sdk/gcloud/reference/compute/https-health-checks/describe) - commands for legacy global health-check resources.
- [`gcloud compute firewall-rules list`](https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list) and [`instances network-interfaces get-effective-firewalls`](https://cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/get-effective-firewalls) - current firewall projections and effective-rule inspection.
- [View the network configuration for an instance](https://cloud.google.com/compute/docs/instances/view-network-properties) and the [Compute Engine Instance REST schema](https://cloud.google.com/compute/docs/reference/rest/v1/instances) - repeated network-interface fields, IPv4/IPv6 address fields, tags, and service accounts.
- [Compute Engine BackendService REST resource](https://cloud.google.com/compute/docs/reference/rest/v1/backendServices) - backend-service fields and health-check reference types.

## Issues Found
1. **The VM output projection did not traverse repeated fields.** The original `yaml(networkInterfaces.network,...,serviceAccounts.email)` projection could omit network-interface and service-account values. Changed it to use `networkInterfaces[]` and `serviceAccounts[]`, and included the interface name and internal IPv6 address field.
2. **The backend-service inspection did not expose enough load-balancer identity and assumed every reference was a modern health check.** Added `loadBalancingScheme` to the backend-service projection, expanded the protocol-specific settings to record, and documented the separate `http-health-checks` and `https-health-checks` commands required for legacy references.
3. **The workflow treated `get-health` as universal.** Clarified that serverless and Private Service Connect NEGs do not support health checks, and that endpoint health for hybrid and regional internet NEGs using distributed Envoy checks is not available through the console, API, or `backend-services get-health`.
4. **Firewall precedence was described as a single higher-priority comparison.** Priorities are not globally compared across hierarchical, regional system, network firewall policy, and VPC rule tiers. Reworded the requirement around the effective firewall evaluation, documented the configurable network-policy enforcement order and same-priority VPC deny behavior, and added the effective-firewalls command.
5. **The VPC firewall command could hide deny rules and query the wrong project in Shared VPC.** Updated the table projection to show both `ALLOW` and `DENY`, and clarified that VPC firewall rules must be listed from the project that owns the VPC network (the host project for Shared VPC).
6. **The Envoy source-rule explanation was overgeneralized.** Scoped the separate centralized-prober and proxy-only-subnet requirements to instance-group and `GCE_VM_IP_PORT` zonal NEG backends. Clarified that hybrid and regional internet NEGs use distributed Envoy health checks from the proxy-only subnet, with regional internet NEG traffic NAT-translated before it leaves the VPC.
7. **The port model incorrectly presented fixed, serving, and named ports as three independent health-check modes.** Corrected it to the two current methods, `--port` and `--use-serving-port`, and explained how the serving port resolves to a NEG endpoint port or an instance-group named-port mapping. Also clarified that passthrough load balancers use a fixed health-check port.
8. **The probe destination and socket-binding guidance was too broad for passthrough load balancers.** Added that passthrough probes target the forwarding-rule IP and that the application must bind that IP or `0.0.0.0`. Scoped the `curl` example to HTTP-family checks, updated its placeholder, documented the health check's effective `Host` value and HTTP/2 emulation, and noted that a normal request to a forwarding-rule IP can select any eligible backend.
9. **The HTTPS manual test did not account for Google probe certificate behavior.** Clarified that Google health-check probers do not validate backend certificates, whereas `curl` validates them by default, and scoped `--insecure` to intentional probe emulation.
10. **The HTTP success condition omitted the optional body matcher.** Added the requirement that a configured expected response string appear within the first 1,024 response-body bytes in addition to the mandatory `200 OK` status.
11. **Health-check logging was described as more granular than guaranteed.** Clarified that logs are generated on health transitions rather than for every probe, `probeResultText` can be empty, `TIMEOUT` combines connection and response-timeout cases, and distributed Envoy checks omit several detailed fields. Also noted that legacy health checks and target pools do not support health-check logging.
12. **The request-log field was incorrectly generalized to every Application Load Balancer.** Scoped `statusDetails` to global external and classic Application Load Balancers and directed regional external and regional/cross-region internal Application Load Balancers to `proxyStatus`.

## Review Notes
- The `gcloud` command names and the `--project`, `--global`, `--region`, and `--zone` flags are current and non-deprecated.
- The documented IPv4 health-check source for global external Application Load Balancers is currently `35.191.0.0/16`; applicable GFE traffic also uses `130.211.0.0/22`. The post correctly directs readers to the official matrix for product-, backend-, purpose-, and IP-family-specific ranges.
- The Cloud Logging filter `logName="projects/PROJECT_ID/logs/compute.googleapis.com%2Fhealthchecks"` is correct.
- The referenced official documentation URLs are valid. No product versions are pinned in the post.
