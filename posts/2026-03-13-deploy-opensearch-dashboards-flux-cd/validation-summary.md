# Validation Summary: How to Deploy OpenSearch Dashboards with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenSearch Dashboards
- OpenSearch Security plugin
- OpenSearch Helm charts
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes Secrets, Jobs, Services, and Ingress
- SAML authentication

## Sources Consulted
- OpenSearch Helm installation documentation: https://docs.opensearch.org/latest/install-and-configure/install-opensearch/helm/
- OpenSearch Dashboards configuration documentation: https://docs.opensearch.org/latest/install-and-configure/configuring-dashboards/
- OpenSearch Dashboards TLS configuration documentation: https://docs.opensearch.org/latest/install-and-configure/install-dashboards/tls/
- OpenSearch Security SAML documentation: https://docs.opensearch.org/latest/security/authentication-backends/saml/
- OpenSearch Dashboards Helm chart README and values: https://github.com/opensearch-project/helm-charts/tree/main/charts/opensearch-dashboards
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Secret and environment variable documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The introduction said the guide enabled OIDC authentication, but the implementation shows SAML. Updated the wording to describe optional SAML authentication.
- The Secret used dotted keys such as `opensearch.username` and referenced them as environment variables. Replaced them with conventional environment variable names and updated the Dashboards variable substitutions.
- The Dashboards configuration used deprecated or incorrect header/XSRF names. Updated `opensearch.requestHeadersWhitelist` to `opensearch.requestHeadersAllowlist`, changed `security_tenant` to `securitytenant`, and changed `server.xsrf.whitelist` to `server.xsrf.allowlist`.
- The Dashboards configuration referenced `/usr/share/opensearch-dashboards/config/root-ca.pem` without mounting that file through the Helm chart. Removed the unmounted CA reference and used `opensearch.ssl.verificationMode: none`, matching OpenSearch's getting-started configuration for self-signed/demo TLS.
- The saved-object import Job called protected Dashboards APIs without authentication. Added the same Secret to the Job environment and supplied basic auth to the status and saved-object API calls.
- Step 4 described using a ConfigMap, but the snippet defined a Kubernetes Job and did not include a ConfigMap. Updated the heading and text to match the implementation.

## Review Notes
- For production, certificate verification should be preferred over `opensearch.ssl.verificationMode: none`; that requires mounting the OpenSearch HTTP CA certificate into the Dashboards pod with chart values such as `secretMounts`.
- The Helm chart version `2.23.0` maps to OpenSearch Dashboards app version `2.17.0`. Newer chart versions exist, but the pinned version is valid.
