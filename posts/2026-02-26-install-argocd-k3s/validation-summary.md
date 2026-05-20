# Validation Summary: How to Install ArgoCD on K3s Lightweight Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- K3s
- Kubernetes
- Argo CD
- Traefik IngressRoute and Kubernetes Ingress
- Rancher system-upgrade-controller
- containerd

## Sources Consulted
- K3s requirements: https://docs.k3s.io/installation/requirements
- K3s packaged components: https://docs.k3s.io/installation/packaged-components
- K3s automated upgrades: https://docs.k3s.io/upgrades/automated
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD FAQ for reconciliation polling: https://argo-cd.readthedocs.io/en/latest/faq/
- Traefik IngressRoute documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Kubernetes Ingress documentation: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/ingress/

## Issues Found
- Corrected the K3s resource claim from a 512MB control-plane requirement to the current documented minimum of 2 CPU cores and 2GB RAM for server nodes, with 512MB applying to agent nodes.
- Changed the guide from describing itself as production-ready to a practical setup because the standard Argo CD `install.yaml` bundle is documented as non-HA and not recommended for production use.
- Updated Argo CD installation to use `kubectl apply --server-side --force-conflicts`, matching current Argo CD installation guidance for the stable manifests.
- Reworked the Traefik IngressRoute example to use the current `traefik.io/v1alpha1` API group and Argo CD's documented Traefik pattern: terminate TLS at Traefik, set `server.insecure: "true"`, forward HTTP on port 80, and use `scheme: h2c` for the gRPC route.
- Added an `IngressRouteTCP` TLS passthrough example because `tls.passthrough` is not valid on the HTTP `IngressRoute` resource shown originally.
- Updated the standard Kubernetes Ingress example to route to the Argo CD HTTP service port and removed the non-Traefik SSL passthrough annotation.
- Added `sudo` to the Argo CD CLI installation commands because `/usr/local/bin` normally requires elevated permissions.
- Changed JSON resource patch operations from `replace` to `add`, because the current Argo CD stable manifests do not define `resources` fields on those containers.
- Updated `timeout.reconciliation` from a bare numeric string to `10m`, matching Argo CD's documented duration-style examples.
- Clarified that Argo CD core install requires CLI core mode because it does not include the API server or UI.
- Corrected `argocd cluster add` examples to use kubeconfig context names rather than implying arbitrary cluster aliases can be passed as the positional argument.
- Updated the system-upgrade-controller install command to include both `crd.yaml` and `system-upgrade-controller.yaml`, as required by current K3s documentation.
- Replaced stale concrete K3s version examples with a `<supported-version>` placeholder to avoid recommending an outdated Kubernetes/K3s release.
- Replaced the `argocd:latest` pre-pull example with a command that pulls the image actually used by the deployed `argocd-server` deployment.

## Review Notes
The post is technically relevant and contains substantial commands and Kubernetes configuration. The remaining examples are intentionally lightweight and suitable for a tutorial, but a future production-focused version should cover Argo CD HA manifests, persistent storage and backup strategy, real DNS, certificate management, RBAC hardening, and K3s datastore choices.
