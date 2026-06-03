# Validation Summary: How to Troubleshoot Ingress Controller Not Forwarding Requests

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes IngressClass
- Kubernetes Services and EndpointSlices
- Kubernetes NetworkPolicy
- ingress-nginx controller
- TLS Secrets
- kubectl
- curl and DNS troubleshooting

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Service documentation, including EndpointSlice and deprecated Endpoints API notes: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- ingress-nginx rewrite annotation documentation: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx default backend documentation: https://kubernetes.github.io/ingress-nginx/user-guide/default-backend/

## Issues Found
- The post used the deprecated Kubernetes `Endpoints` API as the primary way to inspect Service backends. Updated the commands and example output to use `EndpointSlice` with the `kubernetes.io/service-name` label, which matches current Kubernetes guidance.
- The `kubectl run` examples passed `curl` and `sh` as container arguments rather than commands. Added `--command --` so the examples run the intended command inside the temporary pod.
- The ingress-nginx rewrite example used a regex-like path with `pathType: Prefix` and no `use-regex` annotation. Updated it to set `nginx.ingress.kubernetes.io/use-regex: "true"`, include `ingressClassName: nginx`, and use `pathType: ImplementationSpecific`, matching ingress-nginx's documented regex rewrite pattern.
- The path matching description implied plain string prefix matching. Clarified that Kubernetes `Prefix` matching is path-element based.
- The default backend section implied any 404 from `/` indicated a controller problem and referenced a deployment that is not present in all ingress-nginx installations. Updated it to note that ingress-nginx's default backend returns 404 for `/` and 200 for `/healthz`, and changed the custom default backend check to inspect controller configuration.
- The TLS section said invalid certificates always cause HTTPS requests to fail. Updated the wording to the more precise statement that clients may fail certificate validation.
- The configuration mistakes list treated missing hosts as always wrong. Updated it to note unexpected catch-all host rules instead, because Kubernetes Ingress rules can omit `host`.

## Review Notes
The post remains technically accurate as a general Kubernetes and ingress-nginx troubleshooting guide. The commands use placeholder names and namespaces, so readers still need to substitute their own controller pod names, service names, hosts, and IP addresses.
