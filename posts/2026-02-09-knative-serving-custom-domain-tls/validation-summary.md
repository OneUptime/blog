# Validation Summary: How to Configure Knative Serving with Custom Domain Mapping and TLS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Knative Serving
- Knative Kourier
- Knative DomainMapping
- cert-manager
- Let's Encrypt ACME
- AWS Route53
- Prometheus Operator
- OpenSSL

## Sources Consulted
- Knative Serving YAML installation documentation: https://knative.dev/docs/install/yaml-install/serving/install-serving-with-yaml/
- Knative cert-manager integration documentation: https://knative.dev/docs/serving/encryption/configure-certmanager-integration/
- Knative external domain TLS documentation: https://knative.dev/docs/serving/encryption/external-domain-tls/
- Knative custom domains documentation: https://knative.dev/docs/serving/services/custom-domains/
- Knative custom TLS certificate for DomainMapping documentation: https://knative.dev/docs/serving/services/custom-tls-certificate-domain-mapping/
- Knative Serving API reference for DomainMapping: https://knative.dev/docs/serving/reference/serving-api/
- Knative traffic management documentation: https://knative.dev/docs/serving/traffic-management/
- Knative HTTP protocol documentation: https://knative.dev/docs/serving/services/http-protocol/
- Knative certificate class documentation: https://knative.dev/docs/serving/services/certificate-class/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/
- AWS CLI Route53 change-resource-record-sets reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Prometheus Operator PrometheusRule API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Knative and cert-manager install commands pinned old releases. Changed them to official latest release download URLs so the tutorial does not install outdated components by default.
- The Kourier manifest URL used the old repository path. Updated it to the official `knative-extensions/net-kourier` release URL.
- The cert-manager integration example was incomplete for current Knative documentation. Kept the `config-certmanager` flow and added the documented provider label.
- The ACME HTTP-01 solver used `class: kourier`. Replaced it with `ingressClassName: <your-ingress-class>` and clarified that it must be a Kubernetes Ingress class that serves HTTP-01 challenge traffic.
- The automatic TLS configuration used `auto-tls` and `certificate.class`. Replaced them with the documented `external-domain-tls` and `certificate-class` keys.
- The `config-certmanager` ConfigMap was missing the cert-manager provider label shown in Knative documentation. Added `networking.knative.dev/certificate-provider: cert-manager`.
- The DomainMapping examples omitted required ClusterDomainClaim setup. Added ClusterDomainClaim resources before creating mapped domains.
- Some DomainMapping references omitted namespace or `apiVersion` fields. Added them for consistency with Knative examples and the API reference.
- The traffic splitting YAML showed a partial Knative Service manifest that could overwrite or fail to represent the existing Service template. Replaced it with a scoped `kubectl patch` command for updating only `spec.traffic`.
- The tag DomainMapping example mapped custom domains back to the whole Service rather than to individual traffic targets. Replaced it with the documented way to retrieve generated tag URLs.
- The custom TLS example used a non-existent `serving.knative.dev/tls-secret` Service annotation. Replaced it with `DomainMapping.spec.tls.secretName`, which is the documented custom certificate mechanism.

## Review Notes
The guide now follows current Knative documentation for external domain TLS. HTTP-01 still requires a working Kubernetes Ingress or Gateway path for ACME challenge traffic; clusters that only expose Kourier may need an environment-specific solver setup such as DNS-01.
