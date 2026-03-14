# How to Prevent External API Access Failures from Calico Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Prevention, API Access, Egress, Network Policy

Description: Prevent external API access failures from Calico pods through correct default policy design, NAT configuration, and pre-deployment connectivity validation.

---

## Introduction

External API access failures are preventable by designing network policies correctly from the start and including connectivity tests in your deployment validation. The key principle is that default-deny network policies must explicitly allow DNS resolution and HTTPS egress, and this requirement must be part of your policy review and deployment pipeline rather than something you discover after deploying to production.

## Prerequisites

- Calico cluster with network policy management workflow established
- CI/CD pipeline where validation gates can be added
- `calicoctl` and `kubectl` access

## Step 1: Create a Reusable External API Egress Policy

Maintain a standard GlobalNetworkPolicy that allows external API access and apply it to all namespaces that need it.

```yaml
# standard-external-api-egress.yaml
# Standard egress policy for namespaces that need external API access
# Apply this as a building block before adding default-deny policies
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-external-api-access
spec:
  order: 100  # Higher priority than default-deny
  # Apply to namespaces labeled with external-api-access: "true"
  namespaceSelector: external-api-access == "true"
  selector: all()
  egress:
    # DNS - required for all hostname-based API calls
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
    - action: Allow
      protocol: TCP
      destination:
        ports: [53]
    # HTTPS - required for all modern external APIs
    - action: Allow
      protocol: TCP
      destination:
        ports: [443]
    # HTTP - for health check endpoints that use HTTP
    - action: Allow
      protocol: TCP
      destination:
        ports: [80]
```

```bash
# Apply the standard egress policy
calicoctl apply -f standard-external-api-egress.yaml

# Label namespaces that need external API access
kubectl label namespace production external-api-access="true"
kubectl label namespace staging external-api-access="true"
```

## Step 2: Validate External API Access Before Applying Default-Deny

Always test external API access before applying a default-deny policy to a namespace.

```bash
#!/bin/bash
# validate-before-default-deny.sh
# Run this BEFORE applying any default-deny policy to a namespace

NAMESPACE="${1:?Provide namespace}"

echo "Testing external API access in namespace: ${NAMESPACE}"

# Test that workloads can reach external APIs
kubectl run api-pre-deny-test -n "${NAMESPACE}" \
  --image=nicolaka/netshoot --restart=Never -- sleep 30

kubectl wait pod/api-pre-deny-test -n "${NAMESPACE}" \
  --for=condition=Ready --timeout=30s

# Test DNS
kubectl exec api-pre-deny-test -n "${NAMESPACE}" -- \
  nslookup api.your-service.com && echo "OK: DNS" || echo "FAIL: DNS"

# Test HTTPS to your external API
HTTP_CODE=$(kubectl exec api-pre-deny-test -n "${NAMESPACE}" -- \
  curl -s -o /dev/null -w "%{http_code}" \
  --connect-timeout 10 "https://api.your-service.com/health" 2>/dev/null)
echo "External API HTTP response: ${HTTP_CODE}"

# Clean up
kubectl delete pod api-pre-deny-test -n "${NAMESPACE}" --ignore-not-found
```

## Step 3: Use a Policy Linting Tool

Add policy linting to your GitOps pipeline to catch policies that would block external API access.

```bash
#!/bin/bash
# lint-calico-policy.sh
# Checks a Calico policy file for missing egress rules

POLICY_FILE="${1:?Provide policy YAML file}"

# Check if the policy has Egress policyType but no egress rules
POLICY_TYPES=$(cat "${POLICY_FILE}" | \
  python3 -c "import sys, yaml; p = yaml.safe_load(sys.stdin); print(p.get('spec', {}).get('policyTypes', []))")

EGRESS_RULES=$(cat "${POLICY_FILE}" | \
  python3 -c "import sys, yaml; p = yaml.safe_load(sys.stdin); print(len(p.get('spec', {}).get('egress', [])))")

if echo "${POLICY_TYPES}" | grep -q "Egress" && [ "${EGRESS_RULES}" -eq 0 ]; then
  echo "WARNING: Policy has Egress policyType but no egress rules - this will block all egress including external APIs"
  exit 1
fi

# Check that DNS egress is included when Egress policyType is set
DNS_RULE=$(cat "${POLICY_FILE}" | \
  python3 -c "import sys, yaml; p = yaml.safe_load(sys.stdin); egress = p.get('spec', {}).get('egress', []); print(any(str(r) for r in egress if '53' in str(r)))")

if echo "${POLICY_TYPES}" | grep -q "Egress" && [ "${DNS_RULE}" = "False" ]; then
  echo "WARNING: Policy has Egress policyType but no DNS (port 53) egress rule - hostname resolution will fail"
fi

echo "Policy lint passed: ${POLICY_FILE}"
```

## Step 4: Add External API Tests to Deployment Pipeline

```yaml
# Example GitHub Actions step for external API validation
# .github/workflows/deploy.yaml
- name: Validate External API Access
  run: |
    bash scripts/validate-external-api-access.sh ${NAMESPACE}
  env:
    NAMESPACE: ${{ vars.TARGET_NAMESPACE }}
```

## Step 5: Document Required External APIs Per Service

Maintain a registry of external API dependencies per service so policy authors know what to allow.

```yaml
# external-api-registry.yaml (stored in git, reviewed as part of PR process)
services:
  backend:
    namespace: production
    external_apis:
      - host: api.stripe.com
        port: 443
        protocol: HTTPS
        purpose: Payment processing
      - host: api.sendgrid.com
        port: 443
        protocol: HTTPS
        purpose: Email notifications
```

## Best Practices

- Maintain a standard external API egress policy as a reusable building block applied via namespace labels
- Run external API connectivity tests before applying any default-deny policy to a namespace
- Lint network policy files in CI to catch missing DNS and HTTPS egress rules
- Keep an external API dependency registry per service so policy authors have the full picture when writing egress rules
- Include external API connectivity in your smoke test suite for every deployment

## Conclusion

Preventing external API access failures requires treating network policy design as a first-class concern: always include DNS and HTTPS egress allow rules in default-deny policies, validate external access before applying deny policies, and lint policies in CI. The operational overhead of these preventive measures is small compared to the cost of diagnosing production API access failures.
