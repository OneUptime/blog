# Troubleshooting Cilium Security Policy Limitations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Network Security, Troubleshooting

Description: A practical guide to diagnosing and resolving issues caused by Cilium security policy limitations in Kubernetes clusters. Learn the tools and techniques to identify policy enforcement gaps.

---

## Introduction

When Cilium security policies do not behave as expected, it is often due to inherent limitations in how Cilium processes and enforces rules. Troubleshooting these issues requires a systematic approach and familiarity with Cilium's diagnostic tools.

This guide provides step-by-step troubleshooting procedures for the most common problems related to Cilium security limitations. Whether you are dealing with policies that silently fail, identity resolution issues, or L7 inspection problems, you will find actionable solutions here.

Effective troubleshooting starts with understanding what Cilium can and cannot do, and then using its built-in observability features to pinpoint the root cause.

## Prerequisites

- A running Kubernetes cluster with Cilium installed (v1.14+)
- `cilium` CLI tool installed
- `kubectl` configured for cluster access
- Hubble CLI installed for flow observation
- Access to the `cilium-dbg` CLI inside Cilium agent pods
- Familiarity with CiliumNetworkPolicy resources

## Diagnosing Policy Enforcement Failures

The first step in troubleshooting is determining whether policies are being applied correctly.

```bash
# List Cilium endpoints on a Cilium agent and their policy enforcement status
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg endpoint list -o json | \
  jq '.[] | {id: .id, labels: .status.labels, policy: .status.policy.realized}'

# Check for endpoints in a "not-ready" state
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg endpoint list -o json | \
  jq '.[] | select(.status.state != "ready") | {id: .id, state: .status.state, labels: .status.labels}'

# View detailed status for a specific endpoint
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg endpoint get <ENDPOINT_ID> -o json | jq '.status.policy'
```

### Identifying Identity Resolution Issues

Identity mismatches are a common cause of policy failures. When a pod's identity does not match what the policy expects, traffic may be dropped or allowed incorrectly.

```bash
# List all identities known to Cilium
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg identity list

# Check the identity assigned to a specific pod
kubectl get ciliumendpoint <POD_NAME> -n <NAMESPACE> -o json | \
  jq '.status.identity'

# Verify that identity labels match your policy selectors
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg identity get <IDENTITY_ID> -o json | jq '.labels'
```

### Debugging DNS-Based Policy Issues

DNS-based policies require DNS queries to pass through Cilium's DNS proxy. If DNS resolution happens outside this path, policies will not match.

```bash
# Check the Cilium DNS proxy status
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg status --verbose | grep -A 10 "DNS"

# View cached FQDN to IP mappings
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg fqdn cache list

# Monitor DNS queries in real time
hubble observe --protocol dns --output json | \
  jq '.flow | {src: .source.labels, dst: .destination_names, verdict: .verdict}'
```

```yaml
# Ensure pods are forced to use cluster DNS
# Check that the pod's dnsPolicy is set correctly
apiVersion: v1
kind: Pod
metadata:
  name: debug-dns
  namespace: production
spec:
  dnsPolicy: ClusterFirst
  restartPolicy: Never
  containers:
    - name: debug
      image: busybox:1.36
      # Verify DNS configuration inside the pod
      command: ["cat", "/etc/resolv.conf"]
```

## Analyzing L7 Policy Processing Issues

Layer 7 policies add complexity and potential failure points. Use these techniques to diagnose L7-related problems.

```bash
# Check Envoy proxy status on a Cilium agent
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg status --verbose | \
  grep -A 15 "Proxy"

# View Envoy access logs for denied requests
kubectl -n kube-system logs ds/cilium -c cilium-agent | \
  grep "403\|denied\|DROP"

# Monitor L7 policy verdicts in real time
hubble observe --verdict DROPPED --type l7 --output compact
```

## Using Hubble for Flow Analysis

Hubble provides deep visibility into network flows and is essential for troubleshooting Cilium policy issues.

```bash
# Observe all dropped flows in a namespace
hubble observe --namespace production --verdict DROPPED --output json | \
  jq '.flow | {
    src: .source.labels,
    dst: .destination.labels,
    port: .l4.TCP.destination_port,
    reason: .drop_reason_desc
  }'

# Check flow statistics for policy-related drops
hubble observe --verdict DROPPED --output json | \
  jq -r '.flow.drop_reason_desc' | sort | uniq -c | sort -rn

# Generate a Hubble flow summary
hubble observe --last 1000 --output json | \
  jq -s '[.[].flow.verdict] | group_by(.) | map({verdict: .[0], count: length})'
```

## Verification

After applying fixes, verify that policies are working correctly.

```bash
# Run a connectivity test using Cilium's built-in test suite
cilium connectivity test

# Check health for a specific endpoint
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg endpoint health <ENDPOINT_ID>

# Verify specific policy rules are in the realized state
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg endpoint get <ENDPOINT_ID> -o json | jq '.status.policy.realized'

# Monitor for any remaining policy drops
kubectl -n kube-system exec ds/cilium -c cilium-agent -- \
  cilium-dbg monitor --type drop --json | head -50
```

## Troubleshooting

- **Endpoints stuck in regenerating state**: Check Cilium agent logs with `kubectl -n kube-system logs ds/cilium -c cilium-agent | grep "regenerat"`.
- **FQDN cache empty**: Confirm that the DNS proxy is enabled with `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg status --verbose` and that pods resolve DNS through kube-dns.
- **L7 policies not matching**: Verify the Envoy proxy is running correctly and that the port matches the application protocol.
- **High drop rate after policy change**: Use `hubble observe --verdict DROPPED` to identify which flows are affected and adjust the policy accordingly.

## Conclusion

Troubleshooting Cilium security limitations requires a methodical approach using the CLI tools, Hubble observability, and careful analysis of endpoint identities and policy states. By building familiarity with these diagnostic techniques, you can quickly identify whether an issue stems from a Cilium limitation or a policy misconfiguration, and apply the appropriate fix. Regular monitoring with Hubble and periodic connectivity tests help catch issues before they impact production workloads.
