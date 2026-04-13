# Validation Summary: How to Use Dapr with Keycloak

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (bearer token HTTP middleware)
- Keycloak (self-hosted identity provider, OIDC/JWT)
- Kubernetes (deployment via CRDs and Helm)
- Python / FastAPI (downstream service example)
- OAuth2 password grant flow

## Sources Consulted
- Dapr bearer middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-bearer/
- Dapr bearer middleware source code: https://github.com/dapr/components-contrib/blob/master/middleware/http/bearer/bearer_middleware.go
- Dapr bearer middleware metadata source: https://github.com/dapr/components-contrib/blob/master/middleware/http/bearer/metadata.go
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Keycloak Operator installation docs: https://www.keycloak.org/operator/installation
- Keycloak k8s-resources repository (tag 24.0.0): https://github.com/keycloak/keycloak-k8s-resources
- Keycloak OIDC endpoints: https://www.keycloak.org/securing-apps/oidc-layers
- Bitnami Keycloak Helm chart values: https://github.com/bitnami/charts/blob/main/bitnami/keycloak/values.yaml
- Keycloak GitHub discussion on bearer-only removal: https://github.com/keycloak/keycloak/discussions/23376
- Dapr GitHub issue #189 (JWT claim forwarding): https://github.com/dapr/components-contrib/issues/189

## Issues Found

### 1. Incorrect Keycloak CRD URL (line 19)
**What was wrong:** The URL referenced `keycloaks.k8s.keycloak.org-v1beta1.yaml` which does not exist. The file in the repository at tag 24.0.0 is named `keycloaks.k8s.keycloak.org-v1.yml` (v1 not v1beta1, .yml not .yaml). The original URL returns HTTP 404.
**What was changed:** Fixed to `keycloaks.k8s.keycloak.org-v1.yml`.

### 2. Outdated "bearer-only" client access type (line 31)
**What was wrong:** The post instructed readers to create a client with "access type: bearer-only". This terminology was removed from the Keycloak admin console in Keycloak 19+. Since the post references Keycloak 24.0.0 CRDs, this instruction would confuse readers as there is no "bearer-only" option in the UI.
**What was changed:** Updated to "disable Client authentication and all Authentication flow checkboxes", which is the modern equivalent.

### 3. Fabricated JWT claim forwarding via X-JWT-* headers (Python code section)
**What was wrong:** The Python code assumed Dapr forwards JWT claims as HTTP headers (e.g., `X-JWT-Realm_access`, `X-JWT-Resource_access`). This is incorrect — Dapr's bearer middleware is a pure authentication gate. It validates the token and passes the request through unchanged. It does NOT extract or forward JWT claims as headers. The description and summary also incorrectly stated that claims "flow through as headers."
**What was changed:** Rewrote the Python code to decode the JWT payload directly from the Authorization header (which Dapr forwards unchanged). Since Dapr has already validated the token's signature, the service can safely base64-decode the payload segment to extract `realm_access` and `resource_access` claims. Updated the description and summary text to accurately describe this approach.

## Review Notes
- The Dapr middleware component type (`middleware.http.bearer`), metadata field names (`jwksURL`, `audience`, `issuer`), and version (`v1`) are all correct per official documentation.
- The Keycloak JWKS and token endpoint URL formats are correct for modern Keycloak (17+ Quarkus-based, without the legacy `/auth/` prefix).
- The Bitnami Helm chart parameters (`auth.adminUser`, `auth.adminPassword`) are correct.
- The password grant token request is correctly formed, though the post correctly notes it is for testing only (password grant is discouraged in production).
- The `user_service` and `report_service` objects in the Python code are undefined — this is acceptable for a tutorial showing the pattern, but readers should understand these are placeholders.
