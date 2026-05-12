# Validation Summary: How to Secure the Calico Ingress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (open-source and Calico Enterprise)
- Kubernetes Ingress (`networking.k8s.io/v1`)
- NGINX Ingress Controller
- Envoy
- kubectl
- Mermaid (diagram)

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress v1 GA notes (stable since 1.19): https://kubernetes.io/blog/2020/08/26/ingress-api-in-kubernetes-1-19/
- NGINX Ingress Controller annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Calico NetworkPolicy reference (`projectcalico.org/v3`): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector-syntax
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

- The Kubernetes Ingress manifest correctly uses the stable `networking.k8s.io/v1` API with `ingressClassName`, `pathType: Prefix`, and the standard `nginx.ingress.kubernetes.io/rewrite-target` annotation.
- The Calico `NetworkPolicy` uses the correct `projectcalico.org/v3` API group, valid selector syntax (`app == 'my-app'`), and a properly structured `source`/`destination` block with port 8080.
- The verification commands (`kubectl get pods`, `curl` against the LoadBalancer IP via jsonpath, and `kubectl describe ingress`) are syntactically correct and would function as described. The extra spaces in the `curl` command are cosmetic and do not affect execution.
- The Mermaid diagram uses `\n` for in-node line breaks, which is supported by current Mermaid versions.

## Review Notes
- The post is intentionally generic and works equally well for either an NGINX-based or Envoy-based ingress controller; readers using Calico Enterprise's dedicated gateway implementation will need to consult Tigera-specific docs for advanced features (TLS termination policies, JWT auth, rate limiting), which the introduction promises but the body does not deeply cover.
- The Calico NetworkPolicy example assumes the application listens on port 8080 inside the pod; readers should adjust this to match the actual `containerPort` of their workload (the upstream Service in the Ingress resource references port 80, which is the Service port, not the pod port).
- Consider replacing `\n` with `<br/>` in the Mermaid diagram for maximum renderer compatibility, though this is not a correctness issue.
