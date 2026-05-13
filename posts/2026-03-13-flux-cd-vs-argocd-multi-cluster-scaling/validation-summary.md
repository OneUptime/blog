# Validation Summary: Flux CD vs ArgoCD: Which Scales Better for 100+ Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- GitOps
- AWS EKS

## Sources Consulted
- Flux CD GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CD Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Argo CD architecture documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD declarative setup documentation for cluster secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#clusters
- Argo CD high availability and scaling documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/

## Issues Found
- The introduction described Flux CD as a hub-and-spoke model. Flux is more accurately described here as a distributed pull model when each cluster runs its own controllers against a shared fleet repository. Updated the wording.
- The introduction said ArgoCD manages remote clusters via the ArgoCD API server. Official Argo CD architecture documentation describes the API server as serving the UI, CLI, and external API clients; reconciliation is performed by the application controller against target clusters. Updated the wording.
- The scaling table said ArgoCD needs "ArgoCD API access to all clusters." The requirement is Kubernetes API access from the Argo CD control plane to managed clusters. Updated the wording.
- The scaling table gave a fixed "~150 MB Flux controllers" resource figure. Flux controller resource usage is deployment- and configuration-dependent, so the fixed number was removed and replaced with the stable architectural point that Flux controllers run in every cluster.
- The conclusion described Flux as ideal for air-gapped clusters without qualification. Air-gapped deployments still need reachable local source endpoints such as internal Git or OCI mirrors. Updated the wording.

## Review Notes
The Flux Kustomization example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `interval`, `path`, `prune`, and `sourceRef` fields. The `flux bootstrap github` flags match the current Flux documentation. The Argo CD ApplicationSet cluster generator and cluster Secret examples match current Argo CD documentation, though newer examples often enable Go templates and use `{{.name}}` and `{{.server}}`; the existing non-Go-template syntax remains consistent with the snippet's style.
