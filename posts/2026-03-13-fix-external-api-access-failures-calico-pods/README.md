# How to Fix External API Access Failures from Calico Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, API Access, Egress, Network Policy

Description: Fix external API access failures from Calico pods by adding targeted egress allow rules, enabling NAT, and resolving DNS and HTTPS connectivity issues.

---

## Introduction

External API access failures are fixed by addressing the specific blocking layer: missing egress network policy rules for HTTPS traffic, disabled NAT causing API servers to reject non-routable source IPs, or DNS failures preventing hostname resolution. Each fix is safe to apply independently without disrupting other traffic.

## Prerequisites

- Calico cluster with external API access failures confirmed by diagnosis
- `calicoctl` CLI and `kubectl` with admin access

## Step 1: Fix - Add DNS and HTTPS Egress Allow Rules

The most common fix: add explicit Allow rules for DNS and HTTPS egress in the namespace or globally.

```yaml
# fix-external-api-egress.yaml
# Namespace-scoped policy to allow external API access
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-external-api-egress
  namespace: production
spec:
  order: 100
  selector: all()
  egress:
    # Allow DNS queries to resolve API hostnames
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
    - action: Allow
      protocol: TCP
      destination:
        ports: [53]
    # Allow HTTPS to external API endpoints
    - action: Allow
      protocol: TCP
      destination:
        ports: [443]
        nets: ["0.0.0.0/0"]
```

```bash
# Apply the egress fix
calicoctl apply -f fix-external-api-egress.yaml

# Verify the policy was applied
calicoctl get networkpolicy allow-external-api-egress -n production -o yaml

# Test immediately
kubectl run api-test --image=nicolaka/netshoot --rm -it --restart=Never -- \
  curl -s --connect-timeout 10 https://api.example.com
```

## Step 2: Fix - Enable NAT on the IP Pool

If the external API server rejects connections because it sees a non-routable pod IP as the source, enable NAT.

```bash
# Check current NAT state
calicoctl get ippool default-ipv4-ippool -o jsonpath='{.spec.natOutgoing}'

# Enable NAT outgoing
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec": {"natOutgoing": true}}'

# Verify pods now appear with node IP to external services
kubectl run source-ip-test --image=nicolaka/netshoot --rm -it --restart=Never -- \
  curl -s https://ifconfig.me
# Should return the node IP, not a pod IP
```

## Step 3: Fix - Add Specific API Endpoint to Egress Policy

For stricter security, add only specific API endpoints to the egress allow list rather than all external HTTPS.

```yaml
# fix-specific-api-egress.yaml
# Allows access to specific external API endpoints only
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-specific-api
  namespace: production
spec:
  order: 100
  selector: app == "backend"
  egress:
    # Allow DNS
    - action: Allow
      protocol: UDP
      destination:
        ports: [53]
    # Allow only the specific API endpoint by IP range
    - action: Allow
      protocol: TCP
      destination:
        nets: ["104.18.0.0/16"]   # Example: Cloudflare IP range for your API
        ports: [443]
```

```bash
# Apply the specific policy
calicoctl apply -f fix-specific-api-egress.yaml
```

## Step 4: Fix - Configure HTTPS Proxy for Inspected Traffic

If the cluster uses a corporate proxy that performs HTTPS inspection, configure pods to use the proxy.

```yaml
# Patch the deployment to use the corporate proxy
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: backend
          env:
            - name: HTTPS_PROXY
              value: "http://proxy.corporate.internal:3128"
            - name: NO_PROXY
              value: "10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,cluster.local"
```

```bash
# Apply the proxy configuration
kubectl apply -f proxy-config.yaml

# Also add the proxy CA certificate to the pod's trust store
# (depends on your application framework)
```

## Step 5: Validate All External API Calls Succeed

Run a comprehensive test after applying fixes.

```bash
#!/bin/bash
# validate-external-api-access.sh
NAMESPACE="production"

# Create a test pod
kubectl run api-validate --image=nicolaka/netshoot -n "${NAMESPACE}" \
  --restart=Never -- sleep 120

kubectl wait pod/api-validate -n "${NAMESPACE}" \
  --for=condition=Ready --timeout=30s

# Test DNS
DNS_TEST=$(kubectl exec api-validate -n "${NAMESPACE}" -- \
  nslookup api.example.com 2>&1)
echo "${DNS_TEST}" | grep -q "Address" && \
  echo "OK: DNS resolved" || echo "FAIL: DNS resolution failed"

# Test HTTPS
HTTPS_TEST=$(kubectl exec api-validate -n "${NAMESPACE}" -- \
  curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 https://api.example.com)
[ "${HTTPS_TEST}" = "200" ] && \
  echo "OK: HTTPS API accessible (HTTP ${HTTPS_TEST})" || \
  echo "FAIL: HTTPS returned ${HTTPS_TEST}"

# Clean up
kubectl delete pod api-validate -n "${NAMESPACE}" --ignore-not-found
```

## Best Practices

- Add DNS egress rules before HTTPS egress rules - HTTPS calls fail silently if DNS is blocked
- Use namespace-scoped NetworkPolicies for per-team API access rather than global policies when teams have different external API requirements
- Audit egress allow rules quarterly to remove rules for APIs that are no longer used
- Monitor external API call success rates with OneUptime to catch policy-related regressions quickly

## Conclusion

Fixing external API access failures from Calico pods requires adding explicit DNS and HTTPS egress allow rules, enabling NAT if external services require routable source IPs, and configuring proxy settings if corporate HTTPS inspection is in place. Always validate with an end-to-end connectivity test after each fix before closing the incident.
