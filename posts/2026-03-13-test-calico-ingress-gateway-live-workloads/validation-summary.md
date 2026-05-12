# Validation Summary: How to Test the Calico Ingress Gateway with Live Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (open-source and Calico Enterprise/Cloud)
- Kubernetes Ingress (`networking.k8s.io/v1`)
- NGINX Ingress Controller
- Calico `NetworkPolicy` (`projectcalico.org/v3`)
- kubectl
- Mermaid diagrams

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax (entity selectors / namespace scoping): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- Kubernetes Ingress API: https://kubernetes.io/docs/concepts/services-networking/ingress/
- NGINX Ingress Controller annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- NGINX Ingress Controller default labels: https://github.com/kubernetes/ingress-nginx (chart `app.kubernetes.io/name=ingress-nginx`)
- Kubernetes namespace metadata label `kubernetes.io/metadata.name` (KEP-2161, GA in 1.22)
- Mermaid flowchart syntax (node labels and line breaks): https://mermaid.js.org/syntax/flowchart.html

## Issues Found
1. **Calico NetworkPolicy selector did not cross namespaces.** The original ingress rule used:
   ```yaml
   source:
     selector: app == 'ingress-nginx'
   ```
   Calico namespaced `NetworkPolicy` selectors only match endpoints in the **same** namespace as the policy by default. Since the policy lives in `production` but the NGINX ingress controller pods live in the `ingress-nginx` namespace, this rule would have matched nothing and effectively dropped legitimate ingress traffic. Fixed by adding a `namespaceSelector` keyed on the standard `kubernetes.io/metadata.name` label (set automatically by Kubernetes ≥1.22) and switching to the actual label that the NGINX Ingress Controller Helm chart applies (`app.kubernetes.io/name=ingress-nginx`):
   ```yaml
   source:
     namespaceSelector: kubernetes.io/metadata.name == 'ingress-nginx'
     selector: app.kubernetes.io/name == 'ingress-nginx'
   ```

2. **Mermaid node label used `\n` for a line break.** The original `IGW[Ingress Controller\nCalico Policy Enforced]` is not the documented Mermaid syntax and renders inconsistently across Mermaid versions. Replaced with the canonical `<br/>` line break: `IGW[Ingress Controller<br/>Calico Policy Enforced]`.

## Review Notes
- The Ingress YAML uses the GA `networking.k8s.io/v1` API with the correct `pathType`, `ingressClassName`, and `backend.service.port.number` structure — all valid.
- The Ingress backend references service port `80`, while the Calico policy allows destination port `8080`. This is not necessarily wrong (Calico's destination port is the workload/pod port, which may differ from the Kubernetes service port), but readers reusing the snippet should ensure the policy port matches the `containerPort` exposed by the `my-app` pods.
- "Calico Enterprise" is the Tigera commercial product name used in older docs; Tigera now markets the SaaS offering as "Calico Cloud." Both names still appear in public docs, so leaving the term as-is is acceptable.
- The `curl` command contains two spaces between `ingress-nginx-controller` and `-o`; harmless in bash but a minor cosmetic quirk left untouched per the "only fix technical errors" guidance.
