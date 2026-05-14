# How to Automate Typha in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, Automation, Hard Way, Ansible

Description: A guide to automating Typha deployment, certificate rotation, and scaling in a manually installed Calico cluster using Ansible and kubectl.

---

## Introduction

Automating Typha in a hard way installation addresses three recurring operational tasks: initial deployment (including TLS certificate generation), certificate rotation before expiry, and replica scaling as the cluster grows. Ansible is well-suited for these tasks because it can manage both the cluster-level resources (Kubernetes manifests) and the node-level configuration (Felix config files) in a single playbook.

## Ansible Inventory Structure

```ini
# inventory/hosts

[control_plane]
master-01 ansible_host=10.0.0.10

[workers]
worker-01 ansible_host=10.0.0.11
worker-02 ansible_host=10.0.0.12
# ...
worker-50 ansible_host=10.0.0.60

[all:vars]
ansible_user=ubuntu
ansible_become=true
```

## Playbook: Deploy Typha

```yaml
# typha-deploy.yml
---
- name: Deploy Typha to Calico hard way cluster
  hosts: control_plane
  tasks:
    - name: Generate Typha CA certificate
      command: >
        openssl req -x509 -newkey rsa:4096 -keyout /etc/calico/typhaca.key
        -out /etc/calico/typhaca.crt -days 365 -nodes -subj "/CN=Calico Typha CA"
      args:
        creates: /etc/calico/typhaca.crt

    - name: Generate Typha server certificate
      command: >
        openssl req -newkey rsa:4096 -keyout /etc/calico/typha.key
        -out /etc/calico/typha.csr -nodes -subj "/CN=calico-typha"
      args:
        creates: /etc/calico/typha.key

    - name: Sign Typha server certificate
      command: >
        openssl x509 -req -in /etc/calico/typha.csr
        -CA /etc/calico/typhaca.crt -CAkey /etc/calico/typhaca.key
        -CAcreateserial -out /etc/calico/typha.crt -days 365
      args:
        creates: /etc/calico/typha.crt

    - name: Read Typha CA certificate
      ansible.builtin.slurp:
        src: /etc/calico/typhaca.crt
      register: typha_ca_crt

    - name: Read Typha server certificate
      ansible.builtin.slurp:
        src: /etc/calico/typha.crt
      register: typha_crt

    - name: Read Typha server key
      ansible.builtin.slurp:
        src: /etc/calico/typha.key
      register: typha_key

    - name: Create Typha CA ConfigMap
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: calico-typha-ca
            namespace: kube-system
          data:
            typhaca.crt: "{{ typha_ca_crt.content | b64decode }}"

    - name: Create Typha TLS secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: calico-typha-certs
            namespace: kube-system
          data:
            typha.crt: "{{ typha_crt.content }}"
            typha.key: "{{ typha_key.content }}"

    - name: Apply Typha Deployment and Service
      kubernetes.core.k8s:
        state: present
        src: /etc/calico/typha-deployment.yaml
```

## Playbook: Scale Typha Based on Node Count

```yaml
# typha-scale.yml
---
- name: Scale Typha based on node count
  hosts: control_plane
  tasks:
    - name: Get node count
      ansible.builtin.shell: kubectl get nodes --no-headers | wc -l
      register: node_count
      changed_when: false

    - name: Calculate desired Typha replicas
      set_fact:
        typha_replicas: "{{ [(((node_count.stdout | int) + 199) // 200), 1] | max }}"

    - name: Scale Typha Deployment
      kubernetes.core.k8s_scale:
        api_version: apps/v1
        namespace: kube-system
        name: calico-typha
        kind: Deployment
        replicas: "{{ typha_replicas }}"
```

## Playbook: Rotate Typha Certificates

```yaml
# typha-cert-rotate.yml
---
- name: Rotate Typha TLS certificates
  hosts: control_plane
  tasks:
    - name: Regenerate Typha CA
      command: >
        openssl req -x509 -newkey rsa:4096 -keyout /etc/calico/typhaca-new.key
        -out /etc/calico/typhaca-new.crt -days 365 -nodes -subj "/CN=Calico Typha CA"

    - name: Generate new Typha server certificate
      command: >
        openssl req -newkey rsa:4096 -keyout /etc/calico/typha-new.key
        -out /etc/calico/typha-new.csr -nodes -subj "/CN=calico-typha"

    - name: Sign new Typha server certificate
      command: >
        openssl x509 -req -in /etc/calico/typha-new.csr
        -CA /etc/calico/typhaca-new.crt -CAkey /etc/calico/typhaca-new.key
        -CAcreateserial -out /etc/calico/typha-new.crt -days 365

    - name: Generate new calico/node certificate
      command: >
        openssl req -newkey rsa:4096 -keyout /etc/calico/calico-node-new.key
        -out /etc/calico/calico-node-new.csr -nodes -subj "/CN=calico-node"

    - name: Sign new calico/node certificate
      command: >
        openssl x509 -req -in /etc/calico/calico-node-new.csr
        -CA /etc/calico/typhaca-new.crt -CAkey /etc/calico/typhaca-new.key
        -CAcreateserial -out /etc/calico/calico-node-new.crt -days 365

    - name: Read new Typha CA certificate
      ansible.builtin.slurp:
        src: /etc/calico/typhaca-new.crt
      register: typha_ca_new_crt

    - name: Read new Typha server certificate
      ansible.builtin.slurp:
        src: /etc/calico/typha-new.crt
      register: typha_new_crt

    - name: Read new Typha server key
      ansible.builtin.slurp:
        src: /etc/calico/typha-new.key
      register: typha_new_key

    - name: Read new calico/node certificate
      ansible.builtin.slurp:
        src: /etc/calico/calico-node-new.crt
      register: calico_node_new_crt

    - name: Read new calico/node key
      ansible.builtin.slurp:
        src: /etc/calico/calico-node-new.key
      register: calico_node_new_key

    - name: Update Typha CA ConfigMap
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ConfigMap
          metadata:
            name: calico-typha-ca
            namespace: kube-system
          data:
            typhaca.crt: "{{ typha_ca_new_crt.content | b64decode }}"

    - name: Update Typha TLS secret
      kubernetes.core.k8s:
        state: present
        force: true
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: calico-typha-certs
            namespace: kube-system
          data:
            typha.crt: "{{ typha_new_crt.content }}"
            typha.key: "{{ typha_new_key.content }}"

    - name: Update calico/node TLS secret
      kubernetes.core.k8s:
        state: present
        force: true
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: calico-node-certs
            namespace: kube-system
          data:
            calico-node.crt: "{{ calico_node_new_crt.content }}"
            calico-node.key: "{{ calico_node_new_key.content }}"

    - name: Rollout restart Typha
      command: kubectl rollout restart deployment/calico-typha -n kube-system

    - name: Rollout restart calico/node
      command: kubectl rollout restart daemonset/calico-node -n kube-system

    - name: Wait for Typha rollout
      command: kubectl rollout status deployment/calico-typha -n kube-system --timeout=120s

    - name: Wait for calico/node rollout
      command: kubectl rollout status daemonset/calico-node -n kube-system --timeout=120s
```

## Scheduled Automation with CronJob

For certificate expiry monitoring, run a Kubernetes CronJob.

```bash
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: typha-cert-check
  namespace: kube-system
spec:
  schedule: "0 8 * * 1"  # Every Monday at 8am
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cert-check
            image: alpine/openssl
            command:
            - sh
            - -c
            - "openssl x509 -checkend 2592000 -noout -in /typha-tls/typha.crt"
            volumeMounts:
            - name: typha-tls
              mountPath: /typha-tls
          volumes:
          - name: typha-tls
            secret:
              secretName: calico-typha-certs
          restartPolicy: OnFailure
EOF
```

## Conclusion

Automating Typha in a hard way installation with Ansible and Kubernetes native tooling reduces operational burden for the three main lifecycle tasks: initial deployment (including certificate generation), certificate rotation, and replica scaling. Encoding these tasks as idempotent Ansible playbooks makes them safe to run repeatedly and easy to integrate into CI/CD pipelines or scheduled operations.
