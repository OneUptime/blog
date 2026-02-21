# How to Use Ansible to Manage Kubernetes Network Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Network Policies, Security, Networking

Description: Implement Kubernetes Network Policies with Ansible to control pod-to-pod traffic, isolate namespaces, and enforce network segmentation in your cluster.

---

By default, every pod in a Kubernetes cluster can communicate with every other pod. That is convenient for getting started but dangerous in production. Network Policies are Kubernetes-native firewall rules that control which pods can talk to each other. They let you isolate namespaces, restrict database access to specific services, and block lateral movement in case of a compromise.

Managing Network Policies through Ansible means your network security rules are version-controlled, peer-reviewed, and deployed consistently. This guide covers creating ingress and egress policies, isolating namespaces, and building a layered network security model.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A Kubernetes cluster with a CNI that supports Network Policies (Calico, Cilium, Weave Net)
- A valid kubeconfig

Note: Not all CNI plugins enforce Network Policies. If you are using Flannel, for example, policies will be created but not enforced. Check your CNI documentation.

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Understanding Network Policy Behavior

Key things to know before writing policies:

- Network Policies are additive. If no policy selects a pod, all traffic is allowed.
- Once at least one policy selects a pod, all traffic not explicitly allowed is denied.
- Policies are namespace-scoped.
- You need separate rules for ingress (incoming) and egress (outgoing) traffic.

## Default Deny All Traffic

The first step in network security is to deny all traffic by default, then whitelist what you need.

```yaml
# playbook: create-default-deny.yml
# Creates default deny policies for both ingress and egress in a namespace
---
- name: Apply default deny Network Policies
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespaces:
      - production
      - staging

  tasks:
    - name: Create default deny ingress policy
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: default-deny-ingress
            namespace: "{{ item }}"
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
      loop: "{{ namespaces }}"

    - name: Create default deny egress policy
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: default-deny-egress
            namespace: "{{ item }}"
          spec:
            podSelector: {}
            policyTypes:
              - Egress
      loop: "{{ namespaces }}"
```

The empty `podSelector: {}` matches all pods in the namespace. With no ingress or egress rules defined, everything is denied. Now you need to explicitly allow the traffic your applications require.

## Allowing DNS Resolution

After applying default deny egress, pods cannot resolve DNS names. You need to allow traffic to the kube-dns service.

```yaml
# playbook: allow-dns.yml
# Allows all pods to reach kube-dns for name resolution
---
- name: Allow DNS egress
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Allow DNS traffic to kube-dns
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: allow-dns
            namespace: production
          spec:
            podSelector: {}
            policyTypes:
              - Egress
            egress:
              - to:
                  - namespaceSelector:
                      matchLabels:
                        kubernetes.io/metadata.name: kube-system
                    podSelector:
                      matchLabels:
                        k8s-app: kube-dns
                ports:
                  - protocol: UDP
                    port: 53
                  - protocol: TCP
                    port: 53
```

This policy allows all pods in the production namespace to send DNS queries (port 53, TCP and UDP) to the kube-dns pods in the kube-system namespace.

## Allowing Frontend to Backend Communication

Let's build a typical three-tier application policy where the frontend can talk to the API, and the API can talk to the database.

```yaml
# playbook: create-app-network-policies.yml
# Implements network segmentation for a three-tier application
---
- name: Create application Network Policies
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production

  tasks:
    - name: Allow ingress to frontend from any source
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: frontend-ingress
            namespace: "{{ namespace }}"
          spec:
            podSelector:
              matchLabels:
                tier: frontend
            policyTypes:
              - Ingress
            ingress:
              # Allow traffic from the ingress controller namespace
              - from:
                  - namespaceSelector:
                      matchLabels:
                        kubernetes.io/metadata.name: ingress-nginx
                ports:
                  - protocol: TCP
                    port: 80

    - name: Allow API to receive traffic only from frontend
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: api-ingress
            namespace: "{{ namespace }}"
          spec:
            podSelector:
              matchLabels:
                tier: api
            policyTypes:
              - Ingress
            ingress:
              - from:
                  - podSelector:
                      matchLabels:
                        tier: frontend
                ports:
                  - protocol: TCP
                    port: 8080

    - name: Allow database to receive traffic only from API
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: database-ingress
            namespace: "{{ namespace }}"
          spec:
            podSelector:
              matchLabels:
                tier: database
            policyTypes:
              - Ingress
            ingress:
              - from:
                  - podSelector:
                      matchLabels:
                        tier: api
                ports:
                  - protocol: TCP
                    port: 5432

    - name: Allow frontend to reach API (egress)
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: frontend-egress
            namespace: "{{ namespace }}"
          spec:
            podSelector:
              matchLabels:
                tier: frontend
            policyTypes:
              - Egress
            egress:
              - to:
                  - podSelector:
                      matchLabels:
                        tier: api
                ports:
                  - protocol: TCP
                    port: 8080

    - name: Allow API to reach database (egress)
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: api-egress
            namespace: "{{ namespace }}"
          spec:
            podSelector:
              matchLabels:
                tier: api
            policyTypes:
              - Egress
            egress:
              - to:
                  - podSelector:
                      matchLabels:
                        tier: database
                ports:
                  - protocol: TCP
                    port: 5432
```

This creates a strict communication path: Ingress Controller -> Frontend -> API -> Database. The database cannot talk to the frontend, and the frontend cannot bypass the API to reach the database directly.

## Namespace Isolation

Prevent pods in one namespace from reaching pods in another namespace. This is common in multi-tenant clusters.

```yaml
# playbook: isolate-namespaces.yml
# Prevents cross-namespace communication except for shared services
---
- name: Isolate namespaces
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    isolated_namespaces:
      - team-alpha
      - team-beta
      - team-gamma

  tasks:
    - name: Create namespace isolation policy
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: NetworkPolicy
          metadata:
            name: namespace-isolation
            namespace: "{{ item }}"
          spec:
            podSelector: {}
            policyTypes:
              - Ingress
            ingress:
              # Only allow traffic from pods within the same namespace
              - from:
                  - podSelector: {}
              # Also allow traffic from the monitoring namespace
              - from:
                  - namespaceSelector:
                      matchLabels:
                        kubernetes.io/metadata.name: monitoring
      loop: "{{ isolated_namespaces }}"
```

## Allowing External API Access

Some pods need to reach external APIs. You can allow egress to specific CIDR ranges.

```yaml
# task: allow pods to reach specific external endpoints
- name: Allow API pods to reach external payment provider
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      metadata:
        name: allow-external-payment
        namespace: production
      spec:
        podSelector:
          matchLabels:
            app: payment-service
        policyTypes:
          - Egress
        egress:
          # Allow HTTPS to the payment provider's IP range
          - to:
              - ipBlock:
                  cidr: 203.0.113.0/24
            ports:
              - protocol: TCP
                port: 443
          # Allow HTTPS to another payment endpoint
          - to:
              - ipBlock:
                  cidr: 198.51.100.0/24
            ports:
              - protocol: TCP
                port: 443
```

## Verifying Network Policies

After applying policies, test that they work as expected.

```yaml
# task: list all network policies and their pod selectors
- name: Get all Network Policies
  kubernetes.core.k8s_info:
    kind: NetworkPolicy
    namespace: production
  register: netpol_list

- name: Display policy summary
  ansible.builtin.debug:
    msg: >
      Policy: {{ item.metadata.name }} |
      Selects: {{ item.spec.podSelector.matchLabels | default('all pods') }} |
      Types: {{ item.spec.policyTypes | join(', ') }}
  loop: "{{ netpol_list.resources }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

## Summary

Network Policies are one of the most impactful security controls you can apply in Kubernetes. They cost nothing to run, add no latency (the CNI handles them at the kernel level), and dramatically reduce the blast radius of a compromised pod. Start with default deny, allow DNS, then incrementally open the specific paths your applications need. Managing them through Ansible ensures your network security posture is consistent, auditable, and reproducible across clusters.
