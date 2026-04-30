# Validation Summary: How to Configure Service ipFamilyPolicy in Helm Charts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- Kubernetes Services
- Kubernetes dual-stack networking
- IPv6
- ingress-nginx

## Sources Consulted
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- Helm chart file structure and `values.schema.json`: https://helm.sh/docs/v3/topics/charts/
- Helm template function list (`contains`, `toYaml`, `nindent`): https://docs.helm.sh/docs/chart_template_guide/function_list/
- Helm install command reference: https://docs.helm.sh/docs/helm/helm_install/
- Helm test command reference: https://helm.sh/docs/helm/helm_test/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The original `ingress` example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not a documented ingress-nginx annotation. I replaced it with an empty `annotations` map to avoid publishing a non-existent configuration key.
- The original `service.ipv6ClusterIP` value was unused and implied a Kubernetes Service field that does not exist as written. I removed it because the post’s actual Service configuration is controlled by `ipFamilyPolicy` and optional `ipFamilies`.
- The original values example defaulted `ipFamilies` to `["IPv4"]` while the install example enabled `PreferDualStack`. I changed the example to use an empty default list and made the template render `ipFamilies` only when explicitly set, which matches Kubernetes dual-stack behavior more accurately.
- The original Service template used `targetPort: http`, which only works if the backing Pods define a named container port `http`. I changed it to a numeric `targetPort` based on the configured service port so the example is self-contained.
- The original verification command used `kubectl get svc myapp`, but the template names the Service with `{{ include "mychart.fullname" . }}`, so `myapp` is not reliably the Service name. I changed the example to `kubectl describe svc <service-name>`.

## Review Notes
- `PreferDualStack` allocates both IPv4 and IPv6 Service IPs only on clusters that actually have dual-stack enabled. On single-stack clusters it falls back to single-stack behavior; `RequireDualStack` fails instead.
- The JSON schema example is technically valid, but in a real Helm chart it should live in a file named `values.schema.json`.
