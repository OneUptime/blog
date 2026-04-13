# How to Use Dapr with Okta

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Okta, Authentication, JWT, OAuth2

Description: Connect Okta as the identity provider for Dapr-powered microservices using JWT middleware to validate tokens and forward Okta group memberships.

---

## Okta and Dapr Integration

Okta issues signed JWTs for user authentication and machine-to-machine scenarios. Dapr's bearer token middleware validates these tokens using Okta's JWKS endpoint, protecting your services without any auth code.

## Okta Application Setup

```text
1. In Okta Admin Console:
   - Applications > Create App Integration
   - Select "API Services" for M2M, or "OIDC Web App" for user flows
   - Note: Client ID, Client Secret, Issuer URL

2. Create an Authorization Server (optional - use default or custom):
   - Security > API > Add Authorization Server
   - Name: microservices-api
   - Audience: api://microservices
```

## JWKS Endpoint

```yaml
https://your-org.okta.com/oauth2/default/v1/keys
# or for custom auth server:
https://your-org.okta.com/oauth2/aus1ab2cd3ef4gh5ij/v1/keys
```

## Dapr JWT Middleware for Okta

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: okta-validator
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://your-org.okta.com/oauth2/default/v1/keys"
  - name: audience
    value: "api://microservices"
  - name: issuer
    value: "https://your-org.okta.com/oauth2/default"
```

## Pipeline Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: okta-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: okta-validator
      type: middleware.http.bearer
```

## Getting an Okta Token

```bash
# Client Credentials (M2M)
TOKEN=$(curl -s -X POST https://your-org.okta.com/oauth2/default/v1/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "scope=read:data write:data" \
  -u "CLIENT_ID:CLIENT_SECRET" | jq -r '.access_token')
```

## Reading Okta Groups in Your Service

```go
package main

import (
    "encoding/json"
    "net/http"
)

func getOktaGroups(r *http.Request) []string {
    groupsHeader := r.Header.Get("X-JWT-Groups")
    if groupsHeader == "" {
        return []string{}
    }
    var groups []string
    json.Unmarshal([]byte(groupsHeader), &groups)
    return groups
}

func requireGroup(group string, next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        groups := getOktaGroups(r)
        for _, g := range groups {
            if g == group {
                next(w, r)
                return
            }
        }
        http.Error(w, `{"error":"insufficient group membership"}`, http.StatusForbidden)
    }
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/reports", requireGroup("Reports-Viewers",
        func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(map[string]string{"data": "report data"})
        }))
    mux.HandleFunc("/api/admin", requireGroup("Admins",
        func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(map[string]string{"data": "admin data"})
        }))
    http.ListenAndServe(":8080", mux)
}
```

## Adding Groups to Okta Tokens

In Okta Authorization Server, add a custom claim:

```yaml
Name: groups
Value type: Groups
Filter: Starts with "app-"
Include in token type: Access Token
```

## Testing

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3500/v1.0/invoke/api-service/method/api/reports
```

## Summary

Okta integrates with Dapr the same way as other OIDC providers: Dapr fetches the JWKS, validates the token signature and claims, and forwards user attributes as headers. Group-based authorization in your service is straightforward since Okta can include group memberships directly in the JWT. This approach works for both employee-facing applications (PKCE flow) and service-to-service calls (client credentials).
