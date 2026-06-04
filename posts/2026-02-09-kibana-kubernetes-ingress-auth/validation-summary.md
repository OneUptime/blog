# Validation Summary: How to set up Kibana on Kubernetes with Ingress and authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kibana
- Elasticsearch
- Kubernetes Deployments, Services, Ingresses, and NetworkPolicies
- NGINX Ingress Controller
- cert-manager and ACME HTTP-01
- TLS termination
- Basic authentication
- OpenID Connect / OAuth-style SSO with Keycloak
- SAML authentication
- Kibana role-based access control

## Sources Consulted
- Elastic Docs: Kibana security settings, authentication providers, session settings, and audit logging: https://www.elastic.co/docs/reference/kibana/configuration-reference/security-settings
- Elastic Docs: Kibana Elasticsearch connection settings: https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings
- Elastic Docs: OpenID Connect authentication: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/openid-connect
- Elastic Docs: SAML authentication for the Elastic Stack: https://www.elastic.co/guide/en/elasticsearch/reference/8.19/saml-guide-stack.html
- Elastic Docs: Elasticsearch security settings and realm configuration: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- Elastic Docs: Kibana privileges and role API examples: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges
- Elastic Docs: `elasticsearch-setup-passwords` deprecation: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/setup-passwords
- NGINX Ingress Controller annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- Kibana was configured to connect to Elasticsearch as the `elastic` superuser. Changed the examples to use the `kibana_system` built-in user, which is the correct server-side Kibana user for Elasticsearch maintenance access in 8.x.
- The deployment set only `xpack.encryptedSavedObjects.encryptionKey`, but high-availability Kibana also needs a stable `xpack.security.encryptionKey`. Added `XPACK_SECURITY_ENCRYPTIONKEY` using the existing encryption key secret.
- The cert-manager HTTP-01 solver used `class: nginx`. Updated it to `ingressClassName: nginx`, the recommended field in cert-manager 1.12 and later.
- The OIDC section attempted to create an Elasticsearch realm with `PUT /_security/realm/oidc/oidc1`, which is not a valid way to configure realms. Replaced it with an `elasticsearch.yml` realm configuration and an Elasticsearch keystore command for `rp.client_secret`.
- The SAML section attempted to create an Elasticsearch realm with `PUT /_security/realm/saml/saml1`, which is not a valid way to configure realms. Replaced it with an `elasticsearch.yml` SAML realm configuration.
- The SAML Kibana configuration included `xpack.security.authc.saml.realm`, which is not needed with the current provider-based configuration. Removed it and kept `xpack.security.authc.providers.saml.saml1.realm`.
- The Kibana RBAC examples used Elasticsearch role API application privilege JSON for Kibana privileges. Replaced them with Kibana role API examples using `elasticsearch` and `kibana` privilege blocks.
- The NetworkPolicy used separate `namespaceSelector` and `podSelector` entries, which broadens the allowed sources. Combined them into a single peer and updated labels to match the default Kubernetes namespace label and common ingress-nginx pod label.

## Review Notes
- The post still uses Kibana `8.11.0` and cert-manager `v1.13.0`, which are older than current releases but not inherently invalid for the tutorial. Future updates should consider refreshing those versions and documenting the matching Elasticsearch version.
- `elasticsearch.ssl.verificationMode: none` is technically valid but weakens TLS verification. For production, a certificate authority should be configured instead.
- The examples assume the `logging` namespace and Elasticsearch credentials/secrets already exist.
