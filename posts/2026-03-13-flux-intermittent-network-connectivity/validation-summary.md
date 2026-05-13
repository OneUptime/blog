# Validation Summary: How to Configure Flux CD for Intermittent Network Connectivity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps Toolkit GitRepository, OCIRepository, and Kustomization APIs
- Prometheus Operator PrometheusRule
- kube-state-metrics Flux custom resource metrics
- go-containerregistry crane CLI
- systemd

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux `reconcile source oci` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- go-containerregistry `crane` command documentation: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The local registry cache Deployment did not expose a Kubernetes Service, and the OCIRepository pointed to `localhost:5000`. From a Flux controller pod, `localhost` refers to the controller pod itself, not the registry Deployment. Added a Service and changed the OCIRepository URL to the in-cluster service DNS name.
- The sync script used `crane pull` with a destination registry reference. `crane pull` stores image contents locally, while registry-to-registry mirroring uses `crane copy`. Replaced it with `crane copy` and added a `kubectl port-forward` step so a host-level systemd script can reach the in-cluster registry through `localhost:5000`.
- The monitoring example used a non-standard `flux_source_info` metric and subtracted an info metric value from `time()`, which would not measure source freshness. Replaced it with the documented `gotk_resource_info` readiness metric used by Flux's kube-state-metrics example.
- The section title referred to Flux Notifications while the example used Prometheus metrics. Renamed it to Flux Metrics for accuracy.
- The edge application Deployment omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added a selector and labels.
- The best-practice statement that OCI artifacts are always smaller than Git cloning was too absolute. Changed it to say OCI artifacts can be smaller and faster when bandwidth matters.
- The final monitoring best-practice mentioned source fetch age, but the corrected example monitors readiness. Updated the note to reference source readiness.

## Review Notes
The Flux API versions and fields used in the corrected examples are current: `source.toolkit.fluxcd.io/v1` for GitRepository and OCIRepository, and `kustomize.toolkit.fluxcd.io/v1` for Kustomization. The Prometheus example assumes the Flux custom resource metrics from the Flux monitoring example are installed through kube-state-metrics; without that setup, `gotk_resource_info` will not exist.
