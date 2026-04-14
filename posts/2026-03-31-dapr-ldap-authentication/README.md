# How to Use Dapr with LDAP Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, LDAP, Authentication, Security, Middleware

Description: Integrate LDAP authentication with Dapr using middleware pipelines to validate user credentials against an LDAP directory for incoming HTTP requests.

---

## LDAP Authentication in Dapr

Dapr does not have a built-in LDAP component, but you can integrate LDAP authentication through Dapr's middleware pipeline. Incoming HTTP requests are validated against an LDAP directory before reaching your application. This pattern is useful for user-facing APIs that need to authenticate against Active Directory or OpenLDAP.

## Architecture Overview

The flow is: Client request -> Dapr sidecar -> LDAP middleware -> Application

Implement LDAP auth as a custom middleware or use an OAuth2/OIDC proxy that backs into LDAP.

## Implementing LDAP Middleware

Create a custom Dapr middleware component in Go or via a sidecar middleware:

```go
package main

import (
    "fmt"
    "net/http"

    "github.com/go-ldap/ldap/v3"
)

func ldapAuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        username, password, ok := r.BasicAuth()
        if !ok {
            w.Header().Set("WWW-Authenticate", `Basic realm="LDAP Auth"`)
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        if err := authenticateLDAP(username, password); err != nil {
            http.Error(w, "Invalid credentials", http.StatusUnauthorized)
            return
        }

        next.ServeHTTP(w, r)
    })
}

func authenticateLDAP(username, password string) error {
    l, err := ldap.DialURL("ldap://ldap.example.com:389")
    if err != nil {
        return fmt.Errorf("LDAP connection failed: %w", err)
    }
    defer l.Close()

    userDN := fmt.Sprintf("uid=%s,ou=users,dc=example,dc=com", username)
    return l.Bind(userDN, password)
}
```

## Using OAuth2 Proxy with LDAP Backend

A more production-ready approach is to run oauth2-proxy with LDAP as the backend and configure Dapr to use the OAuth2 middleware:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oauth2-middleware
spec:
  type: middleware.http.oauth2
  version: v1
  metadata:
    - name: clientId
      value: "dapr-client"
    - name: clientSecret
      secretKeyRef:
        name: oauth2-secrets
        key: clientSecret
    - name: scopes
      value: "openid profile"
    - name: authURL
      value: "https://auth.example.com/oauth/authorize"
    - name: tokenURL
      value: "https://auth.example.com/oauth/token"
    - name: redirectURL
      value: "https://myapp.example.com/oauth2/callback"
```

Configure a pipeline to apply the middleware:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline
spec:
  httpPipeline:
    handlers:
      - name: oauth2-middleware
        type: middleware.http.oauth2
```

## Extracting LDAP Group Membership

After LDAP authentication, extract group memberships for authorization:

```python
import ldap3

def get_user_groups(username: str, password: str) -> list:
    server = ldap3.Server("ldap://ldap.example.com")
    conn = ldap3.Connection(
        server,
        user=f"uid={username},ou=users,dc=example,dc=com",
        password=password,
        auto_bind=True
    )

    conn.search(
        search_base="ou=groups,dc=example,dc=com",
        search_filter=f"(member=uid={username},ou=users,dc=example,dc=com)",
        attributes=["cn"]
    )

    return [entry.cn.value for entry in conn.entries]
```

## Configuring Dapr App with Group-Based Authorization

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: app-config
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "cluster.local"
    policies:
      - appId: ldap-authenticated-app
        defaultAction: allow
        namespace: production
```

## Summary

Integrate LDAP authentication with Dapr using a middleware pipeline that validates HTTP Basic Auth credentials against an LDAP directory. For production use, prefer running an OAuth2/OIDC proxy with an LDAP backend paired with Dapr's OAuth2 middleware component. Extract group memberships after authentication for fine-grained authorization decisions within your application.
