# Validation Summary: How to Configure Multiple Hosts on a Single Istio Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Kubernetes TLS Secrets
- Kubernetes kubectl
- Envoy SNI and routing configuration
- istioctl proxy-config

## Sources Consulted
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio secure ingress task, including multiple TLS hosts: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The wildcard host section said a wildcard certificate and wildcard Gateway host accepts any subdomain of `example.com`. Istio documents wildcard matching for matching suffix hosts such as `dev.example.com` and `prod.example.com`, while `example.com` and unrelated suffixes do not match. Updated the wording to say matching subdomains such as `shop.example.com` are accepted.

## Review Notes
- The `networking.istio.io/v1` Gateway and VirtualService examples match current Istio documentation.
- The separate HTTPS server entries on port 443 with different `credentialName` values match Istio's documented multi-host secure ingress pattern.
- The `kubectl create secret tls` commands use current flags, and the `istioctl proxy-config routes deployment/...` command form is documented.
- Short destination hostnames in the VirtualService examples are valid, but fully qualified Kubernetes service names can be safer in multi-namespace deployments.
