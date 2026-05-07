# Validation Summary: How to Configure Application Annotations in Portainer for Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- kubectl
- ingress-nginx
- Prometheus
- cert-manager

## Sources Consulted
- Portainer Documentation, Add a new application using a form: https://docs.portainer.io/2.27/user/kubernetes/applications/add
- Portainer Documentation, Edit an application: https://docs.portainer.io/user/kubernetes/applications/edit
- Kubernetes Documentation, Annotations: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations
- Kubernetes Documentation, `kubectl annotate`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Kubernetes Documentation, `kubectl patch`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes Documentation, `kubectl rollout restart`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart
- Kubernetes Documentation, Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Documentation, Ingress: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx Documentation, Annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx Documentation, Ingress path matching: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- Prometheus Documentation, Configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- cert-manager Documentation, Annotated Ingress resource: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The Portainer UI instructions placed annotations under an `Advanced configuration` section. Updated this to `Base configuration`, which is how Portainer documents application annotations.
- The first ingress-nginx snippet attached ingress annotations to `Deployment` metadata and used unsupported `nginx.ingress.kubernetes.io/rate-limit`. Updated the snippet to target Ingress metadata and replaced the invalid key with supported `nginx.ingress.kubernetes.io/limit-rps`.
- The Prometheus example said "Pod template annotations" but showed top-level `metadata.annotations`. Moved the annotations under `spec.template.metadata.annotations` so the example matches how a Deployment template is annotated.
- The deployment tracking example used the Deployment controller's `deployment.kubernetes.io/*` namespace for custom metadata. Replaced those keys with `example.com/*` custom annotations to avoid conflicting with controller-managed annotations.
- The restart section incorrectly implied that annotating `Deployment.metadata` causes a rolling restart. Replaced it with a `kubectl patch` example that updates `.spec.template.metadata.annotations`, and kept `kubectl rollout restart` as the dedicated command.
- The annotation inspection command piped `jsonpath` output into `jq`, which is unreliable because Kubernetes JSONPath prints objects via their string representation. Changed the example to `-o json | jq '.metadata.annotations'`.
- The final Ingress example set `nginx.ingress.kubernetes.io/use-regex: "true"` without a regex path. Removed the annotation so the example matches the path definition.

## Review Notes
- `prometheus.io/*` scrape annotations are a common convention and depend on Prometheus scrape configuration or compatible tooling that reads them; they are not universal Kubernetes behavior by themselves.
- `kubectl` was not available in the local workspace during review, so command validation relied on the current upstream Kubernetes reference documentation rather than local `--help` output.
