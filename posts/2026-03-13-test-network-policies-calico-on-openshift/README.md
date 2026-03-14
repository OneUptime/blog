# How to Test Network Policies with Calico on OpenShift

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, Network Policies

Description: A guide to testing Calico network policies on OpenShift, including testing alongside OpenShift's built-in NetworkPolicy support.

---

## Introduction

OpenShift has built-in NetworkPolicy support, and Calico extends this with its own GlobalNetworkPolicy and NetworkPolicy CRDs. Testing policies on OpenShift requires understanding which resources are evaluated and in which order. Calico policies with lower `order` values take precedence over higher-order policies and over Kubernetes NetworkPolicy resources.

OpenShift also adds its own default network policies in each new project namespace - these allow intra-namespace traffic and router access. Testing Calico policies must account for these pre-existing policies to correctly interpret test results.

This guide covers network policy testing on OpenShift with Calico.

## Prerequisites

- Calico running on OpenShift
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Inspect Default OpenShift Policies

```bash
oc get networkpolicies -n default
```

OpenShift typically creates `allow-from-same-namespace` and `allow-from-openshift-ingress` policies in each project.

## Step 2: Deploy Test Workloads

```bash
oc new-project policy-test-a
oc new-project policy-test-b

oc run server --image=nginx --labels="app=server" -n policy-test-a
oc expose pod server --port=80 -n policy-test-a
oc run client-same-ns --image=busybox --labels="app=client" -n policy-test-a -- sleep 3600
oc run client-other-ns --image=busybox --labels="app=client" -n policy-test-b -- sleep 3600
```

## Step 3: Verify Default Behavior

Same-namespace traffic should be allowed by OpenShift's default policy.

```bash
SERVER_IP=$(oc get pod server -n policy-test-a -o jsonpath='{.status.podIP}')
oc exec client-same-ns -n policy-test-a -- wget -qO- --timeout=5 http://$SERVER_IP
```

Cross-namespace traffic should be blocked by default.

```bash
oc exec client-other-ns -n policy-test-b -- wget -qO- --timeout=5 http://$SERVER_IP || echo "Blocked"
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
      source:
        namespaceSelector: projectcalico.org/name == 'policy-test-b'
  order: 100
```

```bash
calicoctl apply -f allow-cross-ns.yaml
oc exec client-other-ns -n policy-test-b -- wget -qO- --timeout=5 http://$SERVER_IP
```

## Step 5: Test Egress Policy

Apply egress restriction using Calico's NetworkPolicy.

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

Testing network policies on OpenShift with Calico requires awareness of OpenShift's default project policies, which affect baseline connectivity. Calico's GlobalNetworkPolicy resources enable cross-namespace policies that OpenShift's standard NetworkPolicy cannot express, making them a powerful addition to OpenShift's security model. Testing both policy types and their interaction provides complete coverage of your network security posture.
