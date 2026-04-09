# How to Set Up IBM Key Protect with Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Encryption, IBM, Security

Description: Integrate IBM Key Protect as a KMS backend for Rook-Ceph encrypted volumes to manage encryption keys using IBM Cloud's key management service.

---

## Overview

IBM Key Protect is a cloud-based key management service that provides FIPS 140-2 Level 3 hardware security module (HSM) protection for encryption keys. Rook-Ceph CSI drivers support IBM Key Protect as a KMS backend for encrypting RBD volumes, which is a common requirement for workloads running on IBM Cloud Kubernetes Service or Red Hat OpenShift on IBM Cloud.

## Prerequisites

- An IBM Cloud account with Key Protect service provisioned
- A Root Key created in Key Protect
- The IBM Cloud API key with Key Protect Manager role
- Rook-Ceph 1.9 or later (IBM Key Protect support was added in v1.8.3 as a backport and v1.9.0 on the mainline)

## Step 1 - Create an IBM Key Protect Instance

From IBM Cloud CLI:

```bash
ibmcloud resource service-instance-create rook-kms kms tiered-pricing us-south
ibmcloud resource service-key-create rook-kms-credentials Manager \
  --instance-name rook-kms
ibmcloud resource service-key rook-kms-credentials --output json | jq '.[0].credentials'
```

Note the `apikey` and `resource_instance_id` from the output.

## Step 2 - Create a Root Key

```bash
ibmcloud kp key create rook-ceph-root-key \
  --instance-id <resource_instance_id> \
  --key-ring default
ibmcloud kp keys --instance-id <resource_instance_id>
```

Note the root key ID (UUID format).

## Step 3 - Store IBM Key Protect Credentials as Kubernetes Secrets

```bash
kubectl create secret generic ceph-csi-kp-credentials \
  --from-literal=IBM_KP_SERVICE_API_KEY="<your-ibm-cloud-api-key>" \
  --from-literal=IBM_KP_CUSTOMER_ROOT_KEY="<root-key-id>" \
  -n rook-ceph
```

## Step 4 - Configure the KMS ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-csi-kms-config
  namespace: rook-ceph
data:
  config.json: |-
    {
      "ibm-kp-kms": {
        "encryptionKMSType": "ibmkeyprotect",
        "IBM_KP_SERVICE_INSTANCE_ID": "<resource_instance_id>",
        "IBM_KP_SECRET_NAME": "ceph-csi-kp-credentials",
        "IBM_KP_BASE_URL": "https://us-south.kms.cloud.ibm.com",
        "IBM_KP_TOKEN_URL": "https://iam.cloud.ibm.com/oidc/token",
        "IBM_KP_REGION": "us-south"
      }
    }
```

## Step 5 - Create an Encrypted StorageClass

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block-encrypted-ibm
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  encrypted: "true"
  encryptionKMSID: ibm-kp-kms
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Verify IBM Key Protect Keys Are Created

After creating encrypted PVCs, verify wrapped keys appear in IBM Key Protect:

```bash
ibmcloud kp keys --instance-id <resource_instance_id> --key-ring default
```

## Summary

IBM Key Protect provides FIPS 140-2 Level 3 HSM-backed key management for Rook-Ceph encrypted volumes. By configuring the `ibmkeyprotect` KMS type in the CSI KMS ConfigMap and referencing it in encrypted StorageClasses, keys are generated locally and wrapped (envelope encryption) using the IBM Key Protect root key, ensuring the root key never leaves the HSM.
