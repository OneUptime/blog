# Validation Summary: How to Implement Linkerd ServiceMirror

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Linkerd multicluster
- Linkerd ServiceMirror
- Kubernetes Services, Secrets, Deployments, RBAC, and Endpoints
- Linkerd mTLS identity certificates
- Linkerd SMI TrafficSplit
- Prometheus metrics

## Sources Consulted
- Linkerd 2.19 multicluster CLI reference: https://linkerd.io/2.19/reference/cli/multicluster/
- Linkerd multicluster installation guide: https://linkerd.io/2-edge/tasks/installing-multicluster/
- Linkerd multicluster reference: https://linkerd.io/2-edge/reference/multicluster/
- Linkerd multicluster walkthrough: https://linkerd.io/docs/tasks/multicluster/
- Linkerd proxy configuration reference: https://linkerd.io/2-edge/reference/proxy-configuration/
- Linkerd SMI TrafficSplit guide: https://linkerd.io/2-edge/tasks/linkerd-smi/
- Linkerd multicluster chart values and templates: https://github.com/linkerd/linkerd2/tree/main/multicluster/charts/linkerd-multicluster
- Linkerd service mirror source metrics: https://github.com/linkerd/linkerd2/tree/main/multicluster/service-mirror

## Issues Found
- The source cluster installation did not configure a service mirror controller for the `east` Link. Added a `values-west.yaml` example with `controllers[].link.ref.name: east` and used it during the west multicluster install.
- The gateway configuration example used a ConfigMap that is not consumed by the Linkerd multicluster chart. Replaced it with actual multicluster chart values for `gateway.serviceType` and `gateway.nodePort`.
- The gateway resource limit example patched a non-existent `linkerd-gateway` container. Replaced it with supported proxy resource annotations under `gateway.deploymentAnnotations`.
- The Link generation command used the older `linkerd multicluster link` flow and an unsupported `--gateway-identity` flag for current Linkerd. Updated it to `linkerd multicluster link-gen` with `--gateway-addresses` and `--gateway-port`.
- The example Link spec combined host and port in `gatewayAddress`. Split this into `gatewayAddress` and `gatewayPort`, matching the Link CRD fields.
- The credential rotation procedure attempted to read `cluster-credentials-east` from the target cluster, but `link-gen` emits the credential Secret for the source cluster to apply. Updated the flow to regenerate and apply the `link-gen` manifest to the source cluster.
- The service export configuration listed unsupported annotations for custom mirrored names and gateway selection. Removed those annotations and left the supported export label.
- The TrafficSplit example used deprecated API version `v1alpha1` and milli-style weights. Updated it to `v1alpha2` with integer weights and noted that Linkerd SMI TrafficSplit is deprecated in current releases.
- The gateway status example described success-rate columns that `linkerd multicluster gateways` does not report. Updated the sample output to gateway liveness, service count, and latency.
- The Prometheus section listed non-existent metric names such as `gateway_requests_total` and `service_mirror_probe_success_total`. Replaced them with current service mirror metrics including `gateway_alive`, `gateway_probe_latency_ms_bucket`, `gateway_probes`, and `service_mirror_endpoint_repairs`.

## Review Notes
The post now aligns with Linkerd 2.19-era declarative multicluster setup. Future improvements could cover flat-network and federated multicluster modes, but those are beyond the scope of this gateway-mode ServiceMirror guide.
