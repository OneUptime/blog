# Validation Summary: How to Deploy KServe on Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- KServe (v0.14.1) — Kubernetes-native model inference platform
- Rancher (Kubernetes platform)
- Helm 3 (OCI registry charts)
- Istio (1.20.4) — service mesh / ingress for KServe Serverless mode
- Knative Serving (1.13.1) via Knative Operator (v1.14.5)
- cert-manager (v1.15.1)
- Longhorn (storage class) and standard Kubernetes resources (PVC, Ingress, ServiceMonitor, CronJob)
- Prometheus Operator (`monitoring.coreos.com/v1` ServiceMonitor)

## Sources Consulted
- KServe official quick install script (release-0.14): https://raw.githubusercontent.com/kserve/kserve/release-0.14/hack/quick_install.sh
- KServe install script (release-0.18): https://raw.githubusercontent.com/kserve/kserve/release-0.18/hack/kserve-install.sh
- KServe dependency manifest (release-0.18 `kserve-deps.env`): https://raw.githubusercontent.com/kserve/kserve/release-0.18/kserve-deps.env
- KServe GitHub releases page: https://github.com/kserve/kserve/releases
- KServe Helm OCI charts: `oci://ghcr.io/kserve/charts/kserve` and `oci://ghcr.io/kserve/charts/kserve-crd`
- Knative Operator releases: https://github.com/knative/operator/releases
- Istio Helm charts: https://istio-release.storage.googleapis.com/charts
- cert-manager (jetstack) Helm repo: https://charts.jetstack.io

## Issues Found
- **Step 1 Helm install was fundamentally broken.** The original used `helm repo add stable https://charts.helm.sh/stable` (the legacy "stable" Helm repository, which was officially deprecated in November 2020 and is no longer maintained) and installed a placeholder chart `stable/chart-name` — which does not exist and would never install KServe. KServe is published on an OCI registry (`oci://ghcr.io/kserve/charts/kserve` and `oci://ghcr.io/kserve/charts/kserve-crd`) and requires cert-manager, Istio (for the default Serverless mode) and Knative Serving as prerequisites. Step 1 was rewritten to install all four components with the version pins used by the upstream KServe v0.14.1 quick-install script (Istio 1.20.4, cert-manager v1.15.1, Knative Operator v1.14.5 deploying Knative Serving 1.13.1, KServe v0.14.1), plus a note about RawDeployment mode for users who want to avoid the Knative/Istio dependency.
- **Conclusion contained duplicated title text** ("Deploying How to Deploy KServe on Rancher on Rancher provides..."). Fixed to "Deploying KServe on Rancher provides...".
- **Introduction contained the same title-as-noun-phrase repetition** ("This guide covers How to Deploy KServe on Rancher in a production Rancher environment..."). Reworded to "This guide covers deploying KServe in a production Rancher environment...".
- **Prerequisites did not list KServe's actual dependencies.** Added an explicit note that cert-manager, Istio and Knative Serving are required and are installed in Step 1, plus the Kubernetes 1.24+ floor that the upstream install script enforces (`if [ "$(get_kube_version)" -lt 24 ]; then ... exit 1; fi`).

## Review Notes
- The post is structurally a generic Kubernetes deployment template — Steps 2 (PVC), 3 (Ingress), 4 (Secret), 6 (ServiceMonitor) and 7 (CronJob) use placeholder names like `service-name` / `service-monitor` rather than KServe-specific resources (`InferenceService`, the `kserve-controller-manager` service, `kserve-webhook-server-cert`, etc.). The YAML and shell snippets in those sections are syntactically valid Kubernetes manifests and would apply cleanly to any cluster, so they are not technically incorrect — but a future revision should replace them with KServe-native examples (e.g. an `InferenceService` deploying a sklearn or huggingface predictor, KServe's built-in Istio VirtualService rather than a hand-rolled Ingress, and the KServe controller's existing `/metrics` endpoint for the ServiceMonitor selector). I deliberately did not rewrite these sections per the validation instructions ("only fix technical errors, do not restructure").
- KServe v0.14.1 was the latest stable when these install commands were verified against the upstream quick-install script. As of May 2026, KServe v0.18.0 is the latest stable (released 2026-04-29), which bumps the dependency stack to Istio 1.27.1, cert-manager v1.17.0 and Knative 1.21.1. Readers deploying today should consider pinning to v0.18.0 with those updated dependency versions; the install command shape (OCI charts at `oci://ghcr.io/kserve/charts/kserve{,-crd}`) is unchanged.
- The `release: prometheus` label on the ServiceMonitor in Step 6 is the convention used by the kube-prometheus-stack Helm chart's default `serviceMonitorSelector`, which is correct for most Rancher monitoring installations.
- The Rancher project label `field.cattle.io/projectId` in the integration section is the correct annotation/label key Rancher uses to associate a namespace with a project.
