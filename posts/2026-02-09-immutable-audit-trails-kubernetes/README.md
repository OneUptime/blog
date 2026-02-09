# How to Implement Immutable Audit Trails for Kubernetes API Server Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Audit Logging, Compliance, Immutability

Description: Configure immutable audit trails for Kubernetes API server events using write-once storage, cryptographic verification, and tamper-evident logging to meet compliance requirements and ensure forensic integrity.

---

Audit logs are useless if they can be tampered with. When investigating security incidents or demonstrating compliance, you need absolute confidence that audit logs haven't been modified after creation. Kubernetes API server audit logs capture every API request, but by default, these logs can be edited or deleted by anyone with sufficient access.

Immutable audit trails use write-once storage, cryptographic signing, and tamper-evident data structures to guarantee that once logged, events cannot be altered without detection. This transforms audit logs from potentially unreliable documentation into legally defensible evidence.

## Understanding Immutability Requirements

True immutability requires multiple layers of protection. Storage immutability prevents deletion or modification at the storage layer using object locks or write-once-read-many media. Cryptographic verification uses digital signatures or hash chains to detect tampering. Temporal guarantees ensure logs are written with accurate timestamps that cannot be backdated. Access controls restrict who can even read the logs, let alone modify them.

For Kubernetes, this means configuring API server audit backends that write to immutable storage, implementing log signing pipelines, and maintaining hash chains that prove log integrity over time.

## Configuring API Server Audit Logging

Start with comprehensive audit policy configuration that captures all security-relevant events:

```yaml
# immutable-audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all requests at RequestResponse level for security-critical operations
  - level: RequestResponse
    verbs: ["create", "update", "patch", "delete"]
    resources:
      - group: ""
        resources: ["secrets", "configmaps", "serviceaccounts"]
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]

  # Log all exec, portforward, and attach operations
  - level: RequestResponse
    verbs: ["create"]
    resources:
      - group: ""
        resources: ["pods/exec", "pods/attach", "pods/portforward", "pods/proxy"]

  # Log authentication attempts
  - level: Metadata
    omitStages:
      - RequestReceived
    resources:
      - group: "authentication.k8s.io"
        resources: ["tokenreviews"]

  # Log all Pod Security Policy decisions
  - level: Request
    verbs: ["create", "update", "patch"]
    resources:
      - group: "policy"
        resources: ["podsecuritypolicies"]

  # Default: log metadata for everything else
  - level: Metadata
    omitStages:
      - RequestReceived
```

Configure the API server to use this policy with webhook backend for external processing:

```yaml
# kube-apiserver configuration
# Add these flags to /etc/kubernetes/manifests/kube-apiserver.yaml
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --audit-policy-file=/etc/kubernetes/audit-policy.yaml
    - --audit-webhook-config-file=/etc/kubernetes/audit-webhook-config.yaml
    - --audit-webhook-batch-max-size=100
    - --audit-webhook-batch-max-wait=5s
    volumeMounts:
    - name: audit-policy
      mountPath: /etc/kubernetes/audit-policy.yaml
      readOnly: true
    - name: audit-webhook-config
      mountPath: /etc/kubernetes/audit-webhook-config.yaml
      readOnly: true
  volumes:
  - name: audit-policy
    hostPath:
      path: /etc/kubernetes/audit-policy.yaml
      type: File
  - name: audit-webhook-config
    hostPath:
      path: /etc/kubernetes/audit-webhook-config.yaml
      type: File
```

Create webhook configuration:

```yaml
# audit-webhook-config.yaml
apiVersion: v1
kind: Config
clusters:
- name: audit-webhook
  cluster:
    server: https://audit-receiver.audit-system.svc.cluster.local:443/audit
    certificate-authority: /etc/kubernetes/pki/ca.crt
contexts:
- name: default
  context:
    cluster: audit-webhook
    user: audit-webhook
current-context: default
users:
- name: audit-webhook
  user:
    client-certificate: /etc/kubernetes/pki/apiserver-audit.crt
    client-key: /etc/kubernetes/pki/apiserver-audit.key
```

## Building an Immutable Audit Log Receiver

Create a service that receives audit events, signs them cryptographically, and stores them in immutable storage:

```go
// audit-receiver.go
package main

import (
    "crypto"
    "crypto/rand"
    "crypto/rsa"
    "crypto/sha256"
    "crypto/x509"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "log"
    "net/http"
    "time"

    "github.com/aws/aws-sdk-go/aws"
    "github.com/aws/aws-sdk-go/aws/session"
    "github.com/aws/aws-sdk-go/service/s3"
)

type AuditEvent struct {
    Level             string    `json:"level"`
    AuditID           string    `json:"auditID"`
    Stage             string    `json:"stage"`
    RequestURI        string    `json:"requestURI"`
    Verb              string    `json:"verb"`
    User              User      `json:"user"`
    SourceIPs         []string  `json:"sourceIPs"`
    RequestReceivedTimestamp time.Time `json:"requestReceivedTimestamp"`
    ResponseStatus    *ResponseStatus `json:"responseStatus,omitempty"`
}

type User struct {
    Username string   `json:"username"`
    Groups   []string `json:"groups"`
}

type ResponseStatus struct {
    Code int `json:"code"`
}

type SignedAuditEvent struct {
    Event     AuditEvent `json:"event"`
    Signature string     `json:"signature"`
    PublicKey string     `json:"publicKey"`
    Timestamp time.Time  `json:"timestamp"`
    PrevHash  string     `json:"prevHash"`
}

var (
    privateKey *rsa.PrivateKey
    publicKey  *rsa.PublicKey
    lastHash   string
    s3Client   *s3.S3
    bucketName = "immutable-audit-logs"
)

func init() {
    // Generate RSA key pair for signing
    var err error
    privateKey, err = rsa.GenerateKey(rand.Reader, 2048)
    if err != nil {
        log.Fatal(err)
    }
    publicKey = &privateKey.PublicKey

    // Initialize S3 client
    sess := session.Must(session.NewSession())
    s3Client = s3.New(sess)
}

func signEvent(event AuditEvent) (string, error) {
    eventJSON, err := json.Marshal(event)
    if err != nil {
        return "", err
    }

    hash := sha256.Sum256(eventJSON)
    signature, err := rsa.SignPKCS1v15(rand.Reader, privateKey, crypto.SHA256, hash[:])
    if err != nil {
        return "", err
    }

    return base64.StdEncoding.EncodeToString(signature), nil
}

func computeHash(signedEvent SignedAuditEvent) string {
    data, _ := json.Marshal(signedEvent)
    hash := sha256.Sum256(data)
    return base64.StdEncoding.EncodeToString(hash[:])
}

func storeInS3(signedEvent SignedAuditEvent) error {
    data, err := json.Marshal(signedEvent)
    if err != nil {
        return err
    }

    key := fmt.Sprintf("audit-logs/%s/%s.json",
        signedEvent.Timestamp.Format("2006/01/02"),
        signedEvent.Event.AuditID)

    _, err = s3Client.PutObject(&s3.PutObjectInput{
        Bucket:            aws.String(bucketName),
        Key:               aws.String(key),
        Body:              bytes.NewReader(data),
        ObjectLockMode:    aws.String("GOVERNANCE"),
        ObjectLockRetainUntilDate: aws.Time(time.Now().AddDate(7, 0, 0)), // 7 years
    })

    return err
}

func auditHandler(w http.ResponseWriter, r *http.Request) {
    body, err := ioutil.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Failed to read body", http.StatusBadRequest)
        return
    }

    var event AuditEvent
    if err := json.Unmarshal(body, &event); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    // Sign the event
    signature, err := signEvent(event)
    if err != nil {
        log.Printf("Failed to sign event: %v", err)
        http.Error(w, "Signing failed", http.StatusInternalServerError)
        return
    }

    // Create signed event with hash chain
    publicKeyBytes, _ := x509.MarshalPKIXPublicKey(publicKey)
    publicKeyStr := base64.StdEncoding.EncodeToString(publicKeyBytes)

    signedEvent := SignedAuditEvent{
        Event:     event,
        Signature: signature,
        PublicKey: publicKeyStr,
        Timestamp: time.Now(),
        PrevHash:  lastHash,
    }

    // Compute hash for next event
    lastHash = computeHash(signedEvent)

    // Store in immutable S3
    if err := storeInS3(signedEvent); err != nil {
        log.Printf("Failed to store in S3: %v", err)
        http.Error(w, "Storage failed", http.StatusInternalServerError)
        return
    }

    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/audit", auditHandler)
    log.Fatal(http.ListenAndServeTLS(":443", "tls.crt", "tls.key", nil))
}
```

Build and deploy this receiver:

```yaml
# audit-receiver-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: audit-receiver
  namespace: audit-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: audit-receiver
  template:
    metadata:
      labels:
        app: audit-receiver
    spec:
      serviceAccountName: audit-receiver
      containers:
      - name: receiver
        image: audit-receiver:latest
        ports:
        - containerPort: 443
        env:
        - name: AWS_REGION
          value: us-east-1
        - name: S3_BUCKET
          value: immutable-audit-logs
        volumeMounts:
        - name: tls
          mountPath: /etc/tls
          readOnly: true
      volumes:
      - name: tls
        secret:
          secretName: audit-receiver-tls

---
apiVersion: v1
kind: Service
metadata:
  name: audit-receiver
  namespace: audit-system
spec:
  selector:
    app: audit-receiver
  ports:
  - port: 443
    targetPort: 443
```

## Configuring S3 Object Lock for Immutability

Enable S3 Object Lock to prevent deletion or modification of audit logs:

```bash
# Create S3 bucket with Object Lock
aws s3api create-bucket \
  --bucket immutable-audit-logs \
  --region us-east-1 \
  --object-lock-enabled-for-bucket

# Configure default retention
aws s3api put-object-lock-configuration \
  --bucket immutable-audit-logs \
  --object-lock-configuration '{
    "ObjectLockEnabled": "Enabled",
    "Rule": {
      "DefaultRetention": {
        "Mode": "GOVERNANCE",
        "Years": 7
      }
    }
  }'

# Enable versioning (required for Object Lock)
aws s3api put-bucket-versioning \
  --bucket immutable-audit-logs \
  --versioning-configuration Status=Enabled

# Configure bucket policy to prevent deletion
aws s3api put-bucket-policy \
  --bucket immutable-audit-logs \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "DenyDeletion",
      "Effect": "Deny",
      "Principal": "*",
      "Action": ["s3:DeleteObject", "s3:DeleteObjectVersion"],
      "Resource": "arn:aws:s3:::immutable-audit-logs/*"
    }]
  }'
```

## Implementing Hash Chain Verification

Create a tool that verifies the integrity of the audit log hash chain:

```python
# verify-audit-chain.py
#!/usr/bin/env python3

import json
import hashlib
import base64
import sys
from datetime import datetime
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

def load_audit_logs(directory):
    """Load all audit logs from directory"""
    import glob
    import os

    log_files = sorted(glob.glob(f"{directory}/**/*.json", recursive=True))
    logs = []

    for file_path in log_files:
        with open(file_path, 'r') as f:
            logs.append(json.load(f))

    return logs

def verify_signature(event, signature, public_key_str):
    """Verify cryptographic signature of an audit event"""
    try:
        public_key_bytes = base64.b64decode(public_key_str)
        public_key = serialization.load_der_public_key(
            public_key_bytes,
            backend=default_backend()
        )

        event_json = json.dumps(event, sort_keys=True).encode()
        signature_bytes = base64.b64decode(signature)

        public_key.verify(
            signature_bytes,
            event_json,
            padding.PKCS1v15(),
            hashes.SHA256()
        )
        return True
    except Exception as e:
        print(f"Signature verification failed: {e}")
        return False

def compute_hash(signed_event):
    """Compute hash of signed event"""
    data = json.dumps(signed_event, sort_keys=True).encode()
    return base64.b64encode(hashlib.sha256(data).digest()).decode()

def verify_hash_chain(logs):
    """Verify the hash chain integrity"""
    prev_hash = None

    for i, log in enumerate(logs):
        # Check if previous hash matches
        if prev_hash is not None:
            if log.get('prevHash') != prev_hash:
                print(f"Hash chain broken at log {i}")
                print(f"Expected: {prev_hash}")
                print(f"Got: {log.get('prevHash')}")
                return False

        # Verify signature
        if not verify_signature(log['event'], log['signature'], log['publicKey']):
            print(f"Signature verification failed at log {i}")
            return False

        # Compute hash for next iteration
        prev_hash = compute_hash(log)

    return True

def main():
    if len(sys.argv) != 2:
        print("Usage: verify-audit-chain.py <log-directory>")
        sys.exit(1)

    log_dir = sys.argv[1]
    print(f"Loading audit logs from {log_dir}...")

    logs = load_audit_logs(log_dir)
    print(f"Loaded {len(logs)} audit log entries")

    print("Verifying hash chain and signatures...")
    if verify_hash_chain(logs):
        print("✓ Audit trail verified: No tampering detected")
        sys.exit(0)
    else:
        print("✗ Audit trail verification failed: Tampering detected")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

Run verification periodically:

```yaml
# audit-verification-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: audit-chain-verification
  namespace: audit-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verifier
            image: audit-verifier:latest
            command: ["/app/verify-audit-chain.py", "/audit-logs"]
            volumeMounts:
            - name: audit-logs
              mountPath: /audit-logs
              readOnly: true
          volumes:
          - name: audit-logs
            persistentVolumeClaim:
              claimName: audit-logs-cache
          restartPolicy: OnFailure
```

## Monitoring Audit Trail Health

Create alerts for audit trail tampering or missing events:

```yaml
# prometheus-audit-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: audit-trail-alerts
  namespace: monitoring
spec:
  groups:
  - name: audit_integrity
    interval: 1m
    rules:
    - alert: AuditChainVerificationFailure
      expr: audit_chain_verification_status == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Audit trail verification failed"
        description: "Audit log hash chain verification has failed, indicating potential tampering"

    - alert: AuditLogGap
      expr: (time() - audit_last_event_timestamp) > 300
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "No audit events received"
        description: "No audit events received for {{ $value }}s"

    - alert: AuditStorageFailure
      expr: rate(audit_storage_errors_total[5m]) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Audit log storage failures"
        description: "{{ $value }} audit logs failed to store"
```

Immutable audit trails provide the forensic evidence needed for security investigations and compliance audits. By combining cryptographic signing, hash chains, and write-once storage, you create tamper-proof logs that maintain their evidentiary value indefinitely. This transforms audit logging from a compliance checkbox into a powerful security control.
