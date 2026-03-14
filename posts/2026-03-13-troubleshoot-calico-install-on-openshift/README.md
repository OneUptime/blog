# How to Troubleshoot Installation Issues with Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Troubleshooting

Description: A guide to diagnosing and resolving Calico installation failures specific to OpenShift clusters.

---

## Introduction

OpenShift introduces several security and operator-management layers that can interfere with Calico installation. Security Context Constraints (SCCs) can prevent Calico pods from starting, the cluster network operator may conflict with Calico if not properly disabled, and OpenShift's strict RBAC model can block Calico's service accounts from reading the resources they need.

These OpenShift-specific failure modes require different diagnostic approaches than standard Kubernetes troubleshooting. This guide covers the most common Calico installation failures on OpenShift and how to resolve them.

## Prerequisites

- Calico installation attempted on OpenShift
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Check Operator and Calico Pod Status

```bash
oc get pods -n tigera-operator
oc get pods -n calico-system
oc get tigerastatus
```

## Step 2: Check Security Context Constraints

The most common OpenShift-specific failure is SCC violations.

```bash
oc describe pod -n calico-system <calico-node-pod> | grep -A5 "Warning"
```

Look for `forbidden: unable to validate against any security context constraint` errors.

Fix by ensuring the Calico SCC is applied:

```bash
oc apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/ocp/calico-scc.yaml
oc adm policy add-scc-to-user privileged -z calico-node -n calico-system
```

## Step 3: Verify Network Operator Is Unmanaged

If the cluster network operator is still active, it may try to reinstall OVN-Kubernetes.

```bash
oc get network.operator cluster -o jsonpath='{.spec.managementState}'
```

Should return `Unmanaged`. If not:

```bash
oc patch network.operator cluster \
  --type merge \
  --patch '{"spec":{"managementState":"Unmanaged"}}'
```

## Step 4: Check Calico Service Accounts and RBAC

```bash
oc get clusterrolebinding | grep calico
oc get sa -n calico-system
```

If RBAC resources are missing, re-apply the operator manifest.

## Step 5: Diagnose calico-node Pod Failures

```bash
oc logs -n calico-system -l k8s-app=calico-node --tail=50
oc describe pod -n calico-system -l k8s-app=calico-node
```

OpenShift-specific errors include:
- `unable to create new container: insufficient privileges` — SCC issue
- `failed to read /sys/kernel` — missing privileged access

## Step 6: Verify IP Pool Alignment

OpenShift uses a specific pod CIDR (often 10.128.0.0/14). Misalignment causes IPAM failures.

```bash
oc get network.config cluster -o jsonpath='{.spec.clusterNetwork}'
calicoctl get ippool default-ipv4-ippool -o yaml | grep cidr
```

If they don't match, update the IP pool.

## Conclusion

Troubleshooting Calico on OpenShift centers on SCC violations, cluster network operator conflicts, RBAC gaps, and IP pool misalignment with OpenShift's pod CIDR. These OpenShift-specific issues require checking OpenShift's security model in addition to standard Calico diagnostics. Ensuring the Calico SCC is applied and the network operator is unmanaged resolves the majority of OpenShift installation failures.
