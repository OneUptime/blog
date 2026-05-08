# How to Verify Pod Networking with Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Verification

Description: A guide to verifying that Calico pod networking is fully operational on an OpenShift cluster, including OpenShift-specific connectivity checks.

---

## Introduction

Verifying pod networking on OpenShift with Calico requires additional checks beyond a standard Kubernetes verification. OpenShift runs critical infrastructure workloads - the router, the image registry, monitoring, and the API server - that must remain reachable throughout and after the Calico installation. A verification process that only checks user workload connectivity can miss problems in system namespaces that cause cluster instability later.

OpenShift also uses Routes for external access, which requires the ingress router to be able to forward traffic to pods. Depending on the Ingress Controller endpoint publishing strategy, router pods might use host networking or be published through a service. Verifying this routing path is an essential step in OpenShift-specific Calico verification.

This guide provides a complete verification workflow for Calico on OpenShift.

## Prerequisites

- Calico running on an OpenShift cluster
- `oc` CLI with cluster admin access

## Step 1: Verify System Namespaces Are Healthy

```bash
oc get pods -n openshift-ingress
oc get pods -n openshift-dns
oc get pods -n openshift-monitoring
oc get pods -n openshift-image-registry
```

All system pods should be `Running`. If any are not Ready after Calico installation, start with pod events and logs; if the symptoms point to traffic being blocked, check Calico's GlobalNetworkPolicies.

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
oc create -n calico-verify -f https://raw.githubusercontent.com/openshift/origin/master/examples/hello-openshift/hello-pod.json
oc expose pod/hello-openshift -n calico-verify
oc run client --image=busybox -n calico-verify -- sleep 300
oc wait --for=condition=Ready pod/hello-openshift -n calico-verify --timeout=60s
oc wait --for=condition=Ready pod/client -n calico-verify --timeout=60s

SERVER_IP=$(oc get pod hello-openshift -o jsonpath='{.status.podIP}' -n calico-verify)
oc exec client -n calico-verify -- wget -qO- -T 5 http://$SERVER_IP:8080
```

## Step 5: Verify Route-Based External Access

Create a test Route and verify external access is working.

```bash
oc expose svc/hello-openshift -n calico-verify
oc get route hello-openshift -n calico-verify
curl http://$(oc get route hello-openshift -n calico-verify -o jsonpath='{.spec.host}')
```

## Step 6: Verify DNS Resolution

```bash
oc exec client -n calico-verify -- nslookup hello-openshift.calico-verify.svc.cluster.local
oc exec client -n calico-verify -- nslookup kubernetes.default.svc.cluster.local
```

## Step 7: Clean Up

```bash
oc delete project calico-verify
```

## Conclusion

Verifying Calico on OpenShift requires checking system namespace pod health, Calico component status, pod IP assignment, pod-to-pod connectivity, Route-based external access, and DNS resolution. The system namespace health check is the most important OpenShift-specific step, as failures there can indicate that Calico's GlobalNetworkPolicies are blocking OpenShift infrastructure traffic.
