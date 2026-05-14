# How to Explain Calico Component Version Compatibility to Your Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Version Compatibility, CNI, Team Communication

Description: A practical guide for explaining Calico version compatibility concepts to engineering teams, covering the compatibility matrix, upgrade order, and version skew risks.

---

## Introduction

Version compatibility is one of those topics that teams only pay attention to after a production incident caused by an incompatible upgrade. Explaining version compatibility proactively - before the incident - requires making the risks concrete and the process clear.

This post gives you the language and examples to explain Calico version compatibility to developers, SREs, and managers in a way that motivates the right upgrade practices.

## Prerequisites

- Knowledge of your cluster's current Calico and Kubernetes versions
- Understanding of your organization's Kubernetes upgrade cadence
- Access to the Tigera compatibility matrix

## The Sliding Window Analogy

Start with an analogy for Calico's tested Kubernetes version window:

> "Calico's tested Kubernetes versions are like a sliding window. Calico 3.27 is tested with Kubernetes 1.27, 1.28, and 1.29. Calico 3.28 is tested with 1.27, 1.28, 1.29, and 1.30. If you're still running Calico 3.24 and upgrade Kubernetes to 1.28, you're outside the tested window - and you should upgrade Calico first."

Draw the window:
```plaintext
Kubernetes:  1.22  1.23  1.24  1.25  1.26  1.27  1.28  1.29  1.30
Calico 3.24: [  yes  yes  yes  yes  ]
Calico 3.25:       [  yes  yes  yes  yes  yes  yes  ]
Calico 3.26:             [  yes  yes  yes  yes  yes  ]
Calico 3.27:                         [  yes  yes  yes  ]
Calico 3.28:                         [  yes  yes  yes  yes  ]
```

This makes it visually obvious why "I'll upgrade Kubernetes but leave Calico alone" becomes risky when Kubernetes leaps beyond the versions your Calico release is tested against.

## What to Tell SREs

SREs need to build version compatibility checks into their operational processes:

```bash
# Add this check to your cluster health runbook

K8S_MINOR=$(kubectl version -o json 2>/dev/null | sed -n '/"serverVersion"/,/"platform"/s/.*"minor": "\([0-9][0-9]*\).*/1.\1/p')
CALICO_NAMESPACE=$(kubectl get pods -A -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.namespace}')
CALICO_VERSION=$(kubectl get pods -n "$CALICO_NAMESPACE" -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}' | grep -o 'v[0-9]*\.[0-9]*')
echo "Kubernetes: $K8S_MINOR | Calico: $CALICO_VERSION"
# Manually cross-reference with Tigera compatibility matrix
```

Ideally, this check is automated in your CI/CD pipeline and run before any upgrade.

## What to Tell Developers

Developers typically don't control Kubernetes upgrades but they do run `calicoctl`:

> "If you're using `calicoctl` to manage network policies, you need to keep your local `calicoctl` version in sync with the cluster's Calico version. Calls to `calicoctl` fail if the versions do not match, unless you explicitly override the check with `--allow-version-mismatch`."

Show the version check:
```bash
calicoctl version
# Compare Client Version and Cluster Version - they should match
```

## What to Tell Managers

Managers need to understand the scheduling implication:

> "Every time we upgrade Kubernetes, we need to check if we also need to upgrade Calico. These are not always simultaneous - sometimes we upgrade Calico first to ensure compatibility, then upgrade Kubernetes. Planning both upgrades together, with proper testing in staging, is more efficient than treating them as separate independent changes."

Provide a rough timeline:
- Kubernetes upgrade planning → check Calico compatibility first
- If Calico upgrade needed: upgrade Calico in staging (1 week) → production (1 week)
- Then upgrade Kubernetes in staging (1 week) → production (1 week)

## Common Compatibility Questions

**Q: What happens if I accidentally run an incompatible version?**
A: Failures are version-specific. Common symptoms include: API errors when applying CRDs, features missing that should be present, or calico-node pods crashing with version-related error messages.

**Q: Can I run different Calico versions on different nodes?**
A: No. All nodes must run the same Calico version. Mixed versions are not supported and cause unpredictable behavior.

**Q: Is calicoctl version always the same as calico-node?**
A: They should be. In practice, patch versions (3.27.0 vs 3.27.1) are generally compatible, but minor versions (3.27 vs 3.26) should always match.

## Best Practices

- Make version compatibility checking part of your pre-upgrade checklist
- Document both the Calico and Kubernetes versions in your infrastructure-as-code tooling
- Schedule Calico and Kubernetes upgrades together as a coordinated process
- Subscribe to Tigera security advisories to know when out-of-cycle upgrades are needed

## Conclusion

Version compatibility is a cross-functional concern - it touches development (calicoctl), operations (cluster upgrades), and management (planning). Explaining it with the sliding window analogy, concrete version checks, and an integrated upgrade planning process gives each audience what they need to participate correctly in version management decisions.
