# Validation Summary: How to Secure Ingress Gateway Canary Rollouts with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (NetworkPolicy, projectcalico.org/v3)
- Kubernetes (networking.k8s.io/v1 Ingress)
- NGINX Ingress Controller (canary annotations)
- kubectl (logs, annotate)
- Mermaid (diagram)

## Sources Consulted
- NGINX Ingress Controller annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes Ingress API: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl logs reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs

## Issues Found
No technical issues found.

- The Kubernetes Ingress resources use the stable `networking.k8s.io/v1` API and current `pathType: Prefix` / `backend.service.name+port.number` fields.
- The NGINX Ingress canary annotations (`nginx.ingress.kubernetes.io/canary` and `nginx.ingress.kubernetes.io/canary-weight`) are valid and match the official documentation.
- The Calico NetworkPolicy uses `projectcalico.org/v3` and the selector set syntax `app in {'app-v1', 'app-v2'}` with single quotes is the documented form.
- `kubectl logs -l <selector> --prefix=true` is valid and prefixes each log line with the pod name.
- `kubectl annotate ingress ... --overwrite` is valid for updating annotations.

## Review Notes
- The mermaid diagram uses `\n` for newlines in node labels, which works in current Mermaid versions; `<br/>` is an alternative if rendering issues appear in older renderers.
- Worth noting (not an error): the `kubectl logs -l app=app-v1` `grep`/`wc -l` pattern is a quick smoke check; for real canary analysis, users would typically rely on metrics from Prometheus/Grafana or an ingress controller's request logs rather than container stdout grepping.
- The Calico policy applies to the canary and stable pods but does not by itself enforce that the canary be "more secure" than the stable version — it merely ensures the same ingress source rule is required before traffic flows. The conclusion's framing is reasonable but readers should understand the policy is shared, not differentiated.
