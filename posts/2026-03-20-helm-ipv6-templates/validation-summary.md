# Validation Summary: How to Template IPv6 Addresses in Helm Charts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm chart templating
- Kubernetes Services
- IPv6 and dual-stack networking in Kubernetes
- Go templates and Helm template functions
- ingress-nginx annotations
- JSON Schema for Helm values validation

## Sources Consulted
- Helm template functions and pipelines: https://helm.sh/docs/chart_template_guide/functions_and_pipelines/
- Helm template function list: https://docs.helm.sh/docs/chart_template_guide/function_list/
- Helm charts and schema files: https://helm.sh/docs/topics/charts/
- Helm install command reference: https://docs.helm.sh/docs/helm/helm_install/
- Helm test command reference: https://helm.sh/docs/helm/helm_test/
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service ClusterIP allocation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- ingress-nginx annotation reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The description and overview claimed CIDR block handling, but the post only demonstrated IPv6 address formatting and Service dual-stack settings. I removed the unsupported CIDR wording.
- The example defaults set `ipFamilies: [IPv4]` and the template rendered `ipFamilies` whenever IPv6 was enabled. Kubernetes documents `ipFamilies` as optional and as a selector for family choice or order; forcing `["IPv4"]` prevents dual-stack allocation. I changed the default policy to `PreferDualStack`, made `ipFamilies` optional, and rendered it only when provided.
- The values example exposed `service.ipv6ClusterIP`, but the template never used it. I removed the unused field so the example no longer implies functionality the chart does not implement.
- The ingress example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not a documented ingress-nginx annotation. I replaced the example with an empty annotations map.
- The verification command assumed the Service name was `myapp`, but the template uses `{{ include "mychart.fullname" . }}`, so the actual Service name depends on the chart helper output. I changed the command to use `<rendered-service-name>`.
- The schema snippet used a generic `$schema` URI and did not validate `networking.ipv6.enabled`. I updated it to the draft-07 schema URI shown in Helm documentation and added boolean validation for the `enabled` field.

## Review Notes
- The local environment did not have `helm` or `kubectl` installed, so command validation was done against official CLI documentation rather than local `--help` output.
- `ipFamilyPolicy: PreferDualStack` is a good default for an IPv6-enabled path because Kubernetes falls back to single-stack behavior on clusters that do not support dual-stack.
- `networking.ipFamilies` should only be set when the chart needs to force family order, such as `[IPv6, IPv4]` for an IPv6-primary Service.
- `helm test <release>` is a valid command, but it only runs if the chart defines Helm test hooks; this post does not include test hook examples.
- External links checked during review resolved successfully, including `https://oneuptime.com` and the author's GitHub profile.
