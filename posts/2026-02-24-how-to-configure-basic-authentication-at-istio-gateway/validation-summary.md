# Validation Summary: How to Configure Basic Authentication at Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateway
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Istio external authorization
- Istio AuthorizationPolicy
- Kubernetes ConfigMap, Secret, Deployment, and Service resources
- NGINX HTTP Basic Authentication
- Apache htpasswd
- HTTP Basic Authentication

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio external authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio ingress access control task: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- NGINX auth_basic module documentation: https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html
- Apache htpasswd documentation: https://httpd.apache.org/docs/2.4/en/programs/htpasswd.html
- RFC 7617, The Basic HTTP Authentication Scheme: https://www.rfc-editor.org/rfc/rfc7617
- Kubernetes ConfigMap and volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The external authorization provider used `envoyExtAuthz`, which is not the current Istio MeshConfig field. Changed it to `envoyExtAuthzHttp` for an HTTP ext_authz service.
- The external authorization `AuthorizationPolicy` targeted a backend workload in the `default` namespace even though the post is about enforcing basic auth at the gateway. Changed the policy to target the ingress gateway in `istio-system` and limited it to the example hosts.
- The htpasswd ConfigMap was mounted with `subPath`, which would prevent mounted ConfigMap updates from propagating to the running pod. Changed it to mount the htpasswd ConfigMap as a directory and updated the NGINX `auth_basic_user_file` path.
- The AuthorizationPolicy and Gateway snippets used older API versions. Updated them to the current stable Istio `security.istio.io/v1` and `networking.istio.io/v1` APIs.
- The Kubernetes credential section said a Lua EnvoyFilter could use an environment-variable/shared-data workaround for Secrets. Envoy Lua cannot directly read Kubernetes Secrets or pod environment variables, so the section now describes mounting a Secret into a local sidecar and querying it with Lua `httpCall`.
- The credential storage example used a ConfigMap for passwords. Changed it to a Kubernetes Secret with `stringData`, because ConfigMaps are not intended for confidential data.

## Review Notes
The EnvoyFilter examples are technically valid for simple environments but remain operationally brittle because they hardcode base64 credentials and apply a low-level proxy patch. The external authorization approach is more maintainable for real deployments. Lua `httpCall` examples require a corresponding Envoy cluster, which the post now notes but does not fully implement.
