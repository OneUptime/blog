# Validation Summary: How to Use K3s with GitOps

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- K3s (Lightweight Kubernetes distribution)
- Kubernetes
- ArgoCD (GitOps continuous delivery)
- Flux CD (GitOps toolkit)
- Kustomize
- Helm
- Traefik (ingress)
- Sealed Secrets (Bitnami Labs)
- Mozilla SOPS
- Flagger (progressive delivery / canary deployments)
- Prometheus / Grafana (kube-prometheus-stack)
- Velero (backup/restore)
- Flux Image Automation (ImageRepository, ImagePolicy, ImageUpdateAutomation)
- ApplicationSets (ArgoCD)

## Sources Consulted
- K3s official documentation — https://docs.k3s.io/
- ArgoCD official documentation — https://argo-cd.readthedocs.io/
- Flux CD documentation — https://fluxcd.io/flux/
- Flux Image Automation API reference (ImageRepository v1) — https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Kustomization API reference — https://fluxcd.io/flux/components/kustomize/kustomization/
- Flux HelmRelease API reference — https://fluxcd.io/flux/components/helm/helmreleases/
- Traefik v3 CRD reference / migration guide (traefik.containo.us → traefik.io) — https://doc.traefik.io/traefik/migration/v2-to-v3/
- Bitnami Sealed Secrets releases (v0.24.5) — https://github.com/bitnami-labs/sealed-secrets/releases
- Flagger Canary API documentation — https://docs.flagger.app/usage/how-it-works
- Velero Schedule API — https://velero.io/docs/
- Prometheus Operator ServiceMonitor — https://prometheus-operator.dev/

## Issues Found

1. **Traefik IngressRoute apiVersion was outdated.** In the Flagger Canary configuration (Canary `ingressRef`), the post used `traefik.containo.us/v1alpha1`. K3s now ships with Traefik v3 (starting with K3s v1.29+), which removed the `traefik.containo.us` API group in favor of `traefik.io`. Updated to `traefik.io/v1alpha1`, which is the current Traefik v3 CRD API group.

2. **Broken markdown heading.** The "Resource Management for K3s" subsection under "Best Practices" was missing the `### ` prefix, so it rendered as plain body text rather than a heading consistent with its sibling subsections ("Repository Organization", "Security Considerations"). Added the `### ` heading marker to restore the intended structure.

## Review Notes

- **Flux Image Automation API** (`image.toolkit.fluxcd.io/v1`) is correct — these CRDs were promoted to v1 in recent Flux releases, replacing v1beta2.
- **Flux Kustomization, GitRepository, and HelmRelease apiVersions** (`kustomize.toolkit.fluxcd.io/v1`, `source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`) are correct for current Flux 2.x releases.
- **K3s claims are accurate**: single binary under 100MB, ~512MB minimum RAM, SQLite default (via Kine), ARM support, simplified single-command install — all match official K3s docs.
- **Sealed Secrets v0.24.5** is a valid published release; install/kubeseal commands match official docs.
- **ArgoCD Application/ApplicationSet manifests** (`argoproj.io/v1alpha1`) match upstream CRDs.
- **Flagger Canary** uses `flagger.app/v1beta1`, which is still the current stable API version.
- **K3s etcd snapshot config keys** (`etcd-snapshot-schedule-cron`, `etcd-snapshot-retention`, `etcd-snapshot-dir`) match K3s server configuration documentation.
- **kube-prometheus-stack chart version 55.5.0** referenced in two places is an old release. While still installable, readers may want to use a newer chart version for current Kubernetes compatibility. Not flagged as an error since pinning to a specific version is a legitimate choice.
- **Flagger metricsServer reference** (`http://prometheus.monitoring:9090`) assumes a particular Prometheus service DNS and would need to match the user's actual install — this is appropriate for an illustrative example.
