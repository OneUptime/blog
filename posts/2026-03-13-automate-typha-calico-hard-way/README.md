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
worker-[01:50] ansible_host=10.0.0.[11:60]

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
        openssl req -x509 -newkey rsa:4096 -keyout /etc/calico/typha-ca.key
        -out /etc/calico/typha-ca.crt -days 365 -nodes -subj "/CN=typha-ca"
      args:
        creates: /etc/calico/typha-ca.crt

    - name: Generate Typha server certificate
      command: >
        openssl req -newkey rsa:4096 -keyout /etc/calico/typha-server.key
        -out /etc/calico/typha-server.csr -nodes -subj "/CN=calico-typha"
      args:
        creates: /etc/calico/typha-server.key

    - name: Sign Typha server certificate
      command: >
        openssl x509 -req -in /etc/calico/typha-server.csr
        -CA /etc/calico/typha-ca.crt -CAkey /etc/calico/typha-ca.key
        -CAcreateserial -out /etc/calico/typha-server.crt -days 365
      args:
        creates: /etc/calico/typha-server.crt

    - name: Create Typha TLS secret
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: calico-typha-tls
            namespace: calico-system
          data:
            ca.crt: "{{ lookup('file', '/etc/calico/typha-ca.crt') | b64encode }}"
            tls.crt: "{{ lookup('file', '/etc/calico/typha-server.crt') | b64encode }}"
            tls.key: "{{ lookup('file', '/etc/calico/typha-server.key') | b64encode }}"

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
      command: kubectl get nodes --no-headers | wc -l
      register: node_count

    - name: Calculate desired Typha replicas
      set_fact:
        typha_replicas: "{{ [(node_count.stdout | int // 200), 1] | max }}"

    - name: Scale Typha Deployment
      kubernetes.core.k8s_scale:
        namespace: calico-system
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
        openssl req -x509 -newkey rsa:4096 -keyout /etc/calico/typha-ca-new.key
        -out /etc/calico/typha-ca-new.crt -days 365 -nodes -subj "/CN=typha-ca"

    - name: Update Typha TLS secret
      kubernetes.core.k8s:
        state: present
        force: true
        definition:
          apiVersion: v1
          kind: Secret
          metadata:
            name: calico-typha-tls
            namespace: calico-system
          data:
            ca.crt: "{{ lookup('file', '/etc/calico/typha-ca-new.crt') | b64encode }}"

    - name: Rollout restart Typha
      command: kubectl rollout restart deployment/calico-typha -n calico-system

    - name: Wait for Typha rollout
      command: kubectl rollout status deployment/calico-typha -n calico-system --timeout=120s
```

## Scheduled Automation with CronJob

For certificate expiry monitoring, run a Kubernetes CronJob.

```bash
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: typha-cert-check
  namespace: calico-system
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
            - "openssl x509 -enddate -noout -in /typha-tls/tls.crt"
            volumeMounts:
            - name: typha-tls
              mountPath: /typha-tls
          volumes:
          - name: typha-tls
            secret:
              secretName: calico-typha-tls
          restartPolicy: OnFailure
EOF
```

## Conclusion

Automating Typha in a hard way installation with Ansible and Kubernetes native tooling reduces operational burden for the three main lifecycle tasks: initial deployment (including certificate generation), certificate rotation, and replica scaling. Encoding these tasks as idempotent Ansible playbooks makes them safe to run repeatedly and easy to integrate into CI/CD pipelines or scheduled operations.
