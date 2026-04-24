# Validation Summary: How to Debug Ingress Routing Problems in Portainer - K8s

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Kubernetes Ingress
- IngressClass
- ingress-nginx
- `kubectl`
- TLS Secrets
- Service networking

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes debug services guide: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- ingress-nginx rewrite example: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx path matching docs: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx annotations docs: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx TLS docs: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- Portainer Ingresses docs: https://docs.portainer.io/2.27/user/kubernetes/networking/ingresses

## Issues Found
- The post presented `kubernetes.io/ingress.class` as the primary way to set the Ingress class. I changed the section to prefer `spec.ingressClassName` and noted that the annotation is deprecated and only retained for backward compatibility, because current Kubernetes documentation treats `ingressClassName` as the replacement.
- The service-debugging section used the legacy Endpoints API. I updated the commands and related explanations to use EndpointSlices, because Kubernetes documents Endpoints as deprecated as of v1.33 and recommends EndpointSlices instead.
- The regex rewrite example for ingress-nginx omitted `nginx.ingress.kubernetes.io/use-regex: "true"`. I added that annotation and included `ingressClassName: nginx`, because ingress-nginx requires `use-regex` for regex paths and the official rewrite example shows that configuration.
- The diagnostic script had an argument-handling bug: it claimed to default the namespace to `default`, but still required a second positional argument for the ingress name. I corrected the script so it works with either `[namespace] <ingress-name>` or just `<ingress-name>`.
- The diagnostic script used `kubectl get events --sort-by='.lastTimestamp'`. I updated it to `kubectl events`, which is the current dedicated command for listing recent events.
- The “308 redirect loop” row attributed the issue to an HTTP backend. I changed that explanation to TLS termination / SSL offloading mismatch and clarified the ingress-nginx annotation name, because ingress-nginx documents 308 redirects as tied to HTTPS enforcement when TLS is enabled or offloaded upstream.
- The explanation of an empty Ingress `Address` field was too absolute. I softened it to reflect that controllers may not be publishing status yet or that the load balancer may not be ready.

## Review Notes
- The post is technically relevant and salvageable; no removal concerns.
- Kubernetes marks the Ingress API as frozen and recommends Gateway API for new feature development, but Ingress remains stable and valid for current production use cases.
- The remaining commands and examples are consistent with current Kubernetes and ingress-nginx documentation after the corrections above.
