# Validation Summary: How to Validate Ingress Gateway Canary Rollouts with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Ingress
- NGINX Ingress Controller canary annotations
- Calico NetworkPolicy
- kubectl logs and annotate commands
- Mermaid diagrams

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- NGINX Ingress Controller canary example: https://kubernetes.github.io/ingress-nginx/examples/canary/
- NGINX Ingress Controller annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy

## Issues Found
- The prerequisites referred to "Calico with ingress controller support," but the example uses NGINX Ingress Controller for canary traffic splitting and Calico for network policy enforcement. Changed the prerequisite to "Calico installed for network policy enforcement."
- The Ingress examples did not set a namespace while the Calico policy was scoped to the `production` namespace. Added `namespace: production` so the Ingress backends resolve Services in the same namespace as the policy target.
- The Ingress examples omitted `ingressClassName`. Added `ingressClassName: nginx` to align the manifests with NGINX Ingress Controller handling.
- The Calico policy source selector only matched ingress controller pods in the same namespace as the policy. Added `namespaceSelector: projectcalico.org/name == 'ingress-nginx'` and updated the pod selector to a common NGINX Ingress label so the policy can allow traffic from controller pods in the `ingress-nginx` namespace.
- The `kubectl logs` and `kubectl annotate` commands omitted the `production` namespace. Added `-n production` to match the manifests.
- The conclusion described a "Calico ingress gateway," which was misleading for this NGINX Ingress based example. Updated it to "NGINX Ingress and Calico."

## Review Notes
- The NGINX canary annotations and weight behavior are correct for NGINX Ingress Controller. The exact ingress controller pod labels may vary by installation, so users should confirm their controller labels before applying the Calico policy unchanged.
