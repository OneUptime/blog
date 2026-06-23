# Validation Summary: How to Use MetalLB with cert-manager for Automated TLS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- MetalLB
- ingress-nginx
- cert-manager
- Let's Encrypt ACME
- HTTP-01 and DNS-01 challenges
- Kubernetes Ingress, Service, Secret, and Custom Resources
- PrometheusRule alerting
- Cloudflare DNS-01 solver

## Sources Consulted
- MetalLB installation docs: https://metallb.universe.tf/installation/
- MetalLB configuration docs: https://metallb.universe.tf/configuration/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Cloudflare DNS-01 docs: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Ingress usage docs: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate resource docs: https://cert-manager.io/docs/usage/certificate/
- cert-manager Prometheus metrics docs: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- ingress-nginx TLS/HTTPS docs: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx ConfigMap docs: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Let's Encrypt challenge types docs: https://letsencrypt.org/docs/challenge-types/

## Issues Found
- The prerequisites only mentioned outbound access to Let's Encrypt. Added inbound HTTP port 80 access because HTTP-01 validation requires the ACME server to reach the ingress over HTTP.
- The MetalLB install command pinned `v0.14.5`. Updated it to the current documented `v0.16.1` manifest URL.
- The Layer 2 mode description said it works without any special network configuration. Reworded it to say it does not require BGP configuration on a single Layer 2 network, which avoids overstating the networking assumptions.
- The cert-manager Helm install used the older Jetstack repository flow and `installCRDs=true`. Updated it to the current OCI chart command with `--version v1.20.2` and `--set crds.enabled=true`.
- The cert-manager log command used the old `app=cert-manager` label selector. Updated it to the current Helm labels: `app.kubernetes.io/name=cert-manager,app.kubernetes.io/instance=cert-manager`.
- The renewal section described the default as a fixed 30 days before expiration. Updated it to cert-manager's current default behavior: renewal is scheduled two-thirds through the issued certificate's actual duration, which is about 30 days before expiry for a 90-day Let's Encrypt certificate.

## Review Notes
The remaining manifests use current Kubernetes `networking.k8s.io/v1` Ingress syntax, cert-manager `cert-manager.io/v1` issuer syntax, MetalLB `metallb.io/v1beta1` `IPAddressPool` and `L2Advertisement` resources, and valid ingress-nginx annotations/configuration keys. The Cloudflare DNS-01 example is structurally correct; in production, the Cloudflare API token should also include `Zone:Zone:Read` as recommended by cert-manager, in addition to DNS edit permissions.
