# Validation Summary: How to Set Up Flagger with Istio on GKE Step by Step

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud SDK (`gcloud`)
- Kubernetes
- Istio
- Flagger
- Helm
- Prometheus
- Istio Gateway, VirtualService, and DestinationRule integration

## Sources Consulted
- Flagger install on Kubernetes: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger Istio canary deployments: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger metrics analysis: https://docs.flagger.app/main/usage/metrics
- Flagger FAQ for Istio routing behavior: https://docs.flagger.app/faq
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio GKE platform profile guidance: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Google Cloud `gcloud container clusters create` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud GKE release channels: https://cloud.google.com/kubernetes-engine/docs/how-to/release-channels
- Google Cloud GKE network policy documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- Google Cloud GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The Istio install command did not include the GKE platform profile setting. Updated it to include `--set values.global.platform=gke`, matching Istio's current GKE guidance.
- The Prometheus addon URL used Istio `release-1.22`, which is outdated for the current Istio documentation. Updated it to `release-1.29`.
- The Flagger Helm install omitted the explicit Canary CRD installation and `--set crd.create=false` setting shown in current Flagger installation documentation. Added both.
- The Flagger Canary gateway reference used a service DNS name (`public-gateway.istio-system.svc.cluster.local`) instead of Istio's gateway resource reference format. Updated it to `istio-system/public-gateway`.

## Review Notes
- The quick-start Prometheus addon is suitable for tutorials and demos; Istio documents it as not tuned for production performance or security.
- The GKE, Kubernetes, Helm, Istio, and Flagger commands and manifests are otherwise consistent with current official documentation.
