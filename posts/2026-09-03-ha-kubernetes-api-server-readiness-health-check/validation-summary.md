# Validation Summary: How to Health-Check an HA Kubernetes API Server Without Routing to an Unready Control-Plane Node

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kube-apiserver health endpoints
- kubeadm high-availability control planes
- Kubernetes RBAC and X.509 client authentication
- TLS certificate verification and Subject Alternative Names
- HTTP and TCP load-balancer health checks
- HAProxy
- curl

## Sources Consulted
- [Kubernetes: Creating Highly Available Clusters with kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/high-availability/)
- [Kubernetes: API Health Endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes: kube-apiserver Command-Line Reference](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Authenticating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [HAProxy: Health Checks](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [HAProxy: Server-Side TLS Encryption and Certificate Verification](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/ssl-tls/server-side-encryption/)
- [curl command-line manual](https://curl.se/docs/manpage.html)

## Issues Found
- The operator test used `curl --fail`, which fails for HTTP response codes of 400 or greater but does not reject 3xx redirects. That did not implement the post's stated requirement to accept exactly HTTP `200` and treat redirects as failures. The command now records curl's `%{http_code}`, discards the response body, and explicitly tests that the status is `200`; transport and TLS failures also leave the command unsuccessful.

## Review Notes
- The RBAC objects use the current `rbac.authorization.k8s.io/v1` API and correctly grant `get` only on the non-resource URL `/readyz` to the named user. The actual X.509 certificate common name or other authenticator-produced username must match that subject, as the post notes.
- Anonymous access to `/readyz` is configuration-dependent. Current Kubernetes supports endpoint-scoped anonymous authentication through `AuthenticationConfiguration`; authorization policy must also permit the resulting anonymous identity.
- The kube-apiserver shutdown description matches the documented behavior of `--shutdown-delay-duration`: `/readyz` fails immediately, `/livez` and `/healthz` remain successful, normal requests continue during the delay, and graceful termination begins afterward.
- HAProxy's documented defaults may accept a broader HTTP status range unless an explicit expectation is configured, so the post is correct to require exact status matching.
