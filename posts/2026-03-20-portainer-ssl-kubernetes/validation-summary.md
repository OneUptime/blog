# Validation Summary: How to Configure SSL/TLS for Portainer on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Helm
- cert-manager
- ingress-nginx
- TLS / SSL
- Kubernetes Ingress
- Kubernetes Secrets

## Sources Consulted
- Portainer Kubernetes chart values (official): https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/values.yaml
- Portainer Kubernetes chart ingress template (official): https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/ingress.yaml
- Portainer Kubernetes chart deployment template (official): https://raw.githubusercontent.com/portainer/k8s/master/charts/portainer/templates/deployment.yaml
- Portainer SSL/TLS documentation (official): https://docs.portainer.io/advanced/ssl
- Kubernetes `kubectl create secret tls` reference (official): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes Ingress documentation (official): https://kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager Helm installation docs (official): https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver docs (official): https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager annotated Ingress docs (official): https://cert-manager.io/docs/usage/ingress/
- ingress-nginx annotation reference (official): https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Helm upgrade command reference (official): https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The Portainer Helm values in Method 2 used unsupported chart keys under `tls:` (`enabled`, `certFile`, and `keyFile`). I replaced them with the chart-supported `tls.force` and `tls.existingSecret`, and made the ingress path target port `9443` to match HTTPS upstream behavior.
- The Portainer chart’s ingress values were written as though `pathType` were configurable in values. The chart template actually consumes `path` and optional `port`, and sets `pathType` itself for `networking.k8s.io/v1`. I updated the values snippets to use explicit backend ports (`9443` for pod-level TLS and `9000` for ingress-terminated TLS).
- The cert-manager installation example used `--set installCRDs=true`, which is deprecated in the current chart. I updated it to `--set crds.enabled=true`, which is what the current official cert-manager Helm installation docs use.
- The ACME HTTP-01 solver example used `class: nginx`. Current cert-manager documentation recommends `ingressClassName` for modern ingress controllers such as nginx. I updated the solver snippet to `ingressClassName: nginx`.
- The Helm upgrade examples modified an existing Portainer release but did not use `--reuse-values`. Per the Helm docs, existing customized values are ignored unless `--reuse-values` is supplied when also passing new values. I added `--reuse-values` to the Portainer `helm upgrade` commands.
- The certificate rotation section only patched the Ingress secret reference, then restarted the Portainer deployment. That would not switch Portainer pod-level TLS to the new Secret name, because the Helm release would still mount the old Secret. I replaced that step with a Helm upgrade that updates `tls.existingSecret`.
- The conclusion implied that ingress termination means Portainer always uses its default self-signed certificate internally. That is not true for the cert-manager ingress-termination example in the post, where the ingress talks HTTP to port `9000`. I corrected the conclusion to distinguish HTTP-internal traffic from optional HTTPS-to-backend setups.

## Review Notes
- The post is technically valid after the corrections above.
- The cert-manager installation command still uses the legacy Helm repository URL, which remains supported, but the current cert-manager docs recommend OCI charts as the preferred installation source.
- The examples assume the Helm release name is `portainer` and the namespace is `portainer`; that matches the commands shown in the post.
