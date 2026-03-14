# How to Test Network Policies with Calico with Binary Management on Bare Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Network Policies

Description: A guide to testing Calico network policy enforcement on bare metal clusters where Calico is managed as binaries with tools like Ansible.

---

## Introduction

Testing network policies in a binary-managed Calico deployment on bare metal follows the same policy semantics as any other Calico installation, but the binary management layer adds the ability to run policy tests as part of automated playbooks. You can encode your policy test scenarios as Ansible tasks that deploy test pods, verify connectivity, and report results — all without manual intervention.

This automation-first approach to policy testing is particularly valuable for bare metal clusters where changes are infrequent but must be thoroughly validated. Embedding tests in your change management pipeline ensures policies are verified every time the Calico configuration is updated.

This guide covers network policy testing for binary-managed Calico on bare metal.

## Prerequisites

- Calico binary installation managed via Ansible on bare metal
- `kubectl` and `calicoctl` installed
- Basic understanding of Kubernetes NetworkPolicy and Calico NetworkPolicy

## Step 1: Deploy Test Workloads

```bash
kubectl create namespace bm-binary-test
kubectl run server --image=nginx --labels="app=server" -n bm-binary-test
kubectl expose pod server --port=80 -n bm-binary-test
kubectl run client-ok --image=busybox --labels="app=client-ok" -n bm-binary-test -- sleep 3600
kubectl run client-bad --image=busybox --labels="app=client-bad" -n bm-binary-test -- sleep 3600
```

## Step 2: Apply Default Deny Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: bm-binary-test
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```bash
kubectl apply -f default-deny.yaml
```

## Step 3: Allow Specific Client

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-client-ok
  namespace: bm-binary-test
spec:
  podSelector:
    matchLabels:
      app: server
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: client-ok
```

```bash
kubectl apply -f allow-client.yaml
```

## Step 4: Run Connectivity Tests

```bash
# Should succeed
kubectl exec -n bm-binary-test client-ok -- wget -qO- --timeout=5 http://server
echo "Allowed client result: $?"

# Should fail
kubectl exec -n bm-binary-test client-bad -- wget -qO- --timeout=5 http://server || echo "Denied as expected"
```

## Step 5: Encode Tests in Ansible

```yaml
# test-policies.yml
---
- name: Test Calico network policies
  hosts: localhost
  tasks:
    - name: Test allowed client
      shell: |
        kubectl exec -n bm-binary-test client-ok -- wget -qO- --timeout=5 http://server
      register: allowed_result
      failed_when: allowed_result.rc != 0

    - name: Test denied client
      shell: |
        kubectl exec -n bm-binary-test client-bad -- wget -qO- --timeout=5 http://server
      register: denied_result
      failed_when: denied_result.rc == 0

    - name: Policy test results
      debug:
        msg: "All network policy tests passed"
```

```bash
ansible-playbook test-policies.yml
```

## Step 6: Verify Felix Has Programmed the Rules

On a worker node hosting the server pod:

```bash
iptables -L | grep cali-
calicoctl get workloadendpoint -n bm-binary-test
```

## Conclusion

Testing network policies in binary-managed Calico on bare metal is most effective when encoded in Ansible playbooks that can be re-run as part of change management workflows. This approach catches policy regressions automatically and provides a repeatable baseline for compliance audits.
