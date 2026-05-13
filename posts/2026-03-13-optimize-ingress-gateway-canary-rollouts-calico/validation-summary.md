# Validation Summary: How to Optimize Ingress Gateway Canary Rollouts with Calico for Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 NetworkPolicy)
- Kubernetes (networking.k8s.io/v1 Ingress)
- NGINX Ingress Controller (canary annotations)
- kubectl CLI
- Mermaid diagrams

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/service-resources/ingress-v1/
- NGINX Ingress Controller canary annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#canary
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selector
- kubectl logs reference (`--prefix` flag): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#logs
- kubectl annotate reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#annotate

## Issues Found
No technical issues found.

The post correctly uses:
- The current `networking.k8s.io/v1` Ingress API with `pathType: Prefix` and the structured `backend.service.name/port.number` schema (no deprecated extensions/v1beta1).
- Valid NGINX Ingress canary annotations: `nginx.ingress.kubernetes.io/canary: "true"` and `nginx.ingress.kubernetes.io/canary-weight: "10"` (weight is a string-encoded integer 0-100).
- A valid Calico `projectcalico.org/v3` `NetworkPolicy` with correct set-based selector syntax `app in {'app-v1', 'app-v2'}` and ingress `action: Allow` with a source selector.
- Correct kubectl flags: `kubectl logs -l <selector> --prefix=true` and `kubectl annotate ingress <name> <key>=<value> --overwrite`.

## Review Notes
- The post's description mentions "header-based routing" but the body only demonstrates weight-based traffic shifting. NGINX Ingress does support header-based canary routing via `nginx.ingress.kubernetes.io/canary-by-header` and `canary-by-header-value`, but they are not shown here. This is a minor descriptor inconsistency rather than a technical error, so no edits were made.
- The Calico policy permits traffic from pods labeled `app == 'ingress-nginx'`. In a real cluster the ingress-nginx controller pods are typically in the `ingress-nginx` namespace and may use labels like `app.kubernetes.io/name: ingress-nginx`. Readers should adjust the selector (and possibly add a `namespaceSelector`) to match their actual ingress controller deployment.
- The `grep "500\|error"` pattern relies on basic-regex alternation via `\|`, which works with GNU grep. It will not catch all error conditions but is a reasonable quick check.
- Mermaid `\n` in node labels is supported by current Mermaid versions; `<br/>` is an alternative if rendering issues arise.
