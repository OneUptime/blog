# Validation Summary: How to Configure Flagger Linkerd TrafficSplit for Canary

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Flagger
- Linkerd
- Linkerd Viz
- Linkerd SMI extension
- Service Mesh Interface TrafficSplit
- Kubernetes
- kubectl
- Prometheus metrics

## Sources Consulted
- Flagger Linkerd Canary Deployments: https://docs.flagger.app/main/tutorials/linkerd-progressive-delivery
- Flagger How It Works: https://docs.flagger.app/usage/how-it-works
- Flagger Deployment Strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Flagger Linkerd metrics observer source: https://github.com/fluxcd/flagger/blob/main/pkg/metrics/observers/linkerd.go
- Linkerd Traffic Split documentation: https://linkerd.io/2/features/traffic-split/
- Linkerd Progressive Delivery documentation: https://linkerd.io/2/tasks/flagger/

## Issues Found
- The prerequisites mentioned Linkerd Viz but omitted the Linkerd SMI extension, which is required for TrafficSplit support in modern Linkerd installs. Updated the prerequisite and added a deprecation note for TrafficSplit/linkerd-smi.
- The traffic flow wording implied server-side interception. Linkerd's routing is applied on the client side, and external non-meshed traffic is not shifted unless it enters through a meshed ingress or gateway. Updated the explanation accordingly.
- The promotion progression incorrectly described promotion as routing 100% to canary before updating primary. Flagger promotes by copying the canary spec to the primary deployment, routing traffic back to primary, and scaling down canary. Updated the progression note.
- The `portDiscovery` explanation said Flagger copies all container ports. Flagger discovers additional target workload ports while excluding the configured canary service port and mesh sidecar ports. Updated the description.
- The Linkerd built-in success-rate metric was described as using `classification="success"`. Flagger's Linkerd query treats `classification!="failure"` as successful. Updated the metric description.

## Review Notes
TrafficSplit and the `linkerd-smi` extension are deprecated in current Linkerd releases. The post remains technically relevant for Flagger's Linkerd TrafficSplit integration, but future content should consider Linkerd's Gateway API HTTPRoute-based routing path.
