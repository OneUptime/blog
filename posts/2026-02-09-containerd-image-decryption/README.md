# How to Configure containerd Image Decryption for Encrypted Container Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Containerd, Security, Encryption, Container Image

Description: Learn how to configure containerd to work with encrypted container images for enhanced security in Kubernetes, protecting sensitive application code and data at rest in registries.

---

Container images stored in registries contain application code, libraries, and potentially sensitive data. Encrypting images protects this content from unauthorized access. containerd supports encrypted container images using the OCI image encryption specification, allowing secure storage and distribution of containers. This guide shows you how to implement image encryption in Kubernetes.

## Understanding OCI Image Encryption

OCI image encryption encrypts individual image layers using public-key cryptography. Each layer is encrypted with a randomly generated data encryption key (DEK), which is then encrypted with recipient public keys. Only holders of the corresponding private keys can decrypt layers. This ensures that even if someone gains access to your registry, they cannot extract image contents without the decryption keys.

The encryption process happens during image build or push operations. Decryption occurs automatically when pulling images to nodes that have the appropriate private keys configured. containerd handles decryption transparently, presenting unencrypted layers to the container runtime.

## Installing Image Encryption Tools

Install tools for encrypting and managing encrypted images.

```bash
# Install skopeo with encryption support

sudo apt-get update
sudo apt-get install -y skopeo git make

# Install imgcrypt tools: ctd-decoder and ctr-enc
git clone https://github.com/containerd/imgcrypt.git
cd imgcrypt
make
sudo make install
```

Generate encryption keys:

```bash
# Generate RSA keypair for image encryption
openssl genrsa -out mykey.pem 4096
openssl rsa -in mykey.pem -pubout -out mykey.pub

# Store keys securely
sudo mkdir -p /etc/containerd/keys
sudo cp mykey.pem /etc/containerd/keys/
sudo chmod 600 /etc/containerd/keys/mykey.pem
```

## Configuring containerd for Decryption

Configure containerd to automatically decrypt encrypted images.

```toml
# /etc/containerd/config.toml
version = 2

[plugins."io.containerd.grpc.v1.cri"]
  # Enable image decryption
  [plugins."io.containerd.grpc.v1.cri".image_decryption]
    # Select the node key model for CRI image decryption
    key_model = "node"

[stream_processors]
  # Configure decryption stream processor
  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.gzip"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+gzip+encrypted"]
    returns = "application/vnd.oci.image.layer.v1.tar+gzip"
    path = "/usr/local/bin/ctd-decoder"
    args = ["--decryption-keys-path", "/etc/containerd/keys"]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar.zstd"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+zstd+encrypted"]
    returns = "application/vnd.oci.image.layer.v1.tar+zstd"
    path = "/usr/local/bin/ctd-decoder"
    args = ["--decryption-keys-path", "/etc/containerd/keys"]

  [stream_processors."io.containerd.ocicrypt.decoder.v1.tar"]
    accepts = ["application/vnd.oci.image.layer.v1.tar+encrypted"]
    returns = "application/vnd.oci.image.layer.v1.tar"
    path = "/usr/local/bin/ctd-decoder"
    args = ["--decryption-keys-path", "/etc/containerd/keys"]
```

The decoder reads private key files from the directory passed to `--decryption-keys-path`. No separate key configuration file is required for local JWE keys.

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Encrypting Container Images

Encrypt images using skopeo or ctr-enc.

```bash
# Encrypt an existing image
skopeo copy \
  --encryption-key jwe:/etc/containerd/keys/mykey.pub \
  docker://mycompany/app:v1.0.0 \
  docker://mycompany/app:v1.0.0-encrypted

# Build and push with Buildx, then encrypt the pushed image
docker buildx build \
  --push \
  -t mycompany/app:v1.0.0 \
  .
skopeo copy \
  --encryption-key jwe:/etc/containerd/keys/mykey.pub \
  docker://mycompany/app:v1.0.0 \
  docker://mycompany/app:v1.0.0-encrypted

# Encrypt with ctr-enc
ctr-enc images pull mycompany/app:v1.0.0
ctr-enc images encrypt \
  --recipient jwe:mykey.pub \
  --platform linux/amd64 \
  mycompany/app:v1.0.0 \
  mycompany/app:v1.0.0-encrypted
ctr-enc images push mycompany/app:v1.0.0-encrypted
```

## Deploying Encrypted Images

Deploy pods using encrypted images that containerd will automatically decrypt.

```yaml
# encrypted-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      containers:
      - name: app
        # Use encrypted image
        image: mycompany/app:v1.0.0-encrypted
        imagePullPolicy: Always
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 1000m
            memory: 1Gi
```

containerd automatically decrypts layers when pulling the image if the correct private key is present.

## Managing Keys with Kubernetes Secrets

Store decryption keys as Kubernetes secrets and mount them to nodes.

```yaml
# Create secret with decryption keys
apiVersion: v1
kind: Secret
metadata:
  name: image-decryption-keys
  namespace: kube-system
type: Opaque
data:
  mykey.pem: <base64-encoded-private-key>
---
# DaemonSet to distribute keys to nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: key-distributor
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: key-distributor
  template:
    metadata:
      labels:
        app: key-distributor
    spec:
      hostPID: true
      containers:
      - name: distributor
        image: alpine:3.18
        command:
        - sh
        - -c
        - |
          mkdir -p /host/etc/containerd/keys
          cp /keys/* /host/etc/containerd/keys/
          chmod 600 /host/etc/containerd/keys/*
          # Keep running to prevent restarts
          tail -f /dev/null
        volumeMounts:
        - name: keys
          mountPath: /keys
          readOnly: true
        - name: host-containerd
          mountPath: /host/etc/containerd
        securityContext:
          privileged: true
      volumes:
      - name: keys
        secret:
          secretName: image-decryption-keys
      - name: host-containerd
        hostPath:
          path: /etc/containerd
```

## Implementing Key Rotation

Rotate encryption keys periodically for better security.

```bash
#!/bin/bash
# rotate-encryption-keys.sh

OLD_KEY="/etc/containerd/keys/mykey-old.pem"
NEW_KEY="/etc/containerd/keys/mykey-new.pem"
NEW_PUB="/etc/containerd/keys/mykey-new.pub"

# Generate new keypair
openssl genrsa -out $NEW_KEY 4096
openssl rsa -in $NEW_KEY -pubout -out $NEW_PUB

# Re-encrypt all images with new key
for image in $(ctr-enc images list -q | grep encrypted); do
  echo "Re-encrypting $image"

  # Pull with old key
  ctr-enc images pull $image

  # Decrypt
  decrypted="${image%-encrypted}"
  ctr-enc images decrypt --key $OLD_KEY $image $decrypted

  # Re-encrypt with new key
  ctr-enc images encrypt --recipient jwe:$NEW_PUB $decrypted "${image}-new"

  # Push re-encrypted image
  ctr-enc images push "${image}-new"

  # Tag as current
  ctr-enc images tag "${image}-new" $image
  ctr-enc images push $image

  # Cleanup
  ctr-enc images rm $decrypted "${image}-new"
done

# Archive old key
mkdir -p /etc/containerd/keys/archive
mv $OLD_KEY "/etc/containerd/keys/archive/mykey-$(date +%Y%m%d).pem"

echo "Key rotation complete"
```

## Monitoring Decryption Operations

Track image decryption performance and failures.

```bash
# Check containerd logs for decryption activity
sudo journalctl -u containerd | grep -i decrypt

# Monitor containerd metrics if the metrics endpoint is enabled
curl http://localhost:1338/v1/metrics | grep containerd

# Verify encrypted image layers
ctr-enc images layerinfo mycompany/app:v1.0.0-encrypted
```

Encrypted container images provide an additional security layer for protecting sensitive application code and data. By encrypting layers during build and automatically decrypting during pull operations, you ensure that image contents remain protected at rest in registries. This is essential for compliance requirements, protecting intellectual property, and preventing unauthorized access to containerized applications. Implement key management procedures and monitor decryption operations to maintain security without impacting deployment workflows.
