# Validation Summary: How to Configure MetalLB for Multi-Cluster Load Balancing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MetalLB
- Kubernetes Services, Deployments, RBAC, probes, affinity, and Downward API
- BGP and BFD
- ExternalDNS with AWS Route 53
- NGINX
- Istio multi-cluster traffic policy
- Prometheus federation and Grafana dashboards

## Sources Consulted
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB usage and service annotations: https://metallb.universe.tf/usage/
- MetalLB Prometheus metrics documentation: https://metallb.universe.tf/prometheus-metrics/
- MetalLB troubleshooting documentation: https://metallb.universe.tf/troubleshooting/
- ExternalDNS AWS tutorial: https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md
- NGINX HTTP health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-health-check/
- NGINX stream health check module documentation: https://nginx.org/en/docs/stream/ngx_stream_upstream_hc_module.html
- Istio locality failover documentation: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Kubernetes Downward API / topology labels documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/

## Issues Found
- MetalLB Helm install forced `speaker.frr.enabled=true`, which selects deprecated FRR mode unless paired with additional values. Removed the override so the chart uses the current default FRR-K8s backend.
- IP pools were configured with `L2Advertisement` and then later advertised via BGP. Removed the L2 advertisements so the guide consistently uses BGP for cross-cluster routing.
- MetalLB service annotations used old `metallb.universe.tf/*` keys. Updated them to current `metallb.io/address-pool` and `metallb.io/loadBalancerIPs` annotations.
- The global load balancer requested `192.168.100.200`, which was outside the configured Cluster A pool. Changed it to `192.168.100.50`.
- NGINX used the commercial `health_check` directive with the open-source `nginx:1.25-alpine` image. Reworked the example to use open-source NGINX HTTP proxying with passive upstream failure detection.
- The sample services did not request the fixed backend IPs referenced by NGINX. Added explicit MetalLB IP annotations and updated the multi-cluster `sed` commands.
- ExternalDNS used an old image and alpha hostname annotation. Updated the image to the current documented example, changed the hostname annotation to `external-dns.kubernetes.io/hostname`, and moved the public hostname to the global load balancer Service.
- The health-check controller used Bash arrays while running in a `/bin/sh` container and probed `/health` on an app serving `/`. Rewrote it as POSIX shell and changed the endpoint to `/`.
- Istio traffic policy split subsets into a second `DestinationRule` for the same host. Merged subsets into the primary `DestinationRule`.
- Prometheus examples referenced only `metallb_bgp_session_up`, but current FRR-K8s mode exposes equivalent BGP metrics with the `frrk8s_` prefix. Updated alert and dashboard queries.
- Troubleshooting commands assumed an FRR sidecar inside the speaker pod. Updated them to use speaker logs and FRR-K8s node state resources.
- The failover test still referenced the old global load balancer IP. Updated it to `192.168.100.50`.
- The BFD best-practice claim promised millisecond failover. Adjusted it to the more accurate sub-second failure detection caveat.

## Review Notes
- YAML snippets were parsed locally with Python/PyYAML, the embedded Grafana dashboard JSON was parsed with Python, and script snippets were checked with `sh -n` / `bash -n`.
- NGINX was not installed in the workspace, so the NGINX config was reviewed against official directive documentation rather than validated with `nginx -t`.
- The Istio multi-cluster section remains a simplified optional example; a production Istio deployment still needs the full remote-secret, trust, gateway exposure, and network setup from the official Istio multi-cluster installation flow.
