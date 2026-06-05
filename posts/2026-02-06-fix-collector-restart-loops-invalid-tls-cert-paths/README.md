# How to Fix Collector Restart Loops Caused by Invalid TLS Certificate Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, TLS, Configuration

Description: Fix OpenTelemetry Collector restart loops caused by TLS certificate files not being found at the configured paths.

The Collector starts, tries to initialize an exporter with TLS, cannot find the certificate files, and exits with an error. Kubernetes restarts it, and the cycle repeats. The error message is usually:

```text
Error: cannot start pipelines: failed to create "otlp" exporter:
  failed to load TLS config: open /etc/ssl/certs/ca.crt: no such file or directory
```

## Common Causes

### Cause 1: Volume Mount Path Does Not Match Config Path

```yaml
# Collector config references /etc/ssl/certs/

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      ca_file: /etc/ssl/certs/ca.crt
      cert_file: /etc/ssl/certs/client.crt
      key_file: /etc/ssl/certs/client.key
```

```yaml
# But the volume is mounted to a different path
volumes:
- name: tls-certs
  secret:
    secretName: otel-tls
volumeMounts:
- name: tls-certs
  mountPath: /etc/otel/certs   # MISMATCH
```

Fix: align the volume mount path with the config:

```yaml
volumeMounts:
- name: tls-certs
  mountPath: /etc/ssl/certs    # matches config
```

### Cause 2: Secret Key Names Do Not Match File Names

Kubernetes Secrets mount each key as a file. If the key names in the Secret do not match the file names in the config:

```yaml
# The Secret has these keys
apiVersion: v1
kind: Secret
metadata:
  name: otel-tls
data:
  tls.crt: <base64>     # file will be named "tls.crt"
  tls.key: <base64>     # file will be named "tls.key"
  ca.crt: <base64>      # file will be named "ca.crt"
```

```yaml
# But the config references different file names
tls:
  ca_file: /etc/ssl/certs/ca-bundle.crt    # expects "ca-bundle.crt"
  cert_file: /etc/ssl/certs/client.crt      # expects "client.crt"
  key_file: /etc/ssl/certs/client.key       # expects "client.key"
```

Fix: either rename the Secret keys or update the config paths:

```yaml
# Option 1: Update config to match Secret key names
tls:
  ca_file: /etc/ssl/certs/ca.crt
  cert_file: /etc/ssl/certs/tls.crt
  key_file: /etc/ssl/certs/tls.key
```

```yaml
# Option 2: Use items to map Secret keys to custom file names
volumeMounts:
- name: tls-certs
  mountPath: /etc/ssl/certs
volumes:
- name: tls-certs
  secret:
    secretName: otel-tls
    items:
    - key: tls.crt
      path: client.crt    # mapped to expected name
    - key: tls.key
      path: client.key
    - key: ca.crt
      path: ca-bundle.crt
```

### Cause 3: Certificate Rotation Broke the Path

If you use cert-manager or another certificate rotation tool, the files might be symlinks that change during rotation:

```bash
# Inside the container
ls -la /etc/ssl/certs/
# tls.crt -> ..data/tls.crt
# ..data -> ..2024_01_15_12_00_00.123456789
```

If the files become inaccessible temporarily during rotation, the Collector can fail when it starts and loads the TLS configuration.

Fix: add an init container that waits for certificate availability before the Collector container starts:

```yaml
initContainers:
- name: wait-for-tls-certs
  image: busybox:1.36
  command:
  - sh
  - -c
  - "until test -f /etc/ssl/certs/tls.crt && test -f /etc/ssl/certs/tls.key; do sleep 2; done"
  volumeMounts:
  - name: tls-certs
    mountPath: /etc/ssl/certs
    readOnly: true
```

## Debugging TLS Configuration

### Step 1: Check If Files Exist in the Container

```bash
kubectl exec <pod> -- ls -la /etc/ssl/certs/
```

### Step 2: Verify File Permissions

```bash
kubectl exec <pod> -- stat /etc/ssl/certs/ca.crt
```

The Collector process must have read access to the certificate files.

### Step 3: Validate Certificate Format

```bash
kubectl exec <pod> -- openssl x509 -in /etc/ssl/certs/tls.crt -text -noout
```

If the certificate is malformed, the Collector will also fail.

### Step 4: Test the Connection Manually

```bash
kubectl exec <pod> -- openssl s_client \
  -connect backend:4317 \
  -cert /etc/ssl/certs/tls.crt \
  -key /etc/ssl/certs/tls.key \
  -CAfile /etc/ssl/certs/ca.crt
```

## Using insecure for Development

For development environments, you can skip TLS entirely:

```yaml
exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true
```

Never use `insecure: true` in production.

## Complete Working TLS Configuration

```yaml
# Secret with TLS certs
apiVersion: v1
kind: Secret
metadata:
  name: otel-tls
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
  ca.crt: <base64-encoded-ca>
---
# Collector deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.121.0
        volumeMounts:
        - name: tls-certs
          mountPath: /etc/ssl/certs
          readOnly: true
      volumes:
      - name: tls-certs
        secret:
          secretName: otel-tls
```

```yaml
# Collector config
exporters:
  otlp:
    endpoint: backend:4317
    tls:
      ca_file: /etc/ssl/certs/ca.crt
      cert_file: /etc/ssl/certs/tls.crt
      key_file: /etc/ssl/certs/tls.key
```

The key is consistency: the volume mount path, the Secret key names, and the config file paths must all align. Verify with `kubectl exec` before deploying.
