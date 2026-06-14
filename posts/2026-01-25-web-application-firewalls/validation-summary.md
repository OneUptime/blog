# Validation Summary: How to Implement Web Application Firewalls

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Web Application Firewalls
- Kubernetes Ingress
- ingress-nginx
- ModSecurity
- OWASP Core Rule Set
- Coraza WAF
- AWS WAFv2
- AWS Load Balancer Controller
- Terraform AWS Provider
- Fluent Bit
- Prometheus Operator
- Helm
- Bash and curl

## Sources Consulted
- ingress-nginx ModSecurity documentation: https://kubernetes.github.io/ingress-nginx/user-guide/third-party-addons/modsecurity/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotation documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#modsecurity
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- ingress-nginx retirement notice: https://github.com/kubernetes/ingress-nginx/blob/main/README.md
- AWS Load Balancer Controller annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS WAF rate-based rule documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- AWS WAFv2 RateBasedStatement API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatement.html
- Terraform AWS Provider aws_wafv2_web_acl documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- Coraza Proxy WASM documentation: https://github.com/corazawaf/coraza-proxy-wasm
- Coraza CRS Docker documentation: https://github.com/coreruleset/coraza-crs-docker
- Coraza Caddy integration documentation: https://github.com/corazawaf/coraza-caddy
- OWASP Coraza introduction: https://www.coraza.io/docs/tutorials/introduction/
- Fluent Bit parser documentation: https://docs.fluentbit.io/manual/data-pipeline/parsers
- Fluent Bit JSON parser documentation: https://docs.fluentbit.io/manual/data-pipeline/parsers/json
- Prometheus Operator PrometheusRule API: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md

## Issues Found
- The ingress-nginx prerequisite implied ingress-nginx was generally current for new deployments. Updated the prerequisite and ModSecurity section wording to reflect that ingress-nginx is now a legacy/existing-deployment path and new deployments should use a maintained ingress controller or Gateway API implementation.
- The ingress-nginx Helm values used a custom `modsecurity-snippet` without explicitly including the OWASP CRS. Added `Include /etc/nginx/owasp-modsecurity-crs/nginx-modsecurity.conf`, matching ingress-nginx documentation for snippets.
- The custom ModSecurity ConfigMap was created but not mounted or included. Added `extraVolumes`, `extraVolumeMounts`, and an include for mounted rule files so the rules are actually loaded.
- The per-Ingress ModSecurity example combined the OWASP CRS annotation with a custom snippet. ingress-nginx documents that the custom snippet takes effect in this case, so the snippet now explicitly includes the CRS and mounted custom rules.
- The ModSecurity audit log was parsed as JSON in Fluent Bit without configuring ModSecurity JSON audit output. Added `SecAuditLogFormat JSON` and simplified the Fluent Bit parser configuration to parse JSON directly.
- The Coraza sidecar used `corazawaf/coraza-proxy-wasm:latest` as though it were a standalone HTTP reverse proxy. That project is a proxy-wasm filter for Envoy/Istio-style hosts. Replaced it with the Coraza CRS Docker nginx reverse-proxy image and corrected the environment variables and mounted rule path.
- The Terraform AWS WAF sample used the deprecated `excluded_rule` block. Replaced it with `rule_action_override` and `action_to_use { count {} }` per the Terraform AWS Provider schema.
- The Prometheus alert examples referenced WAF-specific metrics that are not emitted by ingress-nginx by default. Clarified that those alerts require WAF log-derived counters from Fluent Bit, Promtail, or a custom exporter.

## Review Notes
The examples are now technically consistent with the referenced documentation, but production WAF deployments still require rule tuning, false-positive testing, and environment-specific logging/exporter setup. The AWS WAF ALB annotation is valid for Regional WAFv2 web ACLs. YAML snippets were mechanically parsed after editing.
