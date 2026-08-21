# Validation Summary: How to Sync vCluster Ingresses to a Shared Host-Cluster Ingress Controller

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- vCluster 0.36 on shared nodes
- Kubernetes Deployments, Services, Ingresses, IngressClasses, and EndpointSlices
- Kubernetes multi-tenancy and admission control
- Gateway API with imported shared Gateways
- Kubernetes ResourceQuota
- NGINX container image
- `vcluster`, `kubectl`, and `curl` command-line tools

## Sources Consulted

- [vCluster 0.36: Sync Ingresses to the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/ingresses)
- [vCluster 0.36: How synchronization works](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster 0.36: Sync IngressClasses from the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/ingress-classes)
- [vCluster 0.36: Imported Gateways and GatewayClasses](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/gateways)
- [vCluster 0.36: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [vCluster 0.36: Patching synced resources](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/patching)
- [vCluster 0.36 CLI: `vcluster create`](https://www.vcluster.com/docs/vcluster/cli/vcluster_create)
- [vCluster 0.36: Deploy configuration changes](https://www.vcluster.com/docs/vcluster/manage/deploy-changes/)
- [vCluster: Annotations and labels reference](https://www.vcluster.com/docs/vcluster/reference/annotations)
- [vCluster v0.36.1 chart defaults](https://github.com/loft-sh/vcluster/blob/v0.36.1/chart/values.yaml)
- [vCluster v0.36.1 Ingress translator](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/controllers/resources/ingresses/translate.go)
- [vCluster v0.36.1 EndpointSlice translator](https://github.com/loft-sh/vcluster/blob/v0.36.1/pkg/controllers/resources/endpointslices/translate.go)
- [Kubernetes: Namespaces](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)
- [Kubernetes: Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes: Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: Ingress and IngressClass](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: ValidatingAdmissionPolicy expression variables](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/#validation-expression)
- [Kubernetes: `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [NGINX: Current stable and mainline releases](https://nginx.org/en/download.html)
- [Docker Official Images: Current NGINX tags](https://github.com/docker-library/official-images/blob/master/library/nginx)
- [ingress-nginx: Multi-tenant Kubernetes warning](https://kubernetes.github.io/ingress-nginx/faq/#multi-tenant-kubernetes)
- [ingress-nginx: Project status and retirement notice](https://kubernetes.github.io/ingress-nginx/)

## Issues Found

- The workload manifest placed its Deployment, Service, and Ingress in `apps` without creating that namespace, so `kubectl apply -f web.yaml` would fail on a fresh tenant cluster. Added an idempotent `Namespace` document to the manifest.
- The sample used `nginx:1.29`, which remains pullable but is no longer a currently maintained Docker Official Image branch. Updated it to the current stable `nginx:1.30.4` image.
- The alternative-routing guidance implied that importing a shared Gateway alone prevents tenants from influencing one another's routes. Added the required configured per-tenant `allowedRoutes` namespace and hostname restrictions.
- The defaults explanation omitted EndpointSlices even though the inspection workflow relies on them. Added EndpointSlices to the vCluster 0.36 resources that are enabled by default and clarified that the translated Service and endpoints are made available in the control plane cluster.
- The EndpointSlice command's default table did not expose endpoint readiness despite telling the reader to verify ready endpoints. Added custom columns for endpoint addresses and `.conditions.ready`.
- The admission statement was too broad because a plain ValidatingAdmissionPolicy cannot inventory Ingresses across namespaces. Clarified that conflict evaluation requires a validating webhook or policy engine with cluster-wide state; that component receives the already translated host-side object.

## Review Notes

- vCluster 0.36.1 is the current patch release in the documented 0.36 line. The shown `vcluster create` flags are valid, but reproducing the version-specific behavior assumes a 0.36.x CLI; operators can additionally pin `--chart-version v0.36.1`.
- The `shared-nginx` value is an illustrative IngressClass name, not an instruction to deploy the retired community ingress-nginx controller. ingress-nginx's own documentation advises against using it in multi-tenant production; the post correctly requires a controller whose supported tenancy model permits sharing.
- The Ingress API remains stable but frozen. The post's recommendation to prefer Gateway API for new routing designs matches both Kubernetes and vCluster guidance.
- All external links in the post resolved to their intended official pages. The workload manifest passed `kubectl` client-side dry-run parsing, and the Ingress-sync configuration rendered successfully with the vCluster v0.36.1 Helm chart.
