# Validation Summary: How to Set Up Ingress for Ceph Dashboard in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard (Ceph Manager module)
- Kubernetes Ingress (networking.k8s.io/v1)
- NGINX Ingress Controller
- cert-manager
- TLS/SSL certificates

## Sources Consulted
- Rook official documentation — Ceph Dashboard: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- NGINX Ingress Controller annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- NGINX Ingress Controller SSL passthrough documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#ssl-passthrough
- NGINX Ingress Controller rewrite documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#rewrite
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found

### Issue 1: Conflicting ssl-passthrough and backend-protocol annotations
- **What was wrong:** The first Ingress example combined `nginx.ingress.kubernetes.io/ssl-passthrough: "true"` with `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"`. These are mutually exclusive — ssl-passthrough operates at Layer 4 (TCP) and invalidates ALL other annotations on the Ingress, including backend-protocol. Path-based routing also does not work with ssl-passthrough.
- **What was changed:** Removed the `ssl-passthrough` annotation. Added `proxy_ssl_verify off` via a server-snippet annotation, matching the official Rook documentation's recommended Ingress configuration. Updated the description text from "TLS passthrough" to "HTTPS backend" to accurately describe the approach (TLS termination at ingress with re-encryption to backend).
- **Why:** The official Rook documentation recommends using `backend-protocol: "HTTPS"` with `proxy_ssl_verify off` for the dashboard Ingress. This approach terminates TLS at the ingress and re-encrypts to the HTTPS backend, which is the correct and practical approach for most deployments.

### Issue 2: Incorrect rewrite-target annotation
- **What was wrong:** The second Ingress example (TLS termination with HTTP backend) included `nginx.ingress.kubernetes.io/rewrite-target: /`. With `path: /` and `pathType: Prefix`, this rewrites ALL request paths to `/`, which would break the Ceph Dashboard — all subpath requests (API calls, static assets like CSS/JS, navigation routes) would be rewritten to the root path.
- **What was changed:** Replaced `rewrite-target: /` with `backend-protocol: "HTTP"` to explicitly specify the backend protocol, which is the appropriate annotation for an HTTP backend.
- **Why:** The rewrite-target annotation is designed for path prefix stripping with capture groups (e.g., `/app/(.*)` rewritten to `/$1`). When used without capture groups on `path: /`, it destroys subpath information. The official Rook documentation does not use rewrite-target for the dashboard Ingress.

## Review Notes
- The official Rook Ingress example references the service port by name (`https-dashboard`) rather than by number (`8443`). The blog uses port numbers, which is valid and works correctly.
- For the second Ingress example (HTTP backend), users would need to set `ssl: false` in the CephCluster spec to have the dashboard serve HTTP on port 7000. The post doesn't explicitly mention this, but it's implied by the "dashboard runs HTTP" description.
- The `whitelist-source-range` annotation is correct for the NGINX Ingress Controller, though it's worth noting this is NGINX-specific and not portable to other ingress controllers.
- The dashboard password retrieval command uses bracket notation jsonpath (`{['data']['password']}`), which works but the more common style is dot notation (`{.data.password}`). Both are functionally equivalent.
