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
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.20.2/cert-manager.yaml
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
  namespace: kube-system
spec:
  isCA: true
  commonName: calico-typha-ca
  secretName: calico-typha-ca-secret
  duration: 87600h  # 10 years
  renewBefore: 720h  # Renew 30 days before expiry
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
  namespace: kube-system
spec:
  ca:
    secretName: calico-typha-ca-secret
EOF

kubectl wait --for=condition=Ready certificate/calico-typha-ca -n kube-system --timeout=120s
kubectl get secret -n kube-system calico-typha-ca-secret -o jsonpath='{.data.ca\.crt}' | base64 -d > typhaca.crt
kubectl create configmap -n kube-system calico-typha-ca --from-file=typhaca.crt --dry-run=client -o yaml | kubectl apply -f -
```

### Issue Typha Server and Felix Client Certificates

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: calico-typha-tls
  namespace: kube-system
spec:
  secretName: calico-typha-certs
  duration: 2160h  # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  commonName: calico-typha
  dnsNames:
  - calico-typha.kube-system.svc
  - calico-typha.kube-system.svc.cluster.local
  usages:
  - server auth
  issuerRef:
    name: calico-typha-issuer
    kind: Issuer
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: calico-felix-typha-tls
  namespace: kube-system
spec:
  secretName: calico-node-certs
  duration: 2160h
  renewBefore: 360h
  commonName: calico-node
  usages:
  - client auth
  issuerRef:
    name: calico-typha-issuer
    kind: Issuer
EOF

kubectl wait --for=condition=Ready certificate/calico-typha-tls -n kube-system --timeout=120s
kubectl wait --for=condition=Ready certificate/calico-felix-typha-tls -n kube-system --timeout=120s
kubectl set env deployment/calico-typha -n kube-system \
  TYPHA_SERVERCERTFILE=/calico-typha-certs/tls.crt \
  TYPHA_SERVERKEYFILE=/calico-typha-certs/tls.key
kubectl set env daemonset/calico-node -n kube-system \
  FELIX_TYPHACERTFILE=/calico-node-certs/tls.crt \
  FELIX_TYPHAKEYFILE=/calico-node-certs/tls.key
```

cert-manager will automatically renew these certificates 15 days before expiry and update the Kubernetes Secrets. Typha and Felix will pick up the new certificates after their Pods are restarted or otherwise reload the mounted Secret data.

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
        - name: Write Typha server certificate extensions
          copy:
            dest: "{{ cert_dir }}/typha-server.ext"
            content: |
              extendedKeyUsage = serverAuth
              subjectAltName = DNS:calico-typha

        - name: Write Felix client certificate extensions
          copy:
            dest: "{{ cert_dir }}/calico-node.ext"
            content: |
              extendedKeyUsage = clientAuth

        - name: Generate new Typha server certificate
          command: >
            openssl req -newkey rsa:4096 -keyout {{ cert_dir }}/typha-server-new.key
            -out {{ cert_dir }}/typha-server-new.csr -nodes -subj "/CN=calico-typha"

        - name: Sign new Typha server certificate
          command: >
            openssl x509 -req -in {{ cert_dir }}/typha-server-new.csr
            -CA {{ cert_dir }}/typha-ca.crt -CAkey {{ cert_dir }}/typha-ca.key
            -CAcreateserial -out {{ cert_dir }}/typha-server-new.crt -days {{ validity_days }}
            -extfile {{ cert_dir }}/typha-server.ext

        - name: Generate new Felix client certificate
          command: >
            openssl req -newkey rsa:4096 -keyout {{ cert_dir }}/calico-node-new.key
            -out {{ cert_dir }}/calico-node-new.csr -nodes -subj "/CN=calico-node"

        - name: Sign new Felix client certificate
          command: >
            openssl x509 -req -in {{ cert_dir }}/calico-node-new.csr
            -CA {{ cert_dir }}/typha-ca.crt -CAkey {{ cert_dir }}/typha-ca.key
            -CAcreateserial -out {{ cert_dir }}/calico-node-new.crt -days {{ validity_days }}
            -extfile {{ cert_dir }}/calico-node.ext

        - name: Update Typha Kubernetes secret
          shell: >
            kubectl create secret generic -n kube-system calico-typha-certs
            --from-file=typha.crt={{ cert_dir }}/typha-server-new.crt
            --from-file=typha.key={{ cert_dir }}/typha-server-new.key
            --dry-run=client -o yaml | kubectl apply -f -

        - name: Update Felix Kubernetes secret
          shell: >
            kubectl create secret generic -n kube-system calico-node-certs
            --from-file=calico-node.crt={{ cert_dir }}/calico-node-new.crt
            --from-file=calico-node.key={{ cert_dir }}/calico-node-new.key
            --dry-run=client -o yaml | kubectl apply -f -

        - name: Restart Typha
          command: kubectl rollout restart deployment/calico-typha -n kube-system

        - name: Restart calico/node
          command: kubectl rollout restart daemonset/calico-node -n kube-system
```

Schedule with a Kubernetes CronJob that runs the Ansible playbook weekly.

## Verify Automation Is Working

```bash
# Check cert-manager Certificate status
kubectl get certificate -n kube-system
kubectl describe certificate calico-typha-tls -n kube-system | grep -A5 "Status:"
```

## Conclusion

Automating Typha TLS with cert-manager is the preferred approach for Kubernetes-native environments - it handles certificate issuance, renewal, and Secret updates automatically, while Pod reloads or rollouts handle consuming the renewed material. For environments where cert-manager is not available, an Ansible playbook with an expiry check and conditional rotation achieves the same result on a scheduled basis. Both approaches eliminate the risk of certificate expiry outages in production Calico clusters.
