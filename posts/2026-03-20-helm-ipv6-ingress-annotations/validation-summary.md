# Validation Summary: How to Configure IPv6 Ingress Annotations in Helm Charts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Helm
- Kubernetes Services and Ingress
- IPv4/IPv6 dual-stack networking
- ingress-nginx
- Traefik
- AWS Load Balancer Controller / AWS ALB
- JSON Schema
- OneUptime monitoring

## Sources Consulted
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Helm template function list: https://docs.helm.sh/docs/chart_template_guide/function_list/
- Helm chart file structure and `values.schema.json`: https://helm.sh/docs/v3/topics/charts/
- Helm install reference: https://docs.helm.sh/docs/helm/helm_install/
- Helm test reference: https://helm.sh/docs/helm/helm_test/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx Helm chart values: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- Traefik Kubernetes Ingress annotations reference: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/ingress/
- Amazon EKS ALB ingress guide: https://docs.aws.amazon.com/eks/latest/userguide/alb-ingress.html
- AWS Load Balancer Controller ingress annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- OneUptime IP monitor docs: https://oneuptime.com/docs/monitor/ip-monitor

## Issues Found
- The description and overview implied that Nginx Ingress Controller and Traefik expose IPv6 through controller-specific Ingress annotations. I changed this wording to reflect current documentation: those controllers generally rely on dual-stack Service/controller configuration, while AWS ALB supports the documented `alb.ingress.kubernetes.io/ip-address-type: dualstack` Ingress annotation.
- The example `nginx.ingress.kubernetes.io/ipv6-enabled` annotation was not a documented ingress-nginx annotation. I removed it and replaced it with an AWS ALB example comment, leaving the annotations map empty by default.
- The example defaults used `ipFamilyPolicy: SingleStack` with `ipFamilies: [IPv4]`, which would not produce dual-stack behavior when IPv6 was enabled. I changed the example to use `PreferDualStack`, made `ipFamilies` optional, and updated the Service template to render `ipFamilies` only when explicitly set.
- The `service.ipv6ClusterIP` example value did not correspond to a Kubernetes Service field and was not used by the template. I removed it.
- The verification command assumed the Service name would be `myapp`, even though the template uses `{{ include "mychart.fullname" . }}`. I changed the command to use a `<service-name>` placeholder.

## Review Notes
- `PreferDualStack` is the safer default for this post's example because Kubernetes falls back to single-stack behavior when dual-stack is not enabled or supported.
- Helm and kubectl were not installed in the workspace, so command syntax was validated against official documentation rather than local `--help` output.
