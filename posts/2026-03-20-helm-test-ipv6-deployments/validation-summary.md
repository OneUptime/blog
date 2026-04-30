# Validation Summary: How to Test Helm Chart IPv6 Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm chart templating
- Helm CLI (`helm install`, `helm test`)
- Kubernetes Services
- IPv6 and dual-stack Kubernetes networking
- JSON Schema for Helm values validation
- ingress-nginx annotations
- OneUptime monitoring

## Sources Consulted
- Helm Charts documentation: https://helm.sh/docs/topics/charts/
- Helm Template Function List: https://docs.helm.sh/docs/chart_template_guide/function_list/
- Helm install command reference: https://helm.sh/docs/helm/helm_install/
- Helm test command reference: https://helm.sh/docs/helm/helm_test/
- Helm Labels and Annotations best practices: https://helm.sh/docs/chart_best_practices/labels/
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- OneUptime IP monitor documentation: https://oneuptime.com/docs/monitor/ip-monitor

## Issues Found
- The ingress example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not a documented ingress-nginx annotation. I replaced it with an accurate note that IPv6 ingress handling is controller-specific and usually configured on the ingress controller Service.
- The dual-stack install example enabled `PreferDualStack` without explicitly requesting dual-stack IP families, which conflicted with the example values and would not reliably produce the claimed result. I updated the example to set `networking.ipFamilies` to `["IPv6","IPv4"]`.
- The values example defaulted `ipFamilies` to `IPv4`, which did not align with the post's IPv6-focused configuration. I changed the default example to `IPv6` so the values structure is consistent with IPv6-enabled deployments.
- The service example used `targetPort: http` without defining a named container port anywhere in the post. I changed it to `targetPort: {{ .Values.service.port }}` so the snippet is self-contained.
- The values example included `service.ipv6ClusterIP`, which is not a Kubernetes Service field and was not used by the template. I removed it to avoid implying an invalid or supported mapping.
- The verification command assumed the Service name exactly matched the Helm release name even though the template used `mychart.fullname`. I added a standard Helm instance label and changed the `kubectl get svc` example to use label selection instead.
- The JSON Schema example used a generic schema URL and allowed invalid `ipFamilies` arrays of arbitrary length. I updated it to the draft-07 schema URL and added `minItems`, `maxItems`, and `uniqueItems` constraints to match Kubernetes dual-stack rules.

## Review Notes
- Helm and `kubectl` were not installed in the local review environment, so command verification was done against official CLI documentation rather than local `--help` output.
- Dual-stack Service behavior depends on cluster configuration. `PreferDualStack` only allocates both address families when the cluster is actually dual-stack and the CNI / Service CIDR configuration supports it.
- Helm's current charts documentation notes that some chart-topic pages are still being updated for Helm 4, but the specific template functions, schema behavior, and CLI flags used here are consistent with the current official docs.
