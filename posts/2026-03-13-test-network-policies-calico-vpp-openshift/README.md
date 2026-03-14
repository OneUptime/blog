# How to Test Network Policies with Calico VPP on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Network Policies

Description: A guide to testing Calico network policies on OpenShift with the VPP high-performance data plane.

---

## Introduction

Testing network policies on OpenShift with Calico VPP verifies that VPP's ACL-based policy enforcement correctly implements both Kubernetes NetworkPolicy resources and Calico's GlobalNetworkPolicy CRDs. OpenShift's system namespaces must continue to communicate freely, and testing must confirm that the GlobalNetworkPolicy permitting system namespace traffic is correctly programmed in VPP's ACL tables.

The additional OpenShift consideration for VPP policy testing is that VPP processes OpenShift's router traffic, making router functionality a de facto policy test — if the router can forward external requests to pods, VPP's ACLs are allowing the router's ingress path correctly.

## Prerequisites

- Calico VPP running on OpenShift
- `oc` CLI with cluster admin access
- VPP manager pods running

## Step 1: Verify Router Is Working (Implicit Policy Test)

```bash
oc run web --image=nginx -n default
oc expose pod web -n default
oc expose svc/web -n default
curl http://$(oc get route web -n default -o jsonpath='{.spec.host}')
```

A successful curl confirms the router's ingress path through VPP is unblocked.

## Step 2: Deploy Explicit Test Workloads

```bash
oc new-project vpp-ocp-policy-test
oc run server --image=nginx --labels="app=server" -n vpp-ocp-policy-test
oc expose pod server --port=80 -n vpp-ocp-policy-test
oc run client-ok --image=busybox --labels="app=ok" -n vpp-ocp-policy-test -- sleep 3600
oc run client-blocked --image=busybox --labels="app=blocked" -n vpp-ocp-policy-test -- sleep 3600
```

## Step 3: Apply Network Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ok-client
  namespace: vpp-ocp-policy-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: ok
  policyTypes:
    - Ingress
```

```bash
oc apply -f allow-ok.yaml
```

## Step 4: Test Policy Enforcement

```bash
SERVER_IP=$(oc get pod server -n vpp-ocp-policy-test -o jsonpath='{.status.podIP}')
oc exec -n vpp-ocp-policy-test client-ok -- wget -qO- --timeout=5 http://$SERVER_IP
oc exec -n vpp-ocp-policy-test client-blocked -- wget -qO- --timeout=5 http://$SERVER_IP || echo "Blocked by VPP ACL"
```

## Step 5: Verify VPP ACL Is Programmed

```bash
oc exec -n calico-vpp-dataplane <vpp-manager-pod-on-server-node> -- vppctl show acl-plugin acl
```

## Step 6: Test Calico GlobalNetworkPolicy on OpenShift

```bash
# Verify system namespace policy is in effect
calicoctl get globalnetworkpolicy allow-openshift-system -o yaml
oc exec -n openshift-ingress <router-pod> -- curl -sk https://kubernetes.default.svc.cluster.local/healthz
```

## Conclusion

Testing network policies with Calico VPP on OpenShift combines router-as-implicit-policy-test with explicit workload connectivity checks and VPP ACL table inspection. The router test is particularly useful because it exercises the full policy enforcement path — from the router's host network, through VPP's ACL, to the backend pods — which is the most performance-critical policy path in OpenShift.
