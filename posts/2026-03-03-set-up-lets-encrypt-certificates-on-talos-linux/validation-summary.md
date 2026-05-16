# Validation Summary: How to Set Up Let's Encrypt Certificates on Talos Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- Kubernetes Ingress
- cert-manager
- Let's Encrypt
- ACME HTTP-01 and DNS-01 challenges
- Helm
- Cloudflare DNS-01 solver

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager ACME HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager HTTP validation tutorial: https://cert-manager.io/docs/tutorials/acme/http-validation/
- cert-manager annotated Ingress documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Cluster Resource Namespace documentation: https://cert-manager.io/v1.5-docs/faq/cluster-resource/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt certificate lifetime documentation: https://letsencrypt.org/2015/11/09/why-90-days/
- RFC 8555, Automatic Certificate Management Environment: https://datatracker.ietf.org/doc/html/rfc8555

## Issues Found
- The HTTP-01 flow said cert-manager temporarily creates an Ingress and a pod. cert-manager's HTTP validation docs state that it creates a Pod, Service, and Ingress, so the post was updated to include the Service.
- The renewal section said cert-manager renews certificates 30 days before expiry by default. Current cert-manager documentation describes the default as 2/3 through the issued certificate's actual duration; for standard 90-day Let's Encrypt certificates, that is 30 days before expiry. The wording was updated to preserve the practical Let's Encrypt guidance while matching cert-manager behavior.

## Review Notes
- The Helm install command using `--set crds.enabled=true` is current for recent cert-manager versions. The latest cert-manager documentation recommends OCI charts for recent versions, while the legacy Jetstack HTTP Helm repository remains documented and usable.
- The Cloudflare DNS-01 example correctly places the Secret in the `cert-manager` namespace for a `ClusterIssuer`, matching cert-manager's default cluster resource namespace behavior.
- The command that prints the TLS Secret with `-o yaml` is useful for debugging but will expose certificate and private key material to the terminal; future revisions could mention using it carefully.
