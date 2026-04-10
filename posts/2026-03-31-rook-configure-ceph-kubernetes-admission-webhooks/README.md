# How to Configure Ceph for Kubernetes Admission Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Admission Webhook, Validation, Storage Policy

Description: Use Kubernetes admission webhooks to enforce Ceph storage policies, validate PVC requests, and ensure compliance with storage standards.

---

## Introduction

Kubernetes admission webhooks intercept API requests before they are persisted. You can use them to validate or mutate PersistentVolumeClaim requests to enforce Ceph storage policies - for example, requiring minimum sizes, specific StorageClasses, or blocking certain access modes in production namespaces.

## Types of Admission Webhooks

- `ValidatingAdmissionWebhook` - Rejects requests that violate policies
- `MutatingAdmissionWebhook` - Modifies requests to set defaults

## Building a Simple Storage Policy Webhook

This example webhook validates that PVCs in the `production` namespace use the `rook-ceph-block` StorageClass and request at least 5Gi:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/validate-pvc", methods=["POST"])
def validate_pvc():
    admission_review = request.json
    req = admission_review["request"]
    obj = req["object"]
    namespace = req["namespace"]

    allowed = True
    message = ""

    if namespace == "production":
        sc = obj["spec"].get("storageClassName", "")
        storage = obj["spec"]["resources"]["requests"].get("storage", "0Gi")

        if sc != "rook-ceph-block":
            allowed = False
            message = f"Production PVCs must use rook-ceph-block, got: {sc}"

        size_gi = int(storage.replace("Gi", ""))
        if size_gi < 5:
            allowed = False
            message = "Production PVCs must request at least 5Gi"

    return jsonify({
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": req["uid"],
            "allowed": allowed,
            "status": {"message": message}
        }
    })
```

## Deploying the Webhook

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: storage-policy-webhook
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: storage-policy-webhook
  template:
    metadata:
      labels:
        app: storage-policy-webhook
    spec:
      containers:
      - name: webhook
        image: storage-policy-webhook:latest
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: tls-certs
          mountPath: /certs
      volumes:
      - name: tls-certs
        secret:
          secretName: webhook-tls
```

## Registering the Webhook

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: storage-policy-validator
webhooks:
- name: validate-pvc.storage.example.com
  admissionReviewVersions: ["v1"]
  sideEffects: None
  rules:
  - operations: ["CREATE", "UPDATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["persistentvolumeclaims"]
  namespaceSelector:
    matchLabels:
      storage-policy: enforced
  clientConfig:
    service:
      name: storage-policy-webhook
      namespace: kube-system
      path: /validate-pvc
    caBundle: <base64-encoded-ca>
  failurePolicy: Fail
```

Label the namespace to activate enforcement:

```bash
kubectl label namespace production storage-policy=enforced
```

## Testing the Webhook

```bash
# This should be rejected (wrong StorageClass)
kubectl -n production apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: bad-pvc
spec:
  storageClassName: standard
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi
EOF
```

## Summary

Kubernetes admission webhooks provide a powerful mechanism to enforce Ceph storage policies across namespaces. By validating PVC requests against required StorageClass names, minimum sizes, and access modes, platform teams can prevent misconfigured workloads before they reach the scheduler, ensuring consistent and compliant Ceph storage usage.
