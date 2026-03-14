# How to Avoid Common Mistakes with Calico Product Editions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, CNI, Troubleshooting, Best Practices, Calico Cloud, Calico Enterprise

Description: The most common pitfalls when selecting, deploying, or migrating between Calico editions, and how to avoid them before they become production incidents.

---

## Introduction

Calico edition mistakes tend to fall into two categories: choosing the wrong edition for your requirements (discovered too late), and misconfiguring the edition you did choose (discovered in production). Both categories are entirely preventable with the right knowledge.

The most painful mistakes happen at the boundary between editions - when teams assume that Open Source and Enterprise have identical APIs, or when they attempt a migration without reading the upgrade documentation. This post catalogs the most common mistakes so you can skip the costly lessons.

Understanding these pitfalls also helps you review your current deployment and identify risks before they surface as outages or compliance failures.

## Prerequisites

- An existing or planned Calico deployment
- Awareness of which Calico edition you are currently running
- Access to your cluster's Calico configuration

## Mistake 1: Assuming All Editions Have the Same CRDs

Calico Open Source does not include CRDs for Enterprise-only resources such as `GlobalThreatFeed`, `PacketCapture`, `PolicyRecommendation`, and `Tier` (with full RBAC). If you apply a manifest written for Enterprise against an Open Source cluster, it will fail with an unknown resource error.

**Fix**: Always verify which CRDs are installed before applying manifests from external sources:

```bash
kubectl get crd | grep calico
```

## Mistake 2: Migrating Editions Without Draining Policies First

Migrating from Open Source to Enterprise without backing up and auditing existing policies can result in policy conflicts when Enterprise's tier ordering takes effect. The `default` tier in Enterprise has lower priority than any named tier - policies that previously applied globally may be shadowed.

**Fix**: Before migration, export all existing policies:

```bash
calicoctl get networkpolicy --all-namespaces -o yaml > np-backup.yaml
calicoctl get globalnetworkpolicy -o yaml > gnp-backup.yaml
```

Review tier ordering and re-test all policies in a staging environment before promoting to production.

## Mistake 3: Confusing Calico Cloud's SaaS Model with Data Privacy

Some teams deploy Calico Cloud without realizing that flow log metadata (source IP, destination IP, port, action) is transmitted to Tigera's SaaS infrastructure. This is not a security vulnerability - the data is encrypted and governed by Tigera's privacy policy - but it may violate internal data residency policies or regulatory requirements.

**Fix**: If your data cannot leave your infrastructure boundary, use Calico Enterprise (self-hosted) instead of Calico Cloud.

## Mistake 4: Installing an Incompatible Version for the Kubernetes Release

Each Calico version supports a specific range of Kubernetes versions. Installing Calico 3.24 on a cluster running Kubernetes 1.28 can cause API deprecation errors or feature incompatibilities.

**Fix**: Always check the Calico compatibility matrix before upgrading either Calico or Kubernetes:

```bash
# Check current Calico version
kubectl get pods -n kube-system -l k8s-app=calico-node \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

Cross-reference with the Tigera documentation at `docs.tigera.io/calico/latest/getting-started/kubernetes/requirements`.

## Mistake 5: Not Enabling the Calico API Server for Enterprise

Calico Enterprise includes a dedicated API server that enables `kubectl` to manage Calico resources directly using the `crd.projectcalico.org` API group. Teams that skip enabling it lose access to `kubectl`-native policy management.

**Fix**: Verify the API server is running after Enterprise installation:

```bash
kubectl get pods -n calico-system -l k8s-app=calico-apiserver
```

## Best Practices

- Treat edition selection as a compliance decision, not just a technical one - document your rationale
- Never assume feature parity between editions - always validate against the Tigera feature matrix
- Test policy behavior in a lab after any edition change, even minor version upgrades
- Keep `calicoctl` version in sync with the installed Calico version - version mismatches cause silent errors

## Conclusion

Most Calico edition mistakes stem from incorrect assumptions about feature parity, data handling, or migration behavior. By validating CRD availability before applying manifests, backing up policies before migration, understanding Calico Cloud's SaaS data model, and keeping versions synchronized, you can avoid the most common and costly edition-related incidents.
