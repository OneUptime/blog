# How to Document Istio Security Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security Policies, Documentation, Authorization, Compliance

Description: Create comprehensive documentation for Istio security policies including AuthorizationPolicy, PeerAuthentication, and RequestAuthentication resources.

---

Security policies in Istio control who can talk to whom, what authentication is required, and what operations are permitted. These policies are critical infrastructure, and when they're not documented, troubleshooting access issues becomes a nightmare. Someone opens a ticket saying "my service can't reach the database," and you have no idea if that's by design or a misconfiguration.

## Why Security Policy Documentation Matters

Unlike routing rules, which mostly affect performance and availability, security policies affect access and compliance. You need documentation for:

- **Incident response**: When something is blocked, you need to quickly determine if the block is intentional
- **Compliance audits**: Auditors want to see what access controls are in place and who approved them
- **Onboarding**: New team members need to understand what services their code can access
- **Change management**: Before modifying a policy, you need to understand what it currently does

## Documenting AuthorizationPolicies

AuthorizationPolicies are the primary access control mechanism in Istio. Here's how to document them effectively:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-service-access
  namespace: production
  annotations:
    docs.security/description: "Restricts access to payment service to authorized consumers"
    docs.security/owner: "security-team"
    docs.security/approved-by: "jane.smith"
    docs.security/approved-date: "2026-01-15"
    docs.security/review-due: "2026-07-15"
    docs.security/compliance: "PCI-DSS Requirement 7.1"
spec:
  selector:
    matchLabels:
      app: payment-service
  action: ALLOW
  rules:
  # Rule 1: Checkout service can create and read payments
  - from:
    - source:
        principals:
        - "cluster.local/ns/production/sa/checkout-service"
    to:
    - operation:
        methods: ["POST", "GET"]
        paths: ["/api/v1/payments", "/api/v1/payments/*"]
  # Rule 2: Admin dashboard can read payment data
  - from:
    - source:
        principals:
        - "cluster.local/ns/admin/sa/admin-dashboard"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/v1/payments", "/api/v1/payments/*"]
  # Rule 3: Monitoring can access health endpoints
  - from:
    - source:
        principals:
        - "cluster.local/ns/monitoring/sa/prometheus"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/health", "/metrics"]
```

## Generating a Security Policy Report

Create a script that extracts all security policies into a readable report:

```bash
#!/bin/bash
# security-policy-report.sh

echo "# Istio Security Policy Report"
echo "Generated: $(date -u +%FT%TZ)"
echo ""

echo "## Authorization Policies"
echo ""

kubectl get authorizationpolicies -A -o json | jq -r '
  .items[] |
  "### " + .metadata.name + " (ns: " + .metadata.namespace + ")\n" +
  "**Action:** " + (.spec.action // "ALLOW") + "\n" +
  "**Applied to:** " + (.spec.selector.matchLabels | to_entries | map(.key + "=" + .value) | join(", ")) + "\n" +
  "**Owner:** " + (.metadata.annotations["docs.security/owner"] // "Unknown") + "\n" +
  "**Compliance:** " + (.metadata.annotations["docs.security/compliance"] // "N/A") + "\n" +
  "\n| Source | Methods | Paths |\n|--------|---------|-------|\n" +
  (
    .spec.rules[]? |
    "| " +
    ((.from[0].source.principals // ["any"]) | join(", ")) +
    " | " +
    ((.to[0].operation.methods // ["*"]) | join(", ")) +
    " | " +
    ((.to[0].operation.paths // ["/*"]) | join(", ")) +
    " |"
  ) +
  "\n"
'

echo "## PeerAuthentication Policies"
echo ""

kubectl get peerauthentications -A -o json | jq -r '
  .items[] |
  "### " + .metadata.name + " (ns: " + .metadata.namespace + ")\n" +
  "**mTLS Mode:** " + (.spec.mtls.mode // "UNSET") + "\n" +
  (
    if .spec.portLevelMtls then
      "**Port-Level Settings:**\n" +
      (.spec.portLevelMtls | to_entries[] | "- Port " + .key + ": " + .value.mode)
    else ""
    end
  ) +
  "\n"
'
```

## Documenting PeerAuthentication

PeerAuthentication controls mTLS between services. Document the mTLS posture of each namespace:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: production-mtls
  namespace: production
  annotations:
    docs.security/description: |
      Enforces strict mTLS for all services in production namespace.
      Exception: Port 3306 for MySQL uses PERMISSIVE because the
      MySQL client library does not support Istio mTLS directly.
      The MySQL connection uses its own TLS (configured in the client).
    docs.security/approved-by: "security-team"
    docs.security/exception-ticket: "SEC-2024-089"
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    3306:
      mode: PERMISSIVE
```

The annotation on the exception is especially important. Auditors will ask why port 3306 has relaxed mTLS, and the ticket reference gives them the full context.

## Documenting RequestAuthentication

RequestAuthentication handles JWT validation for end-user authentication:

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
  annotations:
    docs.security/description: |
      Validates JWT tokens from our Auth0 tenant.
      Tokens are expected in the Authorization header as Bearer tokens.
      The JWKS endpoint is cached by Envoy with a 5-minute TTL.
    docs.security/auth-provider: "Auth0"
    docs.security/auth-tenant: "company.auth0.com"
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
  - issuer: "https://company.auth0.com/"
    jwksUri: "https://company.auth0.com/.well-known/jwks.json"
    audiences:
    - "https://api.company.com"
    forwardOriginalToken: true
```

## Building an Access Control Matrix

One of the most useful documentation artifacts is an access control matrix showing which services can communicate with which:

```bash
#!/bin/bash
# access-matrix.sh

echo "# Access Control Matrix"
echo ""
echo "| Source Service | Destination Service | Methods | Paths | Policy |"
echo "|---------------|-------------------|---------|-------|--------|"

kubectl get authorizationpolicies -A -o json | jq -r '
  .items[] |
  .metadata.name as $policy |
  .metadata.namespace as $ns |
  .spec.rules[]? |
  . as $rule |
  (($rule.from // [{}])[0].source.principals // ["any"])[] as $source |
  (($rule.to // [{}])[0].operation.methods // ["*"]) as $methods |
  (($rule.to // [{}])[0].operation.paths // ["/*"]) as $paths |
  "| " + $source +
  " | " + $ns + "/" + ($rule | tostring | split(",")[0]) +
  " | " + ($methods | join(", ")) +
  " | " + ($paths | join(", ")) +
  " | " + $policy + " |"
'
```

For a cleaner view, maintain a manual matrix document:

```markdown
## Access Control Matrix - Production

| Source | payment-svc | order-svc | user-svc | inventory-svc |
|--------|:-----------:|:---------:|:--------:|:-------------:|
| checkout-svc | RW | RW | R | R |
| admin-dashboard | R | R | RW | R |
| monitoring | Health | Health | Health | Health |
| external (JWT) | - | R | R | - |

Legend: R = Read, W = Write, RW = Read/Write, Health = /health + /metrics only
```

## Policy Change Documentation

Every security policy change should be documented with context:

```markdown
# Security Policy Changelog

## 2026-02-24 - Added inventory-service read access for analytics
- **Policy:** inventory-service-access
- **Change:** Added analytics-service SA to ALLOW rules with GET only
- **Reason:** Analytics team needs to query inventory levels for reports
- **Approved by:** security-team (SEC-2026-042)
- **Risk:** Low - read-only access to non-sensitive inventory data
- **Rollback:** Remove analytics-service principal from rules[2].from

## 2026-02-15 - Tightened payment-service access
- **Policy:** payment-service-access
- **Change:** Removed wildcard path matching, added explicit path list
- **Reason:** Compliance finding in PCI audit (Finding #PCI-2026-003)
- **Approved by:** compliance-team, security-team
- **Risk:** Medium - could break integrations using undocumented paths
- **Rollback:** Revert to previous version in git (commit abc1234)
```

## Automated Compliance Reporting

For compliance frameworks that require periodic access reviews, automate the report generation:

```bash
#!/bin/bash
# compliance-report.sh

echo "# Security Policy Compliance Report"
echo "Report Date: $(date -u +%FT%TZ)"
echo "Cluster: production-us-east-1"
echo ""

echo "## 1. mTLS Coverage"
TOTAL_NS=$(kubectl get ns -l istio-injection=enabled -o name | wc -l)
STRICT_NS=$(kubectl get peerauthentications -A -o json | jq '[.items[] | select(.spec.mtls.mode == "STRICT")] | length')
echo "- Namespaces with Istio: $TOTAL_NS"
echo "- Namespaces with STRICT mTLS: $STRICT_NS"
echo ""

echo "## 2. Authorization Policies"
TOTAL_AP=$(kubectl get authorizationpolicies -A -o name | wc -l)
DENY_AP=$(kubectl get authorizationpolicies -A -o json | jq '[.items[] | select(.spec.action == "DENY")] | length')
echo "- Total policies: $TOTAL_AP"
echo "- DENY policies: $DENY_AP"
echo ""

echo "## 3. Policies Due for Review"
kubectl get authorizationpolicies -A -o json | jq -r '
  .items[] |
  select(.metadata.annotations["docs.security/review-due"] != null) |
  "- " + .metadata.name + " (ns: " + .metadata.namespace + ") - Due: " + .metadata.annotations["docs.security/review-due"]
'
echo ""

echo "## 4. Policies Without Documentation"
kubectl get authorizationpolicies -A -o json | jq -r '
  .items[] |
  select(.metadata.annotations["docs.security/description"] == null) |
  "- " + .metadata.name + " (ns: " + .metadata.namespace + ") - MISSING DESCRIPTION"
'
```

Run this report monthly and include it in your compliance documentation package. The fact that it's auto-generated from live configuration gives auditors confidence that it reflects reality.

Good security policy documentation is not optional. It's the difference between a security team that can respond to incidents in minutes and one that spends hours figuring out which policies apply to which services. Keep the documentation close to the policies, automate what you can, and make policy changes traceable.
