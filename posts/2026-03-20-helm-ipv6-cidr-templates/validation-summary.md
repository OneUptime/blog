# Validation Summary: How to Handle IPv6 CIDR Ranges in Helm Chart Templates

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Helm
- Kubernetes
- Kubernetes Services
- IPv6
- dual-stack networking
- ingress-nginx annotations
- JSON Schema
- `kubectl`

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Helm `helm install` reference: https://docs.helm.sh/docs/helm/helm_install/
- Helm `helm test` reference: https://helm.sh/docs/helm/helm_test/
- Helm Chart Development Tips and Tricks (`include`): https://helm.sh/docs/v3/howto/charts_tips_and_tricks/
- Helm template function list (`contains`, `nindent`, `toYaml`): https://docs.helm.sh/docs/chart_template_guide/function_list/
- Helm chart structure and `values.schema.json` documentation: https://helm.sh/docs/topics/charts/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx project status / retirement notice: https://kubernetes.github.io/ingress-nginx/
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- OneUptime IP Monitor documentation: https://oneuptime.com/docs/monitor/ip-monitor

## Issues Found
- The description and overview claimed the post covered network policies, Service CIDR configuration, and Pod CIDR settings, but the article actually covered Service IP family settings, Helm templating, and an ingress annotation example. I corrected that scope so the technical description matches the content.
- The example values used `ipFamilies: [IPv4]`, while the Service template always rendered `ipFamilies` whenever IPv6 was enabled. In Kubernetes, `PreferDualStack` can allocate both families when `ipFamilies` is omitted, but explicitly setting only `IPv4` keeps the Service single-stack. I changed the default to `PreferDualStack`, set `ipFamilies` to `[]`, and updated the template to render `ipFamilies` only when the user explicitly sets it.
- The ingress example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not a documented ingress-nginx annotation. I replaced it with the documented `nginx.ingress.kubernetes.io/whitelist-source-range` annotation and used the RFC 3849 documentation prefix `2001:db8::/32` as the IPv6 CIDR example.
- The sample verification command used `kubectl get svc myapp`, but the template names the Service with `{{ include "mychart.fullname" . }}`, so `myapp` is not a reliable resource name. I changed the command to use a `<rendered-service-name>` placeholder.
- The schema snippet used the generic `http://json-schema.org/schema#` meta-schema URL. Helm’s current chart documentation shows `values.schema.json` examples using the draft-07 meta-schema, so I updated it to `https://json-schema.org/draft-07/schema#`.
- The example `ipv6ClusterIP` value was not used anywhere in the shown templates and could imply a Kubernetes field that does not exist by that name. I removed it from the example values block.

## Review Notes
- The IPv6 URL helper is technically correct for bare IP literals: RFC 3986 requires IPv6 host literals in URIs to be enclosed in square brackets.
- The ingress annotation example is controller-specific. Kubernetes Ingress does not define a standard IPv6 toggle annotation, and `ingress-nginx` itself is in retirement after March 2026, so production guidance should always be checked against the specific ingress controller in use.
- Local `helm` and `kubectl` binaries were not installed in this environment, so command validation was performed against current official documentation rather than live CLI help output.
