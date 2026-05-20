# Validation Summary: How to Use ArgoCD with OVHcloud Managed Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes
- OVHcloud Managed Kubernetes Service
- OVHcloud Public Cloud Load Balancer / Octavia
- OVHcloud Managed Private Registry / Harbor
- ingress-nginx
- cert-manager
- Cinder CSI persistent volumes

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/release-2.2/getting_started/
- Argo CD declarative repository Secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ingress documentation for ingress-nginx: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/ingress/
- Argo CD ApplicationSet list generator documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/applicationset/Generators-List/
- ingress-nginx TLS and SSL passthrough documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx Helm deployment documentation: https://kubernetes.github.io/ingress-nginx/deploy/
- OVHcloud Managed Kubernetes architecture documentation: https://help.ovhcloud.com/csm/en-ca-public-cloud-kubernetes-understanding-mks-architecture?id=kb_article_view&sysparm_article=KB0075092
- OVHcloud LoadBalancer exposure documentation: https://help.ovhcloud.com/csm/en-public-cloud-kubernetes-using-lb?id=kb_article_view&sysparm_article=KB0050019
- OVHcloud Public Cloud Load Balancer documentation: https://help.ovhcloud.com/csm/en-public-cloud-kubernetes-expose-applications-using-load-balancer?id=kb_article_view&sysparm_article=KB0062878
- OVHcloud source IP / proxy protocol documentation: https://help.ovhcloud.com/csm/it-public-cloud-kubernetes-getting-source-ip-behind-loadbalancer?id=kb_article_view&sysparm_article=KB0055067
- OVHcloud persistent volume and storage class documentation: https://help.ovhcloud.com/csm/en-ie-public-cloud-kubernetes-persistent-volumes?id=kb_article_view&sysparm_article=KB0049925
- OVHcloud Managed Private Registry documentation: https://www.ovhcloud.com/en/public-cloud/managed-private-registry/
- OVHcloud Helm chart registry documentation: https://help.ovhcloud.com/csm/asia-public-cloud-private-registry-helm-charts?id=kb_article_view&sysparm_article=KB0050379
- OVHcloud ChartMuseum to OCI migration documentation: https://help.ovhcloud.com/csm/en-public-cloud-private-registry-migrate-helm-charts?id=kb_article_view&sysparm_article=KB0058869
- OVHcloud Public Cloud pricing documentation: https://www.ovhcloud.com/en/public-cloud/prices/
- OVHcloud Kubernetes reset documentation: https://help.ovhcloud.com/csm/en-gb-public-cloud-kubernetes-reset-cluster?id=kb_article_view&sysparm_article=KB0049933
- OVHcloud Managed Kubernetes backup and restore documentation index: https://help.ovhcloud.com/csm/en-gb-documentation-public-cloud-containers-orchestration-managed-kubernetes-k8s-configuration-backup-and-restore?id=kb_browse_cat&kb_category=0a47b2bcfc7d361c476bbf94cb53f119&kb_id=574a8325551974502d4c6e78b7421938
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/

## Issues Found
- The opening GDPR/data-sovereignty wording implied that compliance and European data residency are automatic. Updated it to state that EU residency depends on choosing EU-based clusters, registries, and Git repositories.
- The pricing bullets and internal bandwidth section were too broad. Updated them to match OVHcloud's documented Public Cloud pricing model, where traffic inclusion depends on the service and region.
- The control plane pricing claim said users only pay for worker nodes. Updated it to distinguish the Free MKS control-plane option from separately billed worker nodes and related resources.
- The direct Argo CD LoadBalancer Service enabled OVHcloud proxy protocol even though the Argo CD server backend was not configured to consume proxy-protocol headers. Removed that annotation from the direct Service example.
- The ingress-nginx Argo CD Application enabled `use-proxy-protocol` without configuring the OVHcloud load balancer to send proxy-protocol traffic, and it used SSL passthrough without enabling the controller flag. Added the current Octavia proxy-protocol annotation, `externalTrafficPolicy: Local`, `real-ip-header`, and `enable-ssl-passthrough`.
- The Harbor Helm chart section presented the legacy ChartMuseum `/chartrepo` endpoint as the primary approach. Updated the primary example to Argo CD's OCI Helm repository Secret format and moved ChartMuseum to a legacy-only note because Harbor ChartMuseum is deprecated and removed in newer Harbor versions.
- The cert-manager Application used outdated `v1.14.x` and `installCRDs: true`. Updated it to supported cert-manager `v1.20.2` and the current `crds.enabled: true` Helm value.
- The multi-region wording implied that deployments are straightforward without noting cluster registration. Clarified that each target region needs its own cluster registered with Argo CD.
- The etcd backup section claimed OVHcloud automatically backs up etcd and that Argo CD Application resources are covered that way. Replaced it with guidance to keep desired state in Git and use Kubernetes backup tooling when restore workflows are required.

## Review Notes
- All YAML snippets in the post were parsed successfully after the fixes.
- The direct Argo CD LoadBalancer example exposes Argo CD without an Ingress controller. It is technically valid, but a production deployment should still add DNS, TLS certificate lifecycle management, SSO/RBAC hardening, and network access controls.
