# Validation Summary: How to Configure OpenShift Routes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenShift Routes
- OpenShift Ingress Controller and HAProxy router
- Kubernetes Services, Secrets, RBAC, and Ingress
- TLS termination: edge, passthrough, and re-encrypt
- OpenShift CLI (`oc`)

## Sources Consulted
- Red Hat OpenShift Container Platform 4.20 Routes documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/ingress_and_load_balancing/routes
- Red Hat OpenShift Container Platform Route API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.14/html/network_apis/route-route-openshift-io-v1
- Red Hat OpenShift Container Platform Ingress Controller wildcard policy documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.8/html/networking/configuring-ingress
- Red Hat OpenShift Container Platform 3.11 networking and routes documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/3.11/html/architecture/networking
- Cert Utils Operator documentation: https://github.com/redhat-cop/cert-utils-operator

## Issues Found
- The TLS Secret example implied that a Route can use a Secret through the Cert Utils Operator annotation as if it were built-in OpenShift behavior. Updated the section to use current `spec.tls.externalCertificate` syntax and added the required RBAC for the router service account. Kept a note that the Cert Utils Operator is an older-cluster/operator-based alternative.
- The HAProxy IP restriction annotation used the older `haproxy.router.openshift.io/ip_whitelist` name. Updated it to the current `haproxy.router.openshift.io/ip_allowlist` annotation used in current OpenShift documentation.
- The HSTS annotation was described as a custom HAProxy configuration snippet. Updated the comment to describe it as an HSTS response header, matching OpenShift route annotation behavior.
- The rewrite-target example did not include a `spec.path`, which makes the rewrite behavior ambiguous. Added `path: /api` so the example matches the documented behavior of replacing the route path prefix.
- The wildcard Route used `host: "*.apps.example.com"`, which is invalid for OpenShift Route `spec.host` because Route hosts must be DNS subdomains and do not include a literal `*`. Updated the example to use `host: wildcard.apps.example.com` with `wildcardPolicy: Subdomain`.

## Review Notes
The remaining examples use valid Route API fields and current TLS termination values. The `spec.tls.externalCertificate` example assumes a current OpenShift release that supports externally managed Route certificates.
