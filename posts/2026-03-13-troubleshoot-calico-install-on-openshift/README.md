# How to Troubleshoot Installation Issues with Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Troubleshooting

Description: A guide to diagnosing and resolving Calico installation failures specific to OpenShift clusters.

---

## Introduction

OpenShift introduces several security and operator-management layers that can interfere with Calico installation. Security Context Constraints (SCCs) can prevent Calico pods from starting, the cluster network configuration may conflict with Calico if OpenShift was not configured for Calico during installation, and OpenShift's strict RBAC model can block Calico's service accounts from reading the resources they need.

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

Fix by ensuring the Tigera operator has permission to manage SCCs and that the OpenShift Calico manifests for your Calico version were applied:

```bash
oc get clusterrole tigera-operator -o yaml | grep -A10 securitycontextconstraints

VERSION=v3.32.0
curl -L https://github.com/projectcalico/calico/releases/download/${VERSION}/ocp.tgz | \
  tar -xzO ocp/02-role-tigera-operator.yaml | oc apply -f -
oc adm policy add-scc-to-user privileged -z calico-node -n calico-system
```

## Step 3: Verify OpenShift Network Type and Operator Configuration

For standard OpenShift installs, Calico must be selected as the cluster network type before the cluster is created. For Hosted Control Planes installs, the hosted cluster network type should be `Other`.

```bash
oc get network.config cluster -o jsonpath='{.spec.networkType}{"\n"}'
oc get network.operator cluster -o yaml | grep -E 'networkType|deployKubeProxy|managementState'
```

If the cluster still reports `OVNKubernetes` or `OpenShiftSDN`, Calico was not selected as the cluster network during installation. Only set the Cluster Network Operator to `Unmanaged` when the Calico instructions for your OpenShift and Calico versions explicitly require it, because unmanaged OpenShift operators are unsupported by Red Hat.

```bash
oc get network.operator cluster -o jsonpath='{.spec.managementState}{"\n"}'
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
- `unable to create new container: insufficient privileges` - SCC issue
- `failed to read /sys/kernel` - missing privileged access

## Step 6: Verify IP Pool Alignment

OpenShift uses a specific pod CIDR (often 10.128.0.0/14). Misalignment causes IPAM failures.

```bash
oc get network.config cluster -o jsonpath='{.spec.clusterNetwork}'
calicoctl get ippool default-ipv4-ippool -o yaml | grep cidr
```

If they don't match, update the IP pool.

## Conclusion

Troubleshooting Calico on OpenShift centers on SCC violations, cluster network configuration conflicts, RBAC gaps, and IP pool misalignment with OpenShift's pod CIDR. These OpenShift-specific issues require checking OpenShift's security model in addition to standard Calico diagnostics. Ensuring the Tigera operator can manage SCCs and that OpenShift was configured for Calico during installation resolves many OpenShift installation failures.
