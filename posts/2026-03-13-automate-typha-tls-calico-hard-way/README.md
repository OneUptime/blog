# How to Automate Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Automation, Hard Way, Cert-Manager

Description: A guide to automating Typha TLS certificate generation, rotation, and distribution using cert-manager and Ansible in a manually installed Calico cluster.

---

## Introduction

Manual TLS certificate management for Typha is error-prone and scales poorly - each rotation requires generating new certificates, updating Kubernetes Secrets, and restarting Typha and Felix. Automating this lifecycle with cert-manager or Ansible eliminates the risk of certificate expiry outages and reduces operational burden.

## Option 1: Automate with cert-manager

cert-manager is a Kubernetes operator that manages certificate lifecycle automatically. It can generate, renew, and store certificates as Kubernetes Secrets.

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml
kubectl wait --for=condition=Available deployment --all -n cert-manager --timeout=120s
```

### Create a Self-Signed Issuer and CA

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: calico-typha-ca
  namespace: calico-system
spec:
  isCA: true
  commonName: calico-typha-ca
  secretName: calico-typha-ca-secret
  privateKey:
    algorithm: RSA
    size: 4096
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: calico-typha-issuer
  namespace: calico-system
spec:
  ca:
    secretName: calico-typha-ca-secret
EOF
```

### Issue Typha Server and Felix Client Certificates

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: calico-typha-tls
  namespace: calico-system
spec:
  secretName: calico-typha-tls
  duration: 2160h  # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  commonName: calico-typha
  dnsNames:
  - calico-typha.calico-system.svc
  - calico-typha.calico-system.svc.cluster.local
  issuerRef:
    name: calico-typha-issuer
    kind: Issuer
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: calico-felix-typha-tls
  namespace: calico-system
spec:
  secretName: calico-felix-typha-tls
  duration: 2160h
  renewBefore: 360h
  commonName: calico-felix
  issuerRef:
    name: calico-typha-issuer
    kind: Issuer
EOF
```

cert-manager will automatically renew these certificates 15 days before expiry and update the Kubernetes Secrets. Typha and Felix will pick up the new certificates on their next reload.

## Option 2: Automate with Ansible and Cron

For environments without cert-manager:

```yaml
# typha-cert-rotate.yml
---
- name: Rotate Typha TLS certificates
  hosts: control_plane
  vars:
    cert_dir: /etc/calico/pki
    validity_days: 365
    rotation_threshold_days: 30
  tasks:
    - name: Check certificate expiry
      command: >
        openssl x509 -enddate -noout -in {{ cert_dir }}/typha-server.crt
      register: cert_expiry
      changed_when: false

    - name: Parse expiry and check if rotation needed
      set_fact:
        needs_rotation: >-
          {{ (cert_expiry.stdout | regex_search('notAfter=(.+)', '\1') | first |
              to_datetime('%b %e %T %Y %Z') - now()).days < rotation_threshold_days }}

    - name: Regenerate certificates if needed
      when: needs_rotation
      block:
        - name: Generate new Typha server certificate
          command: >
            openssl req -newkey rsa:4096 -keyout {{ cert_dir }}/typha-server-new.key
            -out {{ cert_dir }}/typha-server-new.csr -nodes -subj "/CN=calico-typha"

        - name: Sign new certificate
          command: >
            openssl x509 -req -in {{ cert_dir }}/typha-server-new.csr
            -CA {{ cert_dir }}/typha-ca.crt -CAkey {{ cert_dir }}/typha-ca.key
            -CAcreateserial -out {{ cert_dir }}/typha-server-new.crt -days {{ validity_days }}

        - name: Update Kubernetes secret
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
                tls.crt: "{{ lookup('file', cert_dir + '/typha-server-new.crt') | b64encode }}"
                tls.key: "{{ lookup('file', cert_dir + '/typha-server-new.key') | b64encode }}"

        - name: Restart Typha
          command: kubectl rollout restart deployment/calico-typha -n calico-system
```

Schedule with a Kubernetes CronJob that runs the Ansible playbook weekly.

## Verify Automation Is Working

```bash
# Check cert-manager Certificate status
kubectl get certificate -n calico-system
kubectl describe certificate calico-typha-tls -n calico-system | grep -A5 "Status:"
```

## Conclusion

Automating Typha TLS with cert-manager is the preferred approach for Kubernetes-native environments - it handles certificate issuance, renewal, and Secret updates automatically with no manual intervention. For environments where cert-manager is not available, an Ansible playbook with an expiry check and conditional rotation achieves the same result on a scheduled basis. Both approaches eliminate the risk of certificate expiry outages in production Calico clusters.
