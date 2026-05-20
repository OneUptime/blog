# Validation Summary: How to Use ArgoCD with K0s

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k0s
- Kubernetes
- Argo CD
- ApplicationSet
- ingress-nginx
- MetalLB
- OpenEBS
- Kubernetes StorageClass and PodDisruptionBudget APIs

## Sources Consulted
- k0s Quick Start Guide: https://docs.k0sproject.io/head/install/
- k0s CLI docs for `install controller`, `install worker`, and `token create`: https://docs.k0sproject.io/head/cli/
- k0s networking documentation: https://docs.k0sproject.io/stable/networking/
- k0s configuration reference: https://docs.k0sproject.io/v1.35.4+k0s.0/configuration/
- k0s Helm extensions documentation: https://docs.k0sproject.io/v1.24.9+k0s.0/helm-charts/
- k0s OpenEBS storage documentation: https://docs.k0sproject.io/head/examples/openebs/
- k0s Autopilot documentation: https://docs.k0sproject.io/head/autopilot/
- Argo CD installation and getting started documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/
- Argo CD CLI reference for `argocd cluster add`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- ingress-nginx deployment and SSL passthrough documentation: https://kubernetes.github.io/ingress-nginx/deploy/ and https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- MetalLB installation documentation: https://metallb.io/installation/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The post implied etcd is always the bundled datastore. Updated the wording to mention datastore components such as etcd or SQLite, matching k0s defaults for multi-node and single-node clusters.
- The ingress-nginx manifest version was stale and the Argo CD SSL passthrough example omitted the required `--enable-ssl-passthrough` controller argument. Updated the manifest URL and added the required deployment patch.
- The Argo CD ingress used `backend-protocol: HTTPS` together with SSL passthrough. Removed the unnecessary annotation and used the service port name `https`, following Argo CD's ingress guidance.
- The MetalLB install manifest used an older version. Updated it to the current documented manifest version.
- The OpenEBS Helm repository, chart version, and values were outdated for current OpenEBS/k0s guidance. Updated the repository URL, chart version, replicated-storage disablement, and k0s kubelet directory values.
- The "Host Path Provisioner" example used `kubernetes.io/no-provisioner`, which is a static local volume StorageClass and does not dynamically provision host-path volumes. Replaced it with k0s's bundled OpenEBS local storage extension.
- The PodDisruptionBudget example could block drains on a standard single-replica Argo CD install. Added the HA replica caveat before the PDB example.
- The ApplicationSet selector expected clusters labeled `distribution: k0s`, but the `argocd cluster add` commands did not add that label. Added `--label distribution=k0s` to both commands.

## Review Notes
- ingress-nginx documentation now notes project retirement/best-effort maintenance after March 2026. The example remains technically valid because the official artifacts and documentation are still available, but new production deployments should evaluate currently maintained ingress or Gateway API controllers.
