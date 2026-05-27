# Validation Summary: How to Run Chaos Engineering Experiments on GKE Using Chaos Mesh on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine
- GKE Standard
- Chaos Mesh
- Kubernetes custom resources
- Helm
- kubectl
- Cloud Monitoring
- gcloud CLI

## Sources Consulted
- Chaos Mesh 2.7.2 PodChaos documentation: https://chaos-mesh.org/docs/2.7.2/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh NetworkChaos documentation: https://chaos-mesh.org/docs/next/simulate-network-chaos-on-kubernetes/
- Chaos Mesh 2.7.2 StressChaos documentation: https://chaos-mesh.org/docs/2.7.2/simulate-heavy-stress-on-kubernetes/
- Chaos Mesh 2.7.2 DNSChaos documentation: https://chaos-mesh.org/docs/2.7.2/simulate-dns-chaos-on-kubernetes/
- Chaos Mesh workflow documentation: https://chaos-mesh.org/docs/create-chaos-mesh-workflow/
- Chaos Mesh scheduling documentation: https://chaos-mesh.org/docs/next/define-scheduling-rules/
- Chaos Mesh v2.7.0 Helm values: https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/v2.7.0/helm/chaos-mesh/values.yaml
- Chaos Mesh v2.7.0 PodChaos CRD: https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/v2.7.0/config/crd/bases/chaos-mesh.org_podchaos.yaml
- Chaos Mesh v2.7.0 Schedule CRD: https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/v2.7.0/config/crd/bases/chaos-mesh.org_schedules.yaml
- GKE Autopilot security measures: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-security
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Load Balancing metrics documentation: https://cloud.google.com/load-balancing/docs/metrics
- CNCF Chaos Mesh project page: https://www.cncf.io/projects/chaosmesh/

## Issues Found
- The prerequisites said the guide worked on GKE Standard or Autopilot. Chaos Mesh's default chaos-daemon runs privileged and mounts the container runtime socket, while GKE Autopilot blocks privileged containers and general hostPath access unless a workload is explicitly allowlisted. Changed the prerequisite to GKE Standard and added the reason.
- The introduction described Chaos Mesh as running controllers and sidecars. The Helm install deploys controllers, a node-level chaos-daemon, dashboard, and supporting services such as Chaos DNS Server. Updated the wording to avoid implying ordinary sidecar injection.
- The scheduled PodChaos example used an inline `scheduler` field under `PodChaos`. Current Chaos Mesh scheduling uses a separate `Schedule` custom resource with `spec.schedule`, `spec.type`, and the lower-camel experiment spec such as `podChaos`. Rewrote the example as a `Schedule` that creates `PodChaos` runs every minute.
- The workflow example comment said it included safety checks, but the YAML only sequences chaos experiments and does not include a `StatusCheck` node. Adjusted the comment to describe the actual workflow.
- The Cloud Monitoring command passed `--policy-from-file=-` through stdin. The documented flag expects a JSON or YAML file path. Changed the snippet to write `chaos-alert-policy.json` and pass that file to `gcloud monitoring policies create`.

## Review Notes
The YAML examples parse successfully after the corrections. `helm` and `kubectl` are not installed in this workspace, so the commands were validated against official documentation rather than executed locally.
