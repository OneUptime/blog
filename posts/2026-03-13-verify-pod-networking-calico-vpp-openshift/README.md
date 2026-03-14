# How to Verify Pod Networking with Calico VPP on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Verification

Description: A guide to verifying that Calico VPP pod networking is working correctly on OpenShift, including OpenShift system component health checks.

---

## Introduction

Verifying Calico VPP on OpenShift requires the same checks as standard Kubernetes Calico VPP verification, plus the OpenShift-specific system namespace health checks. OpenShift's router, DNS, monitoring, and registry pods are the most important system components to verify, as they confirm that VPP's packet processing is not inadvertently dropping traffic to critical services.

The VPP CLI provides packet-level verification that goes beyond what kubectl can show — you can see exactly which sessions are being processed by VPP and confirm that VPP's ACL tables are enforcing the correct network policies for OpenShift's system pods.

## Prerequisites

- Calico VPP running on OpenShift
- `oc` CLI with cluster admin access
- VPP manager pods running

## Step 1: Verify OpenShift System Pod Health

```bash
oc get pods -n openshift-ingress
oc get pods -n openshift-dns
oc get pods -n openshift-monitoring
oc get pods -n openshift-etcd
```

All should be Running. If any are not Ready after VPP installation, check the VPP ACL tables for blocking policies.

## Step 2: Check Calico VPP Components

```bash
oc get pods -n calico-vpp-dataplane
oc get tigerastatus
```

## Step 3: Verify VPP Interface Is Up

```bash
oc exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface
```

The primary interface should show link state `up`.

## Step 4: Deploy a Test Pod in a User Namespace

```bash
oc new-project vpp-verify
oc run test-pod --image=busybox -- sleep 300
oc get pod test-pod -o wide
```

The IP should fall in OpenShift's pod CIDR.

## Step 5: Test Route-Based External Access

```bash
oc run server --image=nginx -n vpp-verify
oc expose pod server -n vpp-verify
oc expose svc/server -n vpp-verify
curl http://$(oc get route server -n vpp-verify -o jsonpath='{.spec.host}')
```

## Step 6: Verify VPP Is Processing OpenShift Traffic

```bash
oc exec -n calico-vpp-dataplane <vpp-manager-pod> -- vppctl show interface statistics
```

You should see non-zero packet counts, confirming VPP is actively processing pod traffic.

## Step 7: Test DNS Resolution

```bash
oc exec test-pod -n vpp-verify -- nslookup server.vpp-verify.svc.cluster.local
oc exec test-pod -n vpp-verify -- nslookup kubernetes.default.svc.cluster.local
```

## Conclusion

Verifying Calico VPP on OpenShift requires confirming OpenShift system pod health (router, DNS, monitoring), VPP interface state, pod IP assignment, Route-based external access, and DNS resolution. The VPP interface statistics confirm that VPP is actively processing packets rather than falling back to Linux kernel networking, which is the key confirmation that the VPP installation is delivering the intended performance benefit.
