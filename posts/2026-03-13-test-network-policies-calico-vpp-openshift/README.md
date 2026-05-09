# How to Test Network Policies with Calico VPP on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, OpenShift, Kubernetes, Networking, Network Policies

Description: A guide to testing Calico network policies on OpenShift with the VPP high-performance data plane.

---

## Introduction

Testing network policies on OpenShift with Calico VPP verifies that VPP's policy enforcement correctly implements both Kubernetes NetworkPolicy resources and Calico's GlobalNetworkPolicy CRDs. OpenShift's system namespaces must continue to communicate freely, and testing must confirm that any GlobalNetworkPolicy permitting system namespace traffic is correctly programmed in VPP's policy state.

The additional OpenShift consideration for VPP policy testing is that VPP processes OpenShift's router traffic, making router functionality a de facto policy test - if the router can forward external requests to pods, VPP's policy path is allowing the router's ingress path correctly.

## Prerequisites

- Calico VPP running on OpenShift
- `oc` CLI with cluster admin access
- `calico-vpp-node` pods running

## Step 1: Verify Router Is Working (Implicit Policy Test)

```bash
oc run web --image=quay.io/openshift/origin-hello-openshift -n default
oc expose pod web --port=8080 -n default
oc expose svc/web -n default
curl http://$(oc get route web -n default -o jsonpath='{.spec.host}')
```

A successful curl confirms the router's ingress path through VPP is unblocked.

## Step 2: Deploy Explicit Test Workloads

```bash
oc new-project vpp-ocp-policy-test
oc run server --image=quay.io/openshift/origin-hello-openshift --labels="app=server" -n vpp-ocp-policy-test
oc expose pod server --port=8080 -n vpp-ocp-policy-test
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
oc exec -n vpp-ocp-policy-test client-ok -- wget -qO- -T 5 http://$SERVER_IP:8080
oc exec -n vpp-ocp-policy-test client-blocked -- wget -qO- -T 5 http://$SERVER_IP:8080 || echo "Blocked by VPP policy"
```

## Step 5: Verify VPP Policy Is Programmed

```bash
SERVER_NODE=$(oc get pod server -n vpp-ocp-policy-test -o jsonpath='{.spec.nodeName}')
VPP_POD=$(oc get pod -n calico-vpp-dataplane -l k8s-app=calico-vpp-node --field-selector spec.nodeName=$SERVER_NODE -o jsonpath='{.items[0].metadata.name}')
oc exec -n calico-vpp-dataplane "$VPP_POD" -c vpp -- vppctl -s /var/run/vpp/cli.sock show npol policies verbose
```

## Step 6: Test Calico GlobalNetworkPolicy on OpenShift

```bash
# Inspect the GlobalNetworkPolicy that allows required OpenShift system traffic.
# Replace <policy-name> with the actual policy name used in your cluster.

calicoctl get globalnetworkpolicy
calicoctl get globalnetworkpolicy <policy-name> -o yaml
```

## Conclusion

Testing network policies with Calico VPP on OpenShift combines router-as-implicit-policy-test with explicit workload connectivity checks and VPP policy inspection. The router test is particularly useful because it exercises the route-to-service path to the backend pods, which is one of the most performance-critical ingress paths in OpenShift.
