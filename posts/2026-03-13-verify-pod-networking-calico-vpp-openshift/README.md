# How to Verify Pod Networking with Calico VPP on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Verification

Description: A guide to verifying that Calico VPP pod networking is working correctly on OpenShift, including OpenShift system component health checks.

---

## Introduction

Verifying Calico VPP on OpenShift requires the same checks as standard Kubernetes Calico VPP verification, plus the OpenShift-specific system namespace health checks. OpenShift's ingress router, DNS, monitoring, and etcd pods are important system components to verify, as they help confirm that VPP's packet processing is not inadvertently dropping traffic to critical services.

The VPP CLI provides packet-level verification that goes beyond what kubectl can show - you can inspect VPP interface counters and, when troubleshooting policies, check the VPP ACL plugin state.

## Prerequisites

- Calico VPP running on OpenShift
- `oc` CLI with cluster admin access
- Calico VPP node pods running

## Step 1: Verify OpenShift System Pod Health

```bash
oc get pods -n openshift-ingress
oc get pods -n openshift-dns
oc get pods -n openshift-monitoring
oc get pods -n openshift-etcd
```

All should be Running. If any are not Ready after VPP installation, start with pod events and logs; if the symptoms point to traffic being blocked, inspect the VPP ACL plugin state.

## Step 2: Check Calico VPP Components

```bash
oc get pods -n calico-vpp-dataplane
oc get tigerastatus
```

## Step 3: Verify VPP Interface Is Up

```bash
oc exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show interface
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
oc create -n vpp-verify -f https://raw.githubusercontent.com/openshift/origin/master/examples/hello-openshift/hello-pod.json
oc expose pod/hello-openshift -n vpp-verify
oc expose svc/hello-openshift -n vpp-verify
curl http://$(oc get route hello-openshift -n vpp-verify -o jsonpath='{.spec.host}')
```

## Step 6: Verify VPP Is Processing OpenShift Traffic

```bash
oc exec -n calico-vpp-dataplane <calico-vpp-node-pod> -c vpp -- vppctl show interface
```

You should see non-zero packet counts on the relevant VPP interfaces, confirming that VPP is processing traffic on those interfaces.

## Step 7: Test DNS Resolution

```bash
oc exec test-pod -n vpp-verify -- nslookup hello-openshift.vpp-verify.svc.cluster.local
oc exec test-pod -n vpp-verify -- nslookup kubernetes.default.svc.cluster.local
```

## Conclusion

Verifying Calico VPP on OpenShift requires confirming OpenShift system pod health (ingress router, DNS, monitoring, etcd), VPP interface state, pod IP assignment, Route-based external access, and DNS resolution. VPP interface counters help confirm that traffic is traversing VPP interfaces, which is an important signal when validating that the VPP data plane is active.
