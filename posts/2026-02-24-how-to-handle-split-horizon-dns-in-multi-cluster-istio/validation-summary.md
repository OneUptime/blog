# Validation Summary: How to Handle Split-Horizon DNS in Multi-Cluster Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio multi-cluster deployments
- Istio DNS proxying
- Istio ServiceEntry
- Istio east-west gateways
- CoreDNS
- Kubernetes DNS and kubectl

## Sources Consulted
- Istio DNS Proxying: https://istio.io/latest/docs/ops/configuration/traffic-management/dns-proxy/
- Istio Understanding DNS: https://istio.io/latest/docs/ops/configuration/traffic-management/dns/
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio deployment models, DNS with multiple clusters: https://istio.io/latest/docs/ops/deployment/deployment-models/
- Istio multi-primary multi-network install guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- CoreDNS Corefile configuration manual: https://coredns.io/manual/configuration/
- CoreDNS health plugin reference: https://coredns.io/plugins/health/

## Issues Found
- The CoreDNS example used `health { lazystart }`, but `lazystart` is not a valid option for the CoreDNS health plugin. Changed it to `health`.
- The CoreDNS forwarding example used a `global` zone without explaining that this only matches names under that DNS zone. Changed the example to a concrete remote service domain, `cluster-b.local`, and clarified that the upstream DNS address must be reachable from the local cluster.
- The Istio DNS proxying example used deprecated `ISTIO_META_DNS_AUTO_ALLOCATE` proxy metadata. Replaced it with `PILOT_ENABLE_IP_AUTOALLOCATE` under `values.pilot.env` and left `ISTIO_META_DNS_CAPTURE` for sidecar DNS capture.
- The DNS proxying explanation omitted that ambient mode enables DNS proxying by default in Istio 1.25 and later. Added that caveat.
- The network labeling commands labeled the application namespace and described it as pod labeling. Updated the commands to label the `istio-system` namespace for the cluster default network, matching Istio's multi-network guidance.
- The DestinationRule example only configured connection pool and outlier detection, which does not distinguish overlapping services by cluster. Replaced it with cluster-aware subsets using `topology.istio.io/cluster`.
- The east-west gateway command installed Istio with multi-cluster settings but did not deploy the east-west gateway. Replaced it with the official `samples/multicluster/gen-eastwest-gateway.sh` pipeline.
- The verification commands used `svc.cluster.local` even though the article's examples use cluster-specific service domains. Updated them to `cluster-a.local` and `cluster-b.local` hostnames.

## Review Notes
The post is technically valid after correction. In a future revision, it could more explicitly distinguish standard Istio multi-cluster service discovery with same-named Kubernetes Services in each cluster from custom split-horizon DNS using distinct cluster service domains.
