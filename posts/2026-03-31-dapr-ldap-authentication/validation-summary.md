# Validation Summary: How to Use Dapr with LDAP Authentication

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (middleware pipeline, HTTP pipeline configuration, access control)
- LDAP (OpenLDAP / Active Directory)
- Go (net/http, go-ldap/ldap library)
- Python (ldap3 library)
- OAuth2 / OIDC (oauth2-proxy with LDAP backend)
- Kubernetes (Dapr component and configuration YAML)

## Sources Consulted
- Dapr OAuth2 middleware component reference: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2/
- Dapr HTTP pipeline configuration: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr access control documentation: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- go-ldap/ldap v3 package on pkg.go.dev: https://pkg.go.dev/github.com/go-ldap/ldap/v3
- gopkg.in/ldap.v3 (deprecated): https://pkg.go.dev/gopkg.in/ldap.v3
- Python ldap3 library documentation: https://ldap3.readthedocs.io/

## Issues Found
1. **Deprecated Go import path for LDAP library**: The post used `gopkg.in/ldap.v3` which is a deprecated/legacy import path. Changed to `github.com/go-ldap/ldap/v3`, which is the current actively maintained module. The API (`DialURL`, `Bind`, `Close`) is compatible across both paths, so no other code changes were needed.

## Review Notes
- The "Configuring Dapr App with Group-Based Authorization" section shows standard Dapr service-to-service access control policies, which control which apps can invoke which other apps. It does not actually wire up LDAP group memberships to authorization decisions. The YAML itself is valid Dapr configuration, but the section title implies a tighter integration with LDAP groups than what is shown. A future improvement could clarify that LDAP group-based authorization logic would need to be implemented in application code, using the group extraction shown in the Python example.
- The Go and Python code examples construct LDAP DNs and search filters by directly interpolating user input (e.g., `fmt.Sprintf("uid=%s,...")`), which could be vulnerable to LDAP injection in a production setting. Consider noting the need for input sanitization in a security-focused post.
- The Python ldap3 code is correct and uses current API patterns (`Server`, `Connection` with `auto_bind=True`, `conn.search`, `entry.cn.value`).
- The Dapr OAuth2 middleware component YAML uses correct field names (`clientId`, `clientSecret`, `scopes`, `authURL`, `tokenURL`, `redirectURL`) per current Dapr documentation.
