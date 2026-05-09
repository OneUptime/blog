# How to Test Network Policies with Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, Network Policies

Description: A guide to testing Calico network policies on OpenShift, including testing alongside OpenShift's built-in NetworkPolicy support.

---

## Introduction

OpenShift has built-in NetworkPolicy support, and Calico extends this with its own GlobalNetworkPolicy and NetworkPolicy CRDs. Testing policies on OpenShift requires understanding which resources are evaluated and in which order. Calico policies with lower `order` values are evaluated before higher-order policies, and Calico policies can be ordered relative to Kubernetes NetworkPolicy resources.

OpenShift clusters are often configured to add default network policies in each new project namespace - these commonly allow intra-namespace traffic and router access. Testing Calico policies must account for any pre-existing policies to correctly interpret test results.

This guide covers network policy testing on OpenShift with Calico.

## Prerequisites

- Calico running on OpenShift
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Inspect Default OpenShift Policies

```bash
oc new-project policy-test-a
oc new-project policy-test-b

oc get networkpolicies -n policy-test-a
```

If your cluster's project template installs isolation policies, you commonly see policies such as `allow-from-same-namespace` or `allow-same-namespace` and `allow-from-openshift-ingress`.

## Step 2: Deploy Test Workloads

```bash
oc run server --image=quay.io/openshift/origin-hello-openshift --labels="app=server" -n policy-test-a --port=8080
oc expose pod server --port=8080 -n policy-test-a
oc run client-same-ns --image=busybox --labels="app=client" -n policy-test-a --command -- sleep 3600
oc run client-other-ns --image=busybox --labels="app=client" -n policy-test-b --command -- sleep 3600

oc wait --for=condition=Ready pod/server -n policy-test-a --timeout=60s
oc wait --for=condition=Ready pod/client-same-ns -n policy-test-a --timeout=60s
oc wait --for=condition=Ready pod/client-other-ns -n policy-test-b --timeout=60s
```

## Step 3: Verify Default Behavior

Same-namespace traffic should be allowed if your namespace has an OpenShift same-namespace allow policy.

```bash
SERVER_IP=$(oc get pod server -n policy-test-a -o jsonpath='{.status.podIP}')
oc exec client-same-ns -n policy-test-a -- wget -qO- -T 5 http://$SERVER_IP:8080
```

Cross-namespace traffic should be blocked if the target namespace has an ingress-isolating NetworkPolicy and no policy allows traffic from `policy-test-b`.

```bash
oc exec client-other-ns -n policy-test-b -- wget -qO- -T 5 http://$SERVER_IP:8080 || echo "Blocked"
```

## Step 4: Apply a Calico GlobalNetworkPolicy

Test a Calico-specific policy that allows specific cross-namespace traffic.

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-cross-ns
spec:
  namespaceSelector: projectcalico.org/name == 'policy-test-a'
  selector: app == 'server'
  ingress:
    - action: Allow
      protocol: TCP
      source:
        namespaceSelector: projectcalico.org/name == 'policy-test-b'
      destination:
        ports:
          - 8080
  order: 100
```

```bash
calicoctl apply -f allow-cross-ns.yaml
oc exec client-other-ns -n policy-test-b -- wget -qO- -T 5 http://$SERVER_IP:8080
```

## Step 5: Test Egress Policy

Apply egress restriction using Calico's NetworkPolicy. The `10.128.0.0/14` value is the default OpenShift cluster network CIDR; check your cluster and replace it if your cluster uses a different range.

```bash
oc get network.config.openshift.io cluster -o jsonpath='{.status.clusterNetwork[0].cidr}{"\n"}'
```

```yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: restrict-egress
  namespace: policy-test-b
spec:
  selector: app == 'client'
  egress:
    - action: Allow
      destination:
        nets:
          - 10.128.0.0/14
  types:
    - Egress
```

```bash
calicoctl apply -f restrict-egress.yaml
```

## Step 6: Clean Up

```bash
oc delete project policy-test-a policy-test-b
calicoctl delete globalnetworkpolicy allow-cross-ns
```

## Conclusion

Testing network policies on OpenShift with Calico requires awareness of any project policies that affect baseline connectivity. Calico's GlobalNetworkPolicy resources enable cross-namespace policies that OpenShift's standard NetworkPolicy cannot express, making them a powerful addition to OpenShift's security model. Testing both policy types and their interaction provides complete coverage of your network security posture.
