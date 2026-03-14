# How to Verify Pod Networking with Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Verification

Description: A guide to verifying that Calico pod networking is fully operational on an OpenShift cluster, including OpenShift-specific connectivity checks.

---

## Introduction

Verifying pod networking on OpenShift with Calico requires additional checks beyond a standard Kubernetes verification. OpenShift runs critical infrastructure workloads - the router, the image registry, monitoring, and the API server - that must remain reachable throughout and after the Calico installation. A verification process that only checks user workload connectivity can miss problems in system namespaces that cause cluster instability later.

OpenShift also uses Routes for external access, which requires the router pods (running with host networking) to be able to forward traffic to pods. Verifying this routing path is an essential step in OpenShift-specific Calico verification.

This guide provides a complete verification workflow for Calico on OpenShift.

## Prerequisites

- Calico running on an OpenShift cluster
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Verify System Namespaces Are Healthy

```bash
oc get pods -n openshift-ingress
oc get pods -n openshift-dns
oc get pods -n openshift-monitoring
oc get pods -n openshift-image-registry
```

All system pods should be `Running`. If any are not Ready after Calico installation, check Calico's GlobalNetworkPolicies.

## Step 2: Check Calico Components

```bash
oc get pods -n calico-system
oc get tigerastatus
```

## Step 3: Verify Pod IP Assignment

Deploy a test pod in a user namespace.

```bash
oc new-project calico-verify
oc run test-pod --image=busybox -- sleep 300
oc get pod test-pod -o wide
```

The IP should fall within the OpenShift pod CIDR (typically 10.128.0.0/14).

## Step 4: Test Pod-to-Pod Communication

```bash
oc run server --image=nginx -n calico-verify
oc expose pod server --port=80 -n calico-verify
oc run client --image=busybox -n calico-verify -- sleep 300

SERVER_IP=$(oc get pod server -o jsonpath='{.status.podIP}' -n calico-verify)
oc exec client -n calico-verify -- wget -qO- --timeout=5 http://$SERVER_IP
```

## Step 5: Verify Route-Based External Access

Create a test Route and verify external access is working.

```bash
oc expose svc/server -n calico-verify
oc get route server -n calico-verify
curl http://$(oc get route server -n calico-verify -o jsonpath='{.spec.host}')
```

## Step 6: Verify DNS Resolution

```bash
oc exec client -n calico-verify -- nslookup server.calico-verify.svc.cluster.local
oc exec client -n calico-verify -- nslookup kubernetes.default.svc.cluster.local
```

## Step 7: Clean Up

```bash
oc delete project calico-verify
```

## Conclusion

Verifying Calico on OpenShift requires checking system namespace pod health, Calico component status, pod IP assignment, pod-to-pod connectivity, Route-based external access, and DNS resolution. The system namespace health check is the most important OpenShift-specific step, as failures there indicate that Calico's GlobalNetworkPolicies are blocking OpenShift infrastructure traffic.
