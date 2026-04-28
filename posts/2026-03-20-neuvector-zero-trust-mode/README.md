# How to Set Up NeuVector Zero Trust Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Zero Trust, Container Security, Kubernetes, Network Security

Description: Implement a zero-trust security model with NeuVector by transitioning all container workloads to Protect mode with explicit deny-all defaults and whitelisted exceptions.

## Introduction

Zero trust security operates on the principle that no container, process, or network connection should be trusted by default. Every action must be explicitly authorized. NeuVector is purpose-built for zero-trust container security, providing the tools to implement "never trust, always verify" at the container level. This guide explains how to build a full zero-trust security posture.

## Zero Trust Principles in NeuVector

| Principle | NeuVector Implementation |
|---|---|
| Verify explicitly | Process profiles verify every process |
| Use least privilege | Network rules with default deny |
| Assume breach | Runtime monitoring with auto-quarantine |
| Micro-segmentation | Per-container group policies |
| Continuous validation | Ongoing behavioral monitoring |

## Prerequisites

- NeuVector installed with all components running
- All workloads have been in Discover mode for at least 48 hours
- Security policies have been reviewed and refined
- Change management approval for production workloads

## Step 1: Establish the Baseline

Before enforcing zero trust, ensure the baseline is accurate:

```bash
# Review discovered process profiles

curl -sk \
  "https://neuvector-manager:8443/v1/group?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '.groups[] | select(.policy_mode == "Discover") | .name'

# Review network rules for each group
curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=500" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.rules[] | select(.cfg_type == "learned")] | length'
```

## Step 2: Promote Learned Rules to User-Defined Rules

Convert auto-discovered rules into explicit policy:

```bash
# In the NeuVector UI:
# 1. Policy > Network Rules
# 2. Filter by Type: Learned
# 3. Select all relevant rules
# 4. Click "Promote" to convert to user-defined rules

# Via API - get learned rules and recreate as user rules
LEARNED_RULES=$(curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=500" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.rules[] | select(.cfg_type == "learned")]')

echo "Found $(echo ${LEARNED_RULES} | jq length) learned rules to review"
```

## Step 3: Add Default Deny Rules

Implement explicit default-deny at the network level:

```bash
# Add a deny-all rule at the lowest priority (omit "after" to insert last)
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/policy/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "rules": [
        {
          "id": 0,
          "comment": "Zero Trust: Deny all unmatched traffic",
          "from": "containers",
          "to": "containers",
          "ports": "any",
          "applications": [],
          "action": "deny",
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 4: Configure Zero-Trust Process Profiles

Remove permissive process rules and define explicit allowlists:

```yaml
# zero-trust-process-policy.yaml
apiVersion: neuvector.com/v1
kind: NvSecurityRule
metadata:
  name: nv.webapp.production
  namespace: production
spec:
  target:
    policymode: Protect
    selector:
      name: nv.webapp.production
      criteria:
        - key: service
          op: "="
          value: webapp.production
        - key: domain
          op: "="
          value: production
  process:
    # Explicitly allow only required processes
    - name: node
      path: /usr/local/bin/node
      action: allow
    - name: npm
      path: /usr/local/bin/npm
      action: allow
    # Explicitly deny attack vectors (path is optional for deny rules)
    - name: sh
      action: deny
    - name: bash
      action: deny
    - name: curl
      action: deny
    - name: wget
      action: deny
    - name: nc
      action: deny
    - name: nmap
      action: deny
    - name: python3
      action: deny
    - name: python
      action: deny
    - name: perl
      action: deny
    - name: ruby
      action: deny
```

## Step 5: Implement Micro-Segmentation

Create explicit network rules for every allowed communication:

```yaml
# micro-segmentation-policy.yaml
apiVersion: neuvector.com/v1
kind: NvClusterSecurityRule
metadata:
  name: production-zero-trust
  namespace: neuvector
spec:
  target:
    policymode: Protect
    selector:
      name: nv.web.production
      criteria:
        - key: service
          op: "="
          value: web.production
        - key: domain
          op: "="
          value: production
  ingress:
    # Only allow ingress from the load balancer
    - action: allow
      name: allow-lb-to-web
      selector:
        name: nv.ingress-nginx.ingress-nginx
        criteria:
          - key: service
            op: "="
            value: ingress-nginx.ingress-nginx
      ports: tcp/8080
      applications:
        - HTTP
  egress:
    # Allow web to API only
    - action: allow
      name: allow-web-to-api
      selector:
        name: nv.api.production
        criteria:
          - key: service
            op: "="
            value: api.production
      ports: tcp/3000
      applications:
        - HTTP
    # Allow API to database only
    - action: allow
      name: allow-api-to-db
      selector:
        name: nv.db.production
        criteria:
          - key: service
            op: "="
            value: db.production
      ports: tcp/5432
      applications:
        - PostgreSQL
    # Allow DNS resolution
    - action: allow
      name: allow-dns
      selector:
        name: nv.kube-dns.kube-system
        criteria:
          - key: service
            op: "="
            value: kube-dns.kube-system
      ports: udp/53
      applications:
        - DNS
    # Block all other egress to external destinations
    - action: deny
      name: deny-all-other-egress
      selector:
        name: external
        criteria:
          - key: address
            op: "="
            value: external
      ports: any
      applications: []
```

## Step 6: Enable Auto-Quarantine for Breaches

Configure automatic quarantine for containers that violate zero-trust policies:

```bash
# Create response rule for auto-quarantine (PATCH with insert.rules)
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/response/rule" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "insert": {
      "rules": [
        {
          "id": 0,
          "event": "security-event",
          "comment": "Zero Trust: Auto-quarantine on critical violations",
          "group": "containers",
          "conditions": [
            {"name": "level", "value": "critical"}
          ],
          "actions": ["quarantine", "webhook"],
          "webhooks": ["security-oncall"],
          "disable": false,
          "cfg_type": "user_created"
        }
      ]
    }
  }'
```

## Step 7: Transition to Protect Mode Gradually

Move namespaces to Protect mode incrementally:

```bash
#!/bin/bash
# gradual-protect-transition.sh

NAMESPACE="production"

# Get all service groups in the namespace (services have a domain field that
# matches the Kubernetes namespace)
SERVICES=$(curl -sk \
  "https://neuvector-manager:8443/v1/group" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r --arg ns "$NAMESPACE" \
  '.groups[] | select(.domain == $ns) | .name')

# Build a JSON array of service names for the batch service config call
SERVICE_JSON=$(echo "${SERVICES}" | jq -R . | jq -s .)

# Move all services in the namespace to Monitor mode in one batch request.
# Policy mode is set on services via PATCH /v1/service/config using the
# RESTServiceBatchConfig schema (services + policy_mode).
echo "Setting services in ${NAMESPACE} to Monitor mode..."
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/service/config" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "$(jq -n --argjson services "${SERVICE_JSON}" \
    '{config: {services: $services, policy_mode: "Monitor"}}')"

echo "All services in ${NAMESPACE} now in Monitor mode. Review events before switching to Protect."
```

## Step 8: Monitor Zero-Trust Effectiveness

Track violations to measure the effectiveness of zero-trust:

```bash
# Daily violation summary - events are at /v1/log/event
curl -sk \
  "https://neuvector-manager:8443/v1/log/event" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.events[] | {
    name: .name,
    level: .level
  }] | group_by(.name) | map({
    name: .[0].name,
    count: length
  })'
```

## Conclusion

Implementing zero trust with NeuVector requires a systematic approach: start in Discover mode, review and promote learned rules, add default-deny policies, harden process profiles, and gradually transition to Protect mode. The result is a security posture where every container action is explicitly authorized - making breaches detectable and limiting their blast radius. Zero trust is a journey, not a destination; continuously refine your policies as your applications evolve.
