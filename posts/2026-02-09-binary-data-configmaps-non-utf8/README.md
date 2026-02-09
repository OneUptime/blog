# How to Create Binary Data ConfigMaps for Non-UTF8 Content

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ConfigMaps, Binary Data

Description: Learn how to store binary files like images, certificates, and compiled binaries in Kubernetes ConfigMaps using the binaryData field for non-UTF8 content.

---

ConfigMaps are typically used for text configuration files, but sometimes you need to store binary data like images, certificates, fonts, or compiled binaries. Using the regular data field with binary content causes corruption because Kubernetes expects UTF-8 encoded text.

The binaryData field solves this by accepting base64-encoded binary content, preserving it exactly as provided. This enables you to store any file type in a ConfigMap and mount it in pods without corruption.

In this guide, you'll learn how to create ConfigMaps with binary data, convert files to base64, and use them in deployments for various use cases.

## Understanding data vs binaryData

ConfigMaps have two fields for storing data:

- **data**: For UTF-8 text strings (configuration files, scripts, etc.)
- **binaryData**: For base64-encoded binary content (images, certificates, binaries, etc.)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mixed-content
data:
  # Text content (UTF-8)
  config.txt: |
    This is a text file
    It can contain multiple lines
  # Binary content would corrupt here
binaryData:
  # Binary content (base64 encoded)
  image.png: iVBORw0KGgoAAAANSUhEUgAAAAUA...
  binary.dat: AQIDBAUG...
```

## Creating ConfigMap with Binary Data from Files

Use kubectl to create a ConfigMap from binary files:

```bash
# Create ConfigMap from binary files
kubectl create configmap binary-assets \
  --from-file=logo.png \
  --from-file=favicon.ico \
  --from-file=font.ttf \
  --dry-run=client -o yaml > binary-configmap.yaml

# View the generated YAML
cat binary-configmap.yaml
```

Kubernetes automatically detects binary content and uses the binaryData field:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: binary-assets
binaryData:
  logo.png: iVBORw0KGgoAAAANSUhEUgAAAB...
  favicon.ico: AAABAAIAEBAAAAEAIABoBAAAJgA...
  font.ttf: AAEAAAAOAIAAAwBgR1BPU8P...
```

## Manually Creating Binary ConfigMaps

Convert files to base64 and create ConfigMap manually:

```bash
# Convert file to base64
cat logo.png | base64 > logo.png.b64

# Or on macOS
cat logo.png | base64 -o logo.png.b64
```

Create ConfigMap YAML:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: static-assets
  namespace: production
binaryData:
  logo.png: |
    iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAABHNCSVQICAgIfAhkiAAAAAlwSFlz
    AAALEwAACxMBAJqcGAAAA...
  certificate.p12: |
    MIIK8QIBAzCCCrcGCSqGSIb3DQEHAaCCCqgEggqkMIIKoDCCBW8GCSqGSIb3DQEHBqCCBWAwggVc
    AgEAMIIFVQYJKoZIhvcN...
```

Apply the ConfigMap:

```bash
kubectl apply -f static-assets-configmap.yaml
```

## Using Binary ConfigMaps in Pods

Mount binary data as files in pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-server
  template:
    metadata:
      labels:
        app: web-server
    spec:
      containers:
      - name: nginx
        image: nginx:1.25
        volumeMounts:
        - name: static-assets
          mountPath: /usr/share/nginx/html/assets
          readOnly: true
      volumes:
      - name: static-assets
        configMap:
          name: binary-assets
```

The files are automatically decoded from base64 when mounted:

```
/usr/share/nginx/html/assets/
├── logo.png
├── favicon.ico
└── font.ttf
```

## Real-World Example: TLS Certificates

Store certificate bundles in ConfigMaps (for non-sensitive public certificates):

```bash
# Convert certificates to base64
cat ca-bundle.crt | base64 > ca-bundle.b64
cat intermediate.crt | base64 > intermediate.b64
```

Create ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ca-certificates
  namespace: production
data:
  # Text PEM format works in data field
  root-ca.pem: |
    -----BEGIN CERTIFICATE-----
    MIIDXTCCAkWgAwIBAgIJAKJ...
    -----END CERTIFICATE-----
binaryData:
  # DER format requires binaryData
  ca-bundle.der: MIIEDzCCAvegAwIBAgIBADANBgkqhkiG9w0BAQsFADBoMQswCQYDVQQ...
  intermediate.p7b: MIIGLQYJKoZIhvcNAQcCoIIGHjCCBhoCAQExADALBgkqh...
```

Mount in application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    spec:
      containers:
      - name: api
        image: api-server:latest
        volumeMounts:
        - name: ca-certs
          mountPath: /etc/ssl/certs/custom
          readOnly: true
        env:
        - name: SSL_CERT_DIR
          value: "/etc/ssl/certs/custom"
      volumes:
      - name: ca-certs
        configMap:
          name: ca-certificates
```

## Example: Default Images for Applications

Provide default images for applications:

```bash
# Create ConfigMap from multiple images
kubectl create configmap default-images \
  --from-file=placeholder.jpg \
  --from-file=avatar-default.png \
  --from-file=loading.gif \
  --from-file=error-404.jpg \
  --namespace production
```

Use in web application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: photo-app
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: app
        image: photo-app:latest
        volumeMounts:
        - name: default-images
          mountPath: /app/public/defaults
      volumes:
      - name: default-images
        configMap:
          name: default-images
```

## Example: Embedded Binaries

Store utility binaries in ConfigMaps for init containers:

```bash
# Convert binary to base64
cat kubectl | base64 > kubectl.b64
cat helm | base64 > helm.b64
```

ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cli-tools
binaryData:
  kubectl: H4sIAAAAAAAAA...
  helm: H4sIAAAAAAAAA...
```

Use in init container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: deployment-tool
spec:
  template:
    spec:
      initContainers:
      - name: install-tools
        image: busybox
        command:
        - sh
        - -c
        - |
          cp /tools/* /usr/local/bin/
          chmod +x /usr/local/bin/*
        volumeMounts:
        - name: tools
          mountPath: /tools
        - name: bin
          mountPath: /usr/local/bin
      containers:
      - name: app
        image: alpine
        command: ["/bin/sh", "-c", "kubectl version; helm version; sleep 3600"]
        volumeMounts:
        - name: bin
          mountPath: /usr/local/bin
      volumes:
      - name: tools
        configMap:
          name: cli-tools
          defaultMode: 0755
      - name: bin
        emptyDir: {}
```

## Size Limitations

ConfigMaps have a size limit of 1MB total. Be mindful when storing binary data:

```bash
# Check ConfigMap size
kubectl get configmap binary-assets -o yaml | wc -c

# Compress before base64 encoding for large files
gzip -c large-file.bin | base64 > large-file.bin.gz.b64
```

For files larger than 1MB, consider:

1. Splitting into multiple ConfigMaps
2. Using persistent volumes
3. Downloading from object storage (S3, GCS)
4. Using init containers to fetch files

## Verifying Binary Content

Verify files are correctly stored and decoded:

```bash
# Extract binary data from ConfigMap
kubectl get configmap binary-assets -o jsonpath='{.binaryData.logo\.png}' | base64 -d > extracted-logo.png

# Compare with original
diff original-logo.png extracted-logo.png

# Or check MD5 hash
md5sum original-logo.png
kubectl get configmap binary-assets -o jsonpath='{.binaryData.logo\.png}' | base64 -d | md5sum
```

## Automating Binary ConfigMap Creation

Script to create ConfigMaps from binary files:

```bash
#!/bin/bash

# create-binary-configmap.sh
CONFIGMAP_NAME=$1
NAMESPACE=${2:-default}

if [ -z "$CONFIGMAP_NAME" ]; then
  echo "Usage: $0 <configmap-name> [namespace]"
  exit 1
fi

# Start ConfigMap YAML
cat <<EOF > /tmp/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: $CONFIGMAP_NAME
  namespace: $NAMESPACE
binaryData:
EOF

# Add all binary files
for file in *.png *.jpg *.gif *.ico *.ttf *.woff *.pdf; do
  if [ -f "$file" ]; then
    echo "Adding $file..."
    echo "  $(basename $file): |" >> /tmp/configmap.yaml
    base64 < "$file" | sed 's/^/    /' >> /tmp/configmap.yaml
  fi
done

echo "ConfigMap created: /tmp/configmap.yaml"
kubectl apply -f /tmp/configmap.yaml
```

Usage:

```bash
chmod +x create-binary-configmap.sh
./create-binary-configmap.sh my-binary-assets production
```

## Best Practices

1. **Use Secrets for sensitive binaries**: If the binary contains sensitive data, use a Secret instead of ConfigMap.

2. **Keep ConfigMaps under 1MB**: Split large binary collections across multiple ConfigMaps.

3. **Compress when possible**: Use gzip before base64 encoding to reduce size.

4. **Name files descriptively**: Use clear file names that indicate content and purpose.

5. **Document binary content**: Add annotations explaining what binaries are included and why.

6. **Version binary content**: Include version numbers in ConfigMap names for binary updates.

7. **Validate after deployment**: Always verify binary files work correctly after mounting.

8. **Consider alternatives for large files**: Use persistent volumes or object storage for files over 100KB.

Binary ConfigMaps enable you to store non-UTF8 content directly in Kubernetes, simplifying deployment of applications that need bundled assets, certificates, or utility binaries. While they have size limitations, they provide a convenient way to package binary data alongside your deployments without external dependencies.
