# Validation Summary: How to Use ArgoCD on Bare-Metal Kubernetes Clusters

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Kubernetes
- MetalLB
- ingress-nginx
- cert-manager
- Rancher local-path-provisioner
- Longhorn
- Rook-Ceph
- Harbor
- kubectl

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD declarative setup and proxy documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- ingress-nginx installation documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx bare-metal documentation: https://kubernetes.github.io/ingress-nginx/deploy/baremetal/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- cert-manager SelfSigned issuer documentation: https://cert-manager.io/docs/configuration/selfsigned/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- Rancher local-path-provisioner documentation: https://github.com/rancher/local-path-provisioner
- Longhorn Argo CD install documentation: https://longhorn.io/docs/latest/deploy/install/install-with-argocd/
- Longhorn default settings documentation: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/
- Rook-Ceph Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/helm-charts/
- Harbor Helm chart documentation: https://github.com/goharbor/harbor-helm

## Issues Found
- Updated the MetalLB manifest URL from `v0.14.3` to `v0.15.3` to match the current official install example.
- Added `controller.extraArgs.enable-ssl-passthrough` to the ingress-nginx Argo CD Application because the `ssl-passthrough` annotation is disabled by default unless the controller is started with that flag.
- Removed the `nginx.ingress.kubernetes.io/backend-protocol` annotation from the SSL passthrough Ingress example because ingress-nginx documents that SSL passthrough works at layer 4 and invalidates other Ingress annotations.
- Corrected the hostNetwork alternative to apply to ingress-nginx rather than the Argo CD server, using the official bare-metal host networking pattern.
- Replaced the local-path-provisioner `master` manifest URL with the current stable `v0.0.35` manifest URL.
- Updated Longhorn, Rook-Ceph, and Harbor chart target revisions to current release lines and added Harbor `externalURL`, which the Harbor chart uses for client-facing URLs and token service responses.
- Added `group: cert-manager.io` to the cert-manager `issuerRef` for clarity and consistency with cert-manager examples.
- Replaced the incorrect `argocd-cm` proxy example with `kubectl set env` on `argocd-repo-server`, because Argo CD reads standard proxy environment variables from the repository server environment.
- Changed the Argo CD HA code fence from YAML to bash and corrected the Redis HA sentence to match the official HA manifest behavior.
- Replaced the outdated "master nodes" wording with "control plane nodes".
- Clarified that `kubectl top nodes` requires metrics-server.

## Review Notes
The post is technically relevant and remains a valid bare-metal Argo CD guide after the corrections. Future improvements could include pinning exact chart patch versions for every Helm deployment instead of using wildcard version ranges.
