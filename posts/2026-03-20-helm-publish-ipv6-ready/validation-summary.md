# Validation Summary: How to Publish IPv6-Ready Helm Charts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- Kubernetes Services
- IPv6
- Dual-stack networking
- JSON Schema
- ingress-nginx
- OneUptime

## Sources Consulted
- Helm chart values best practices: https://docs.helm.sh/docs/chart_best_practices/values/
- Helm chart structure and `values.schema.json`: https://helm.sh/docs/topics/charts/
- Helm template function reference (`contains`, `toYaml`, `nindent`): https://docs.helm.sh/docs/chart_template_guide/function_list/
- Helm `install` command reference: https://docs.helm.sh/docs/helm/helm_install/
- Helm `test` command reference: https://helm.sh/docs/helm/helm_test/
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- ingress-nginx annotation reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- RFC 3986 URI syntax for bracketed IPv6 literals: https://www.rfc-editor.org/rfc/rfc3986.html
- OneUptime IP monitor docs: https://oneuptime.com/docs/monitor/ip-monitor

## Issues Found
- The original `values.yaml` example defaulted `ipFamilyPolicy` to `SingleStack` and `ipFamilies` to `["IPv4"]`. That combination prevents the example `helm install` command from producing the dual-stack Service behavior described in the post. I changed the defaults to `ipFamilyPolicy: PreferDualStack` with an empty `ipFamilies` override so dual-stack works when IPv6 support is enabled, while still falling back cleanly on IPv4-only clusters.
- The Service template always rendered `ipFamilies` whenever `networking.ipv6.enabled` was true. With the original default of `["IPv4"]`, that forced a single-stack IPv4 Service. I changed the template to render `ipFamilies` only when the value is explicitly provided.
- The `service.ipv6ClusterIP` example implied a Kubernetes Service field that does not exist. Kubernetes Services use `clusterIP` and `clusterIPs`. I corrected the example to `clusterIP`.
- The ingress example used `nginx.ingress.kubernetes.io/ipv6-enabled`, which is not present in the current ingress-nginx annotation reference. I removed that unsupported annotation and left the annotations map empty.
- The test step said the `kubectl get svc ... {.spec.clusterIPs}` command verifies an "IPv6 cluster IP", but the command actually prints the full `clusterIPs` array. I corrected the wording to say it verifies dual-stack cluster IPs.
- The JSON Schema snippet used the generic `http://json-schema.org/schema#` URI and did not validate the `networking.ipv6.enabled` flag shown earlier in the post. I updated it to the draft-07 schema URI used in Helm documentation and added validation for the IPv6 enablement flag.

## Review Notes
- The IPv6 URL formatting helper is technically correct for literal IPv6 addresses because RFC 3986 requires bracketed IP literals in URI hosts.
- `helm` and `kubectl` were not installed in the local workspace, so CLI validation was done against the current official command reference pages instead of local `--help` output.
- The post title and tags mention publishing, Artifact Hub, and OCI registries, but the body focuses on chart design and validation rather than chart publication workflow. That is an editorial scope issue, not a technical correctness blocker.
