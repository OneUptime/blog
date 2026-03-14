# How to Operationalize Calico IPAM Release Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, IPAM

Description: Build operational processes for regular Calico IPAM release operations including monthly release schedules, approval workflows, documentation requirements, and post-release verification procedures.

---

## Introduction

Operationalizing IPAM release workflows means scheduling them as a routine maintenance operation rather than an emergency response. Monthly IPAM maintenance windows that include leak detection, candidate review, releases, and post-release verification keep IPAM clean without the urgency of an incident.

## Key Operations

```bash
# Run IPAM check to identify issues
calicoctl ipam check

# Verify specific IP before release
IP="192.168.1.42"
kubectl get pod --all-namespaces -o wide | grep "${IP}"
kubectl get endpoints --all-namespaces | grep "${IP}"

# Release after verification (no pod found)
calicoctl ipam release --ip="${IP}"

# Post-release verification
calicoctl ipam check
calicoctl ipam show | grep "${IP}"  # Should show no output
```

## Workflow Summary

```mermaid
flowchart TD
    A[Detect leaked IPs via ipam check] --> B[Verify each IP not in use]
    B --> C{IP in use?}
    C -->|Yes| D[Investigate - do not release]
    C -->|No| E[Get approval]
    E --> F[calicoctl ipam release --ip=IP]
    F --> G[Run ipam check to verify]
    G --> H[Document in ticket]
```

## Best Practices

```bash
# Always run check before and after releases
calicoctl ipam check  # Before
# ... run releases ...
calicoctl ipam check  # After - should still show "consistent"

# Never bulk-release without individual verification
# for ip in $(leaked-ips); do release ${ip}; done  # DANGEROUS without verify

# Correct approach: verify each one
for ip in $(cat release-candidates.txt); do
  IN_USE=$(kubectl get pod --all-namespaces -o wide | grep -c "${ip}" || echo 0)
  if [ "${IN_USE}" -eq 0 ]; then
    calicoctl ipam release --ip="${ip}"
    echo "Released ${ip}"
  else
    echo "SKIP ${ip} - still in use"
  fi
done
```

## Conclusion

Calico IPAM release workflows require discipline at every step: detect leaks with `calicoctl ipam check`, verify each IP is not in use before releasing, get human approval, and run post-release consistency checks. The verification step is non-negotiable - automating it away to save time is the most common source of IPAM corruption. Build the per-IP verification into every release script and treat any script that doesn't verify as unsafe.
