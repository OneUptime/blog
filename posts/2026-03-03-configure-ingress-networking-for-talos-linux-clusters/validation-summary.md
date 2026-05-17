# Validation Summary: How to Configure Ingress Networking for Talos Linux Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Ingress (networking.k8s.io/v1)
- MetalLB (v0.14.5)
- Nginx ingress controller (ingress-nginx Helm chart)
- Traefik (Helm chart)
- cert-manager (v1.14.0)
- Let's Encrypt (ACME HTTP-01)
- Helm
- kubectl

## Sources Consulted
- MetalLB installation docs: https://metallb.universe.tf/installation/
- MetalLB v0.14.5 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
- ingress-nginx Helm chart: https://kubernetes.github.io/ingress-nginx
- Traefik Helm chart values: https://github.com/traefik/traefik-helm-chart
- cert-manager v1.14 release: https://github.com/cert-manager/cert-manager/releases/tag/v1.14.0
- Kubernetes Ingress API reference (networking.k8s.io/v1)
- cert-manager ClusterIssuer reference: https://cert-manager.io/docs/configuration/acme/

## Issues Found
No technical issues found.

Verifications performed:
- MetalLB v0.14.5 native manifest URL is valid and current for that release.
- MetalLB pods carry the `app=metallb` label (both controller deployment and speaker DaemonSet), so the `kubectl wait --selector=app=metallb` command will match.
- `IPAddressPool` and `L2Advertisement` use the correct `metallb.io/v1beta1` API.
- `ingress-nginx` Helm repo URL (https://kubernetes.github.io/ingress-nginx) and chart name are correct.
- Traefik Helm repo URL (https://traefik.github.io/charts) is correct.
- Ingress resources use the current stable `networking.k8s.io/v1` API with proper `ingressClassName`, `pathType`, and `backend.service` structure.
- cert-manager `apiVersion: cert-manager.io/v1` and `ClusterIssuer` schema are correct, including the `solvers[].http01.ingress.class` field (still supported by cert-manager v1.14, though `ingressClassName` is the newer preferred form).
- cert-manager v1.14.0 manifest URL is correct.
- Annotations used (`nginx.ingress.kubernetes.io/rewrite-target`, `nginx.ingress.kubernetes.io/ssl-redirect`, `cert-manager.io/cluster-issuer`) are all valid.
- `externalTrafficPolicy: Local` rationale (source IP preservation, MetalLB L2 compatibility) matches official MetalLB/Kubernetes guidance.

## Review Notes
- The Traefik install sets `ports.web.port=8000` and `ports.websecure.port=8443`. These are already the default container ports in the Traefik Helm chart, so the `--set` flags are redundant. They are not incorrect — the chart still exposes service ports 80/443 via `exposedPort` defaults — but readers may incorrectly assume this snippet customizes the service-facing ports.
- The cert-manager `solvers[].http01.ingress.class: nginx` field is the legacy form. Newer cert-manager versions prefer `ingressClassName: nginx`. Both are still supported in v1.14, but a future update could switch to `ingressClassName` for forward compatibility.
- The `kubectl wait` commands for MetalLB and cert-manager rely on pods already being scheduled when the wait starts. In practice this is usually fine, but on slow clusters it can race with pod creation. Not a technical error.
- MetalLB v0.14.5 is from January 2024; newer releases (e.g., v0.15.x) are available as of the validation date but the pinned version still works correctly.
