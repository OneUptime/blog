# Validation Summary: How to Configure Linkerd External Workload Support for Bare Metal Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd mesh expansion
- Linkerd ExternalWorkload resources
- SPIFFE/SPIRE workload identity
- Kubernetes Services and ServiceMonitor resources
- Linux systemd and iptables
- Prometheus metrics and PromQL

## Sources Consulted
- Linkerd ExternalWorkload reference: https://linkerd.io/2-edge/reference/external-workload/
- Linkerd guide for adding non-Kubernetes workloads: https://linkerd.io/2-edge/tasks/adding-non-kubernetes-workloads/
- Linkerd non-Kubernetes workloads feature page: https://linkerd.io/docs/features/non-kubernetes-workloads/
- Linkerd install CLI reference: https://linkerd.io/docs/reference/cli/install/
- Linkerd getting started install guide: https://linkerd.io/docs/getting-started/
- Linkerd proxy metrics reference: https://linkerd.io/2.10/reference/proxy-metrics/
- Linkerd 2.15 announcement for mesh expansion and SPIFFE context: https://linkerd.io/2024/02/21/announcing-linkerd-2.15/

## Issues Found
- The post used `linkerd install --set enableExternalWorkloads=true`, but current Linkerd docs do not document that install value for mesh expansion. Updated installation to use the documented CRD-first install flow and noted the Linkerd 2.15+ requirement.
- The post pinned `stable-2.14.0`, but mesh expansion was introduced in Linkerd 2.15. Updated the version guidance and proxy download example to the current documented edge proxy image extraction flow.
- The post used a non-existent `linkerd identity create-workload` command and Kubernetes service-account-style identities for bare metal workloads. Replaced this with the documented SPIFFE/SPIRE identity model for off-cluster workloads.
- The `ExternalWorkload` manifests used `workload.linkerd.io/v1alpha1`, hand-written `Endpoints`, and service-account identity strings. Updated them to `workload.linkerd.io/v1beta1`, SPIFFE identities, required `serverName`, workload labels, and selector-backed Kubernetes Services.
- The proxy systemd environment used Kubernetes identity service/token settings that are not the documented external workload configuration. Replaced them with the documented destination, policy, SPIRE socket, identity server ID/name, and trust anchor settings.
- The traffic routing example redirected only one outbound port and suggested `HTTP_PROXY`/`HTTPS_PROXY`, which is not how the Linkerd proxy is intended to receive traffic. Replaced it with the documented transparent iptables rules and clarified that explicit HTTP proxy variables are not used.
- The verification example used HTTP `curl` against a PostgreSQL port and referenced `linkerd-destination-cli`. Replaced it with a meshed test pod and TCP connectivity check, plus proxy metrics/log checks.
- The monitoring examples had an invalid ServiceMonitor setup for an external workload and used `request_total` with the `classification` label. Updated the metrics Service to match the selected external workload/admin port and changed success-rate PromQL to use `response_total`, where `classification` is documented.
- The certificate rotation section copied Linkerd in-cluster identity issuer secrets to the bare metal server. Replaced this with SPIRE health checks and Linkerd proxy identity expiration metrics, since SPIRE issues and rotates the off-cluster workload SVIDs.
- Troubleshooting commands referenced the wrong destination service name and Kubernetes-issued TLS files. Updated them to the documented headless destination service, policy service, SPIRE SVID fetch check, and Linkerd identity metrics.

## Review Notes
The corrected examples still assume the external machine can resolve Kubernetes cluster DNS names such as `linkerd-dst-headless.linkerd.svc.cluster.local` and can route to the Linkerd control plane services. In production, that usually requires private networking, DNS forwarding, or equivalent infrastructure outside the scope of this post.
