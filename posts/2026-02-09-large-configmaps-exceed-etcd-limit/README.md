# How to Handle Large ConfigMaps That Exceed the 1MB etcd Size Limit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ConfigMaps, Performance

Description: Learn strategies for managing large configuration data in Kubernetes when ConfigMaps exceed the 1MB etcd size limit, including splitting, compression, and alternative storage approaches.

---

Kubernetes stores ConfigMaps in etcd, which has a default size limit of 1MB per object. When you try to store large configuration files, ML models, or bundled assets in ConfigMaps, you hit this limit. The error message is cryptic, and the solution isn't obvious.

Large configurations require different approaches. You can split ConfigMaps into smaller pieces, compress data, use volume mounts from external storage, or leverage init containers to fetch configuration at runtime. Each approach has tradeoffs.

In this guide, you'll learn how to detect size issues, implement workarounds, and choose the right strategy for your use case.

## Understanding the Limit

etcd enforces a 1MB limit on individual objects. The actual usable space is less because:

- Base64 encoding increases size by ~33%
- Kubernetes adds metadata overhead
- YAML formatting adds whitespace

Practical limit for ConfigMap data: ~750KB

Check ConfigMap size:

```bash
# Get ConfigMap size in bytes
kubectl get configmap my-config -o yaml | wc -c

# Get human-readable size
kubectl get configmap my-config -o yaml | wc -c | awk '{print $1/1024 " KB"}'
```

## Strategy 1: Split ConfigMaps

Break large configurations into multiple ConfigMaps:

Original (too large):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: large-config
data:
  file1.json: |
    # 300KB of data
  file2.xml: |
    # 300KB of data
  file3.yaml: |
    # 300KB of data
  file4.conf: |
    # 300KB of data
  # Total: 1.2MB - too large!
```

Split into multiple ConfigMaps:

```yaml
# configmap-part1.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-part1
data:
  file1.json: |
    # 300KB
  file2.xml: |
    # 300KB
---
# configmap-part2.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: config-part2
data:
  file3.yaml: |
    # 300KB
  file4.conf: |
    # 300KB
```

Mount both in pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        volumeMounts:
        - name: config-part1
          mountPath: /etc/config/part1
        - name: config-part2
          mountPath: /etc/config/part2
      volumes:
      - name: config-part1
        configMap:
          name: config-part1
      - name: config-part2
        configMap:
          name: config-part2
```

## Strategy 2: Use Projected Volumes

Combine multiple ConfigMaps into one directory:

```yaml
volumes:
- name: combined-config
  projected:
    sources:
    - configMap:
        name: config-part1
    - configMap:
        name: config-part2
    - configMap:
        name: config-part3
```

All files appear in `/etc/config`:

```
/etc/config/
├── file1.json
├── file2.xml
├── file3.yaml
└── file4.conf
```

## Strategy 3: Compress Data

Compress before storing in ConfigMap:

```bash
# Compress configuration
gzip -c large-config.json | base64 > large-config.json.gz.b64
```

Store compressed data:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: compressed-config
binaryData:
  config.json.gz: |
    H4sIAAAAAAAAA+1cW3PbOBZ+z6/gTp56...
```

Decompress in init container:

```yaml
spec:
  initContainers:
  - name: decompress-config
    image: busybox
    command:
    - sh
    - -c
    - |
      gunzip -c /compressed/config.json.gz > /config/config.json
    volumeMounts:
    - name: compressed
      mountPath: /compressed
    - name: config
      mountPath: /config
  containers:
  - name: app
    image: app:latest
    volumeMounts:
    - name: config
      mountPath: /etc/config
  volumes:
  - name: compressed
    configMap:
      name: compressed-config
  - name: config
    emptyDir: {}
```

## Strategy 4: Use Persistent Volumes

For very large configurations, use PersistentVolumes:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: config-pvc
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
  storageClassName: nfs
---
apiVersion: v1
kind: Pod
metadata:
  name: config-loader
spec:
  containers:
  - name: loader
    image: alpine
    command:
    - sh
    - -c
    - |
      # Download or generate large configs
      wget -O /config/model.bin https://example.com/model.bin
      wget -O /config/data.json https://example.com/data.json
    volumeMounts:
    - name: config
      mountPath: /config
  volumes:
  - name: config
    persistentVolumeClaim:
      claimName: config-pvc
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        image: app:latest
        volumeMounts:
        - name: config
          mountPath: /etc/config
      volumes:
      - name: config
        persistentVolumeClaim:
          claimName: config-pvc
```

## Strategy 5: Init Container Download

Download configuration at pod startup:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      initContainers:
      - name: download-config
        image: curlimages/curl:latest
        command:
        - sh
        - -c
        - |
          curl -o /config/large-model.bin https://s3.amazonaws.com/bucket/model.bin
          curl -o /config/data.json https://s3.amazonaws.com/bucket/data.json
          curl -o /config/mappings.yaml https://s3.amazonaws.com/bucket/mappings.yaml
        volumeMounts:
        - name: config
          mountPath: /config
      containers:
      - name: app
        image: app:latest
        volumeMounts:
        - name: config
          mountPath: /etc/config
      volumes:
      - name: config
        emptyDir: {}
```

With credentials from Secret:

```yaml
initContainers:
- name: download-config
  image: amazon/aws-cli:latest
  command:
  - sh
  - -c
  - |
    aws s3 cp s3://bucket/config/model.bin /config/model.bin
    aws s3 cp s3://bucket/config/data.json /config/data.json
  env:
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: access-key-id
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: secret-access-key
  volumeMounts:
  - name: config
    mountPath: /config
```

## Strategy 6: ConfigMap Federation

For ML models or large static files:

```yaml
# Reference to external storage
apiVersion: v1
kind: ConfigMap
metadata:
  name: model-references
data:
  model-url: "https://storage.googleapis.com/models/v2/model.bin"
  weights-url: "https://storage.googleapis.com/models/v2/weights.bin"
  config-url: "https://storage.googleapis.com/models/v2/config.json"
  checksum-sha256: "abc123def456..."
```

Application downloads on startup:

```python
import os
import requests
import hashlib

def download_model():
    model_url = os.getenv('MODEL_URL')
    checksum = os.getenv('MODEL_CHECKSUM')

    # Download
    response = requests.get(model_url)

    # Verify checksum
    if hashlib.sha256(response.content).hexdigest() != checksum:
        raise ValueError("Model checksum mismatch")

    # Save
    with open('/tmp/model.bin', 'wb') as f:
        f.write(response.content)

download_model()
```

## Real-World Example: ML Model Deployment

Deploy a machine learning model with large files:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: model-metadata
data:
  model-info.json: |
    {
      "name": "sentiment-analysis-v2",
      "version": "2.1.0",
      "files": {
        "model": "gs://ml-models/sentiment-v2.1.0/model.pb",
        "vocab": "gs://ml-models/sentiment-v2.1.0/vocab.txt",
        "config": "gs://ml-models/sentiment-v2.1.0/config.json"
      },
      "checksums": {
        "model": "sha256:abc123...",
        "vocab": "sha256:def456...",
        "config": "sha256:ghi789..."
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-inference
spec:
  template:
    spec:
      initContainers:
      - name: download-model
        image: google/cloud-sdk:slim
        command:
        - sh
        - -c
        - |
          # Parse model info
          MODEL_URL=$(cat /metadata/model-info.json | jq -r '.files.model')
          VOCAB_URL=$(cat /metadata/model-info.json | jq -r '.files.vocab')
          CONFIG_URL=$(cat /metadata/model-info.json | jq -r '.files.config')

          # Download files
          gsutil cp $MODEL_URL /model/model.pb
          gsutil cp $VOCAB_URL /model/vocab.txt
          gsutil cp $CONFIG_URL /model/config.json

          # Verify checksums
          echo "$(cat /metadata/model-info.json | jq -r '.checksums.model' | cut -d: -f2) /model/model.pb" | sha256sum -c -
        volumeMounts:
        - name: metadata
          mountPath: /metadata
        - name: model
          mountPath: /model
      containers:
      - name: inference
        image: ml-inference-server:latest
        volumeMounts:
        - name: model
          mountPath: /models
        env:
        - name: MODEL_PATH
          value: /models/model.pb
      volumes:
      - name: metadata
        configMap:
          name: model-metadata
      - name: model
        emptyDir: {}
```

## Monitoring ConfigMap Sizes

Create alerts for large ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
data:
  configmap-size.yml: |
    groups:
    - name: configmap-size
      rules:
      - alert: ConfigMapNearSizeLimit
        expr: |
          (kube_configmap_info{} * on (namespace,configmap) group_left
          kube_configmap_metadata_resource_version) > 900000
        labels:
          severity: warning
        annotations:
          summary: "ConfigMap approaching size limit"
          description: "ConfigMap {{ $labels.configmap }} in {{ $labels.namespace }} is close to 1MB limit"
```

## Best Practices

1. **Use external storage for large files**: Store ML models, datasets, and large assets in S3, GCS, or Azure Blob.

2. **Compress when possible**: Use gzip for text-based configs that compress well.

3. **Split logically**: Divide configurations by component or feature, not arbitrarily.

4. **Cache downloaded configs**: Use persistent volumes to avoid repeated downloads.

5. **Verify checksums**: Always verify integrity of downloaded files.

6. **Monitor sizes**: Set up alerts before hitting the 1MB limit.

7. **Document splits**: Comment your manifests explaining why configs are split.

8. **Consider alternatives**: For truly large configs, question whether ConfigMaps are the right tool.

While Kubernetes ConfigMaps have a 1MB size limit, multiple strategies exist for handling larger configurations. Choose splitting for moderate overages, compression for text data, and external storage with init containers for truly large files like ML models and datasets. Each approach has its place depending on your specific requirements.
