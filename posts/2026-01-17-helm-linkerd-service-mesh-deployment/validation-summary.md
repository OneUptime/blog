# Validation Summary: Deploying Linkerd Service Mesh with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd
- Helm
- Kubernetes
- Linkerd Viz
- Linkerd SMI / TrafficSplit
- Linkerd authorization policy
- Prometheus
- Grafana
- mTLS certificates with step CLI

## Sources Consulted
- Linkerd Helm installation documentation: https://linkerd.io/2.18/tasks/install-helm/
- Linkerd mTLS certificate generation documentation: https://linkerd.io/2.18/tasks/generate-certificates/
- Linkerd supported Kubernetes versions: https://linkerd.io/2-edge/reference/k8s-versions/
- Linkerd authorization policy reference: https://linkerd.io/2.18/reference/authorization-policy/
- Linkerd service profile reference: https://linkerd.io/2.18/reference/service-profiles/
- Linkerd SMI extension documentation: https://linkerd.io/2.18/tasks/linkerd-smi/
- Linkerd traffic shifting documentation: https://linkerd.io/2-edge/tasks/traffic-shifting/
- Linkerd Grafana documentation: https://linkerd.io/2.18/tasks/grafana/
- Linkerd multicluster installation documentation: https://linkerd.io/2.18/tasks/installing-multicluster/
- Linkerd control-plane Helm values: https://raw.githubusercontent.com/linkerd/linkerd2/main/charts/linkerd-control-plane/values.yaml
- Linkerd control-plane HA Helm values: https://raw.githubusercontent.com/linkerd/linkerd2/main/charts/linkerd-control-plane/values-ha.yaml
- Linkerd Viz Helm values: https://raw.githubusercontent.com/linkerd/linkerd2/main/viz/charts/linkerd-viz/values.yaml

## Issues Found
- The prerequisites hard-coded Kubernetes 1.21+, which is no longer broadly accurate for current Linkerd releases. Changed it to instruct readers to check support for their chosen Linkerd release.
- The certificate section created Kubernetes secrets that were not used by the later Helm values. Simplified it to namespace preparation and used Helm `--set-file` values for the trust anchor, issuer certificate, and issuer key, matching Linkerd Helm documentation.
- The control-plane Helm values used `identity.issuer.scheme: kubernetes.io/tls` while the install command did not rely on a pre-created TLS issuer secret. Changed the example to `linkerd.io/tls` and added issuer certificate/key `--set-file` flags.
- The control-plane values used a top-level `resources` key for controller resources. Changed it to `controllerResources`, matching the Linkerd chart values.
- The Viz values used unsupported Grafana keys and a non-existent `prometheusRetention` key. Replaced them with `grafana.url` and `prometheus.args.storage.tsdb.retention.time`.
- The SMI Helm install used the wrong Helm repository alias. Added the official `linkerd-smi` repo and changed the chart reference to `linkerd-smi/linkerd-smi`.
- The TrafficSplit example used `split.smi-spec.io/v1alpha1`; updated it to `split.smi-spec.io/v1alpha2` as shown in current Linkerd SMI docs.
- The Grafana instructions assumed a `grafana` service in the `linkerd-viz` namespace. Updated them to install Grafana with the Linkerd dashboard values and port-forward the Grafana service in the `grafana` namespace.
- The HA values used invalid `destination.resources` and `proxyInjector.resources` keys. Changed them to `destinationResources` and `proxyInjectorResources`.
- The multicluster Helm example referenced the stable repo alias for a chart documented through the edge chart flow. Changed it to `linkerd-edge/linkerd-multicluster`.
- The multicluster linking examples used `linkerd multicluster link`; updated them to the current `linkerd multicluster link-gen` command.
- The architecture diagram implied Grafana is part of the Viz extension. Changed the diagram to show Grafana as external.

## Review Notes
ServiceProfiles and SMI TrafficSplit are still supported but are legacy paths in current Linkerd. Linkerd documentation recommends Gateway API-based dynamic request routing for new traffic shifting work.
