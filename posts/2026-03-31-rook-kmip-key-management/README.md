# How to Configure KMIP Key Management with Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, KMIP, Security

Description: Configure Rook-Ceph to use a KMIP-compliant key management server for OSD and CSI volume encryption in enterprise environments.

---

## Overview

KMIP (Key Management Interoperability Protocol) is an OASIS standard protocol for communicating with key management servers. Many enterprise HSM and KMS products (Thales, Entrust, SafeNet) support KMIP, making it an important integration for organizations with existing key management infrastructure. Rook-Ceph supports KMIP as a KMS backend starting with Rook 1.12.

## Prerequisites

- A KMIP-compliant KMS server (PyKMIP, Thales Luna, Entrust KeyControl, etc.)
- Client TLS certificates issued by the KMS server's CA
- Rook-Ceph 1.12 or later

## Step 1 - Create the KMIP Credentials Secret

The KMIP server must issue client certificates for Rook to authenticate. Store the CA certificate, client certificate, and client key in a single Kubernetes Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ceph-csi-kmip-credentials
  namespace: rook-ceph
stringData:
  CA_CERT: |
    -----BEGIN CERTIFICATE-----
    <your KMIP CA certificate>
    -----END CERTIFICATE-----
  CLIENT_CERT: |
    -----BEGIN CERTIFICATE-----
    <your client certificate>
    -----END CERTIFICATE-----
  CLIENT_KEY: |
    -----BEGIN RSA PRIVATE KEY-----
    <your client private key>
    -----END RSA PRIVATE KEY-----
```

## Step 2 - Configure the KMS ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-csi-kms-config
  namespace: rook-ceph
data:
  config.json: |-
    {
      "kmip-kms": {
        "KMS_PROVIDER": "kmip",
        "KMIP_ENDPOINT": "kmip-server.example.com:5696",
        "KMIP_SECRET_NAME": "ceph-csi-kmip-credentials",
        "TLS_SERVER_NAME": "kmip-server.example.com",
        "READ_TIMEOUT": 10,
        "WRITE_TIMEOUT": 10
      }
    }
```

## Step 3 - Create an Encrypted StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-kmip
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  encrypted: "true"
  encryptionKMSID: kmip-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Step 4 - Test Connectivity to the KMIP Server

Verify the KMIP server is reachable from the cluster with the correct certificates:

```bash
kubectl run kmip-test --rm -it --image=alpine --restart=Never -- sh

# Test TLS connectivity (inside pod)
apk add openssl
openssl s_client -connect kmip-server.example.com:5696 \
  -cert /path/to/client.crt \
  -key /path/to/client.key \
  -CAfile /path/to/kmip-ca.crt
```

## Step 5 - Verify Key Operations

Create a test PVC using the KMIP StorageClass:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: kmip-test-pvc
spec:
  storageClassName: rook-ceph-block-kmip
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF

kubectl get pvc kmip-test-pvc -w
```

Check the KMIP server audit logs to confirm a key was created.

## Summary

KMIP integration in Rook-Ceph enables enterprises with existing HSM infrastructure to manage Ceph encryption keys using industry-standard protocols. The mutual TLS authentication between Rook CSI and the KMIP server ensures key requests are authenticated and encrypted in transit, meeting strict enterprise security requirements without requiring migration to cloud-based KMS services.
