# Validation Summary: How to Handle Cluster Migration with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio multi-cluster mesh installation
- Istio east-west gateways
- Istio DestinationRule and VirtualService resources
- Kubernetes workloads, services, namespaces, and kubectl
- istioctl

## Sources Consulted
- Istio official multi-primary multi-network installation guide: https://istio.io/latest/docs/setup/install/multicluster/multi-primary_multi-network/
- Istio official multi-cluster traffic management guide: https://istio.io/latest/docs/ops/configuration/traffic-management/multicluster/
- Istio official DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio official VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio official resource labels reference: https://istio.io/latest/docs/reference/config/labels/
- Istio official istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio official locality weighted distribution task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/

## Issues Found
- The east-west gateway setup only applied `samples/multicluster/expose-services.yaml`, but did not install the east-west gateway first. Updated the command block to run `samples/multicluster/gen-eastwest-gateway.sh --network network-new | istioctl install --context=new-cluster -y -f -` before applying `expose-services.yaml` in the `istio-system` namespace.
- The locality-based traffic split only configured traffic originating from `us-east-1/*`. Added matching `from: "us-west-2/*"` distribution entries so requests originating from either old or new cluster locality are routed according to the migration weights.
- The subset example used manually applied pod labels for cluster selection. Replaced this with Istio's built-in `topology.istio.io/cluster` label, which the Istio documentation explicitly supports for per-cluster `DestinationRule` subsets.
- The validation command labeled "Check cross-cluster latency" used `istioctl proxy-config log --level connection:info`, which changes Envoy logging levels rather than checking latency. Replaced it with an endpoint locality inspection command.
- The `kubectl exec deploy/sleep` validation command omitted the namespace. Added `-n myapp` to match the rest of the example.

## Review Notes
The post is technically valid after the corrections. The examples assume the old cluster was already installed into the same mesh with compatible `meshID`, cluster name, network, trust, and endpoint discovery configuration. In production, operators should also verify shared trust roots, gateway exposure controls, and application-level data migration details before shifting stateful traffic.
