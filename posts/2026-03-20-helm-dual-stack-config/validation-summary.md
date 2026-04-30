# Validation Summary: How to Handle Dual-Stack Configuration in Helm Charts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- Kubernetes Services
- IPv4/IPv6 dual-stack networking
- ingress-nginx annotations
- JSON Schema for Helm values validation

## Sources Consulted
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes Service ClusterIP allocation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Helm template function list: https://helm.sh/docs/chart_template_guide/function_list/
- Helm install command: https://helm.sh/docs/helm/helm_install/
- Helm test command: https://helm.sh/docs/helm/helm_test/
- Helm chart schema files: https://helm.sh/docs/topics/charts/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The values example defined `service.ipv6ClusterIP`, but Kubernetes Services use `clusterIP` and `clusterIPs`; there is no `ipv6ClusterIP` field. I removed that field so the example values contract is valid.
- The post defaulted `networking.ipFamilies` to `["IPv4"]` while the install example only set `ipFamilyPolicy=PreferDualStack`. That combination would not reflect the claimed dual-stack behavior. I changed the default to an empty list and updated the template to render `spec.ipFamilies` only when explicitly provided.
- The ingress example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not listed in the official ingress-nginx annotation reference. I replaced it with a generic controller-specific annotations placeholder.
- The schema example used a generic JSON Schema URL. Helm’s chart schema documentation shows `values.schema.json` examples using the draft-07 meta-schema, so I updated the example accordingly.

## Review Notes
- Dual-stack behavior in Kubernetes is driven by cluster networking and Service configuration. External dual-stack exposure for ingress traffic still depends on the ingress controller and the underlying Service or load balancer support.
- The corrected examples align with the current Helm and Kubernetes documentation reviewed on April 30, 2026.
