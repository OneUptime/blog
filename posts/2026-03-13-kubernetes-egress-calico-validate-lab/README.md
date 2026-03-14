# How to Validate Kubernetes Egress with Calico in a Lab Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Egress, CNI, Lab, Testing, Validation, Network Policy

Description: Step-by-step instructions for testing and validating Calico egress behavior including SNAT, egress network policies, and FQDN-based egress control in a lab environment.

---

## Introduction

Egress validation in Calico requires testing multiple layers: the default SNAT behavior, egress NetworkPolicy enforcement, and (for Cloud/Enterprise) FQDN-based policy enforcement. Each layer has distinct test cases and expected outcomes.

This guide walks through a complete egress validation suite you can run in a lab cluster. The tests are ordered from most basic (SNAT) to most advanced (FQDN policy), allowing you to confirm each layer before adding complexity.

## Prerequisites

- Calico installed on a lab cluster
- `kubectl` configured
- External internet connectivity from the cluster (for SNAT testing)
- A pod with `curl` or `wget` available (use `nicolaka/netshoot`)

## Validation 1: Confirm Default SNAT Behavior

Verify that pods use the node IP when reaching external destinations:

```bash
kubectl run egress-test --image=nicolaka/netshoot -- sleep 3600

# Check the source IP seen by an external service
kubectl exec egress-test -- curl -s https://ifconfig.me
# Expected: The node's external IP, not the pod's RFC 1918 IP
```

Verify the SNAT rule exists in iptables:
```bash
# On a worker node:
sudo iptables -t nat -L -n | grep -i "MASQUERADE\|calico"
```

## Validation 2: Test Basic Egress NetworkPolicy

Apply a deny-all egress policy and confirm it blocks external traffic:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-egress
  namespace: default
spec:
  podSelector:
    matchLabels:
      run: egress-test
  policyTypes:
  - Egress
  egress: []
EOF

# This should now fail (policy blocks egress)
kubectl exec egress-test -- curl --max-time 5 -s https://ifconfig.me
# Expected: timeout or connection refused
```

## Validation 3: Allow Specific CIDR Egress

Add an allow rule for a specific IP range and confirm it works:

```bash
# Get the IP of your external test endpoint
EXTERNAL_IP=$(kubectl exec egress-test -- dig +short ifconfig.me 2>/dev/null || echo "93.184.216.34")

kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-egress
  namespace: default
spec:
  podSelector:
    matchLabels:
      run: egress-test
  policyTypes:
  - Egress
  egress:
  - ports:
    - port: 443
      protocol: TCP
  - to:
    - ipBlock:
        cidr: ${EXTERNAL_IP}/32
EOF

kubectl exec egress-test -- curl --max-time 10 -s https://ifconfig.me
# Expected: Returns the node IP (SNAT applied, connection allowed)
```

## Validation 4: Test DNS Egress (Required for All Pods)

DNS resolution is often overlooked in egress policy validation. Pods need egress to port 53 (UDP and TCP) to resolve cluster DNS:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns-egress
  namespace: default
spec:
  podSelector:
    matchLabels:
      run: egress-test
  policyTypes:
  - Egress
  egress:
  - ports:
    - port: 53
      protocol: UDP
    - port: 53
      protocol: TCP
EOF

kubectl exec egress-test -- nslookup kubernetes.default.svc.cluster.local
# Expected: Resolves to the Kubernetes service ClusterIP
```

## Validation 5: FQDN Policy (Calico Cloud/Enterprise)

If running Calico Cloud or Enterprise, test FQDN-based egress:

```bash
kubectl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-fqdn-egress
  namespace: default
spec:
  selector: run == 'egress-test'
  egress:
  - action: Allow
    destination:
      domains:
      - ifconfig.me
  - action: Deny
EOF

kubectl exec egress-test -- curl --max-time 10 -s https://ifconfig.me
# Expected: Success (allowed by FQDN)

kubectl exec egress-test -- curl --max-time 5 -s https://example.com
# Expected: timeout (not in the FQDN allowlist)
```

## Validation Checklist

| Test | Expected Result |
|---|---|
| Default SNAT active | Pod uses node IP for external traffic |
| Deny-all egress blocks traffic | curl times out |
| CIDR-based allow works | curl succeeds to allowed CIDR |
| DNS egress allowed | nslookup resolves |
| FQDN policy enforced | Allowed domain reachable, others blocked |

## Best Practices

- Always test DNS egress explicitly — blocking DNS breaks all service resolution including internal services
- Validate egress policy in the same namespace isolation context you plan to use in production
- Use `calicoctl get workloadendpoints` to confirm policy is applied to the correct endpoints
- Test both allow and deny cases — a test that only confirms the allow path may not catch policy misconfiguration

## Conclusion

Egress validation requires confirming each layer independently: SNAT behavior, deny-all enforcement, CIDR allowlists, DNS egress, and (for commercial editions) FQDN policy. Running all five validation tests in order ensures that your egress control stack is correctly configured before you apply it to production workloads.
