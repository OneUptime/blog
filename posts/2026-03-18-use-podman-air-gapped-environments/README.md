# How to Use Podman in Air-Gapped Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Air-Gapped, Container, Security, Linux, DevOps, Offline, Registry, Compliance

Description: Deploy and manage Podman containers in air-gapped environments with no internet access, covering offline image bundles, private registries, and image verification.

---

> Air-gapped environments have no connection to the internet by design. Whether driven by security requirements, regulatory compliance, or operational necessity, running containers without pulling from public registries requires careful planning. Podman's ability to import images from archives and operate without external services makes it a natural fit for disconnected infrastructure.

Air-gapped systems are common in government, defense, financial services, healthcare, and industrial control environments. These networks are physically isolated from the internet to prevent data exfiltration and unauthorized access. Running containers in these environments means you cannot pull images from Docker Hub or any external registry. Every image, every update, and every dependency must be transferred through an approved data transfer process, typically involving removable media that passes through a security review.

---

## Architecture Overview

A typical air-gapped container workflow has three zones:

1. **Connected workstation** - Has internet access. Used to pull images, scan them, and create transfer bundles.
2. **Transfer boundary** - Removable media (USB, DVD) or a data diode that moves approved artifacts into the air-gapped network.
3. **Air-gapped network** - No internet. Runs a private registry and Podman hosts that consume images from the internal registry.

---

## Phase 1: Preparing Images on the Connected Side

### Pulling and Saving Images

On a connected workstation, pull all the images you need and save them to archive files:

```bash
#!/bin/bash
# pull-and-save.sh - Run on connected workstation

IMAGES=(
  "docker.io/library/nginx:1.25-alpine"
  "docker.io/library/postgres:16-alpine"
  "docker.io/library/redis:7-alpine"
  "docker.io/library/python:3.12-slim"
  "docker.io/library/node:20-alpine"
)

BUNDLE_NAME="transfer-bundle-$(date +%Y%m%d)"
EXPORT_DIR="./$BUNDLE_NAME"
mkdir -p "$EXPORT_DIR/images"

for image in "${IMAGES[@]}"; do
  filename=$(echo "$image" | tr '/:' '_')
  echo "Pulling $image..."
  podman pull "$image"
  echo "Saving to $filename.tar..."
  podman save -o "$EXPORT_DIR/images/$filename.tar" "$image"
done

# Generate manifest
echo "# Image Transfer Manifest" > "$EXPORT_DIR/MANIFEST.txt"
echo "# Generated: $(date -u)" >> "$EXPORT_DIR/MANIFEST.txt"
echo "" >> "$EXPORT_DIR/MANIFEST.txt"
for image in "${IMAGES[@]}"; do
  filename=$(echo "$image" | tr '/:' '_')
  sha=$(sha256sum "$EXPORT_DIR/images/$filename.tar" | awk '{print $1}')
  echo "$sha  $filename.tar  $image" >> "$EXPORT_DIR/MANIFEST.txt"
done

echo "Bundle created: $EXPORT_DIR"
cat "$EXPORT_DIR/MANIFEST.txt"
```

### Scanning Images Before Transfer

Always scan images for vulnerabilities before transferring them into the air-gapped network:

```bash
# Install and run Trivy for vulnerability scanning
for tar in "$EXPORT_DIR"/images/*.tar; do
  echo "Scanning $(basename "$tar")..."
  trivy image --input "$tar" --severity HIGH,CRITICAL
done
```

### Creating a Checksummed Bundle

```bash
BUNDLE_NAME=$(basename "$EXPORT_DIR")
(
  cd "$EXPORT_DIR"
  sha256sum images/*.tar > SHA256SUMS
)
tar czf "$BUNDLE_NAME.tar.gz" "$BUNDLE_NAME"
sha256sum "$BUNDLE_NAME.tar.gz" > "$BUNDLE_NAME.tar.gz.sha256"
```

---

## Phase 2: Transferring into the Air-Gapped Network

Transfer the bundle through your organization's approved data transfer process. This typically involves:

1. Copying the bundle to removable media
2. Running the media through a security scan at the boundary
3. Importing the media into the air-gapped network

On the air-gapped side, verify the bundle integrity:

```bash
# Verify the bundle checksum
sha256sum -c transfer-bundle-20260318.tar.gz.sha256

# Extract the bundle
tar xzf transfer-bundle-20260318.tar.gz

# Verify individual image checksums
cd transfer-bundle-20260318
sha256sum -c SHA256SUMS
```

---

## Phase 3: Setting Up a Private Registry

Run a private container registry inside the air-gapped network so all hosts can pull images without individual file transfers.

### Loading the Registry Image

First, include the registry image in your transfer bundle:

```bash
# On the connected side, add registry to your pull list
podman pull docker.io/library/registry:3
podman save -o registry_3.tar docker.io/library/registry:3
```

On the air-gapped side:

```bash
podman load -i registry_3.tar
```

### Running the Private Registry

```bash
# Create directories for registry storage and certificates
mkdir -p ~/registry/{data,certs,auth}

# Generate a self-signed certificate
openssl req -newkey rsa:4096 -nodes \
  -keyout ~/registry/certs/registry.key \
  -x509 -days 3650 \
  -out ~/registry/certs/registry.crt \
  -subj "/CN=registry.internal" \
  -addext "subjectAltName=DNS:registry.internal,IP:10.0.0.100"

# Run the registry
podman run -d --name registry \
  -p 5000:5000 \
  -v ~/registry/data:/var/lib/registry:Z \
  -v ~/registry/certs:/certs:ro,Z \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/registry.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/registry.key \
  -e REGISTRY_STORAGE_DELETE_ENABLED=true \
  docker.io/library/registry:3
```

### Distributing the CA Certificate

Copy the certificate to all hosts in the air-gapped network:

```bash
# On each Podman host
sudo mkdir -p /etc/containers/certs.d/registry.internal:5000
sudo cp registry.crt /etc/containers/certs.d/registry.internal:5000/ca.crt
```

### Populating the Registry

Load transferred images and push them to the private registry:

```bash
#!/bin/bash
# load-to-registry.sh
REGISTRY="registry.internal:5000"

for tar in images/*.tar; do
  echo "Loading $tar..."
  image=$(podman load -i "$tar" | sed -n 's/^Loaded image(s):  *//p; s/^Loaded image:  *//p' | head -1)
  if [ -z "$image" ]; then
    echo "Failed to determine the loaded image name for $tar"
    exit 1
  fi

  # Tag for the internal registry
  basename=$(echo "$image" | sed 's|docker.io/library/||; s|docker.io/||')
  podman tag "$image" "$REGISTRY/$basename"

  # Push to internal registry
  podman push "$REGISTRY/$basename"
  echo "Pushed: $REGISTRY/$basename"
done
```

---

## Phase 4: Using Podman on Air-Gapped Hosts

### Configuring Hosts to Use the Private Registry

On each Podman host in the air-gapped network:

```bash
mkdir -p ~/.config/containers

cat > ~/.config/containers/registries.conf <<EOF
unqualified-search-registries = ['registry.internal:5000']

[[registry]]
location = "registry.internal:5000"

[[registry]]
location = "docker.io"
blocked = true

[[registry]]
location = "quay.io"
blocked = true

[[registry]]
location = "ghcr.io"
blocked = true
EOF
```

Blocking public registries ensures that if a network misconfiguration occurs, containers will not accidentally try to reach the internet.

### Pulling from the Internal Registry

```bash
podman pull registry.internal:5000/nginx:1.25-alpine
podman pull registry.internal:5000/postgres:16-alpine
```

### Running Applications

```bash
podman run -d --name web \
  -p 8080:80 \
  registry.internal:5000/nginx:1.25-alpine

podman run -d --name db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=internal_secret \
  -v pgdata:/var/lib/postgresql/data:Z \
  registry.internal:5000/postgres:16-alpine
```

---

## Building Images in Air-Gapped Environments

### Offline Builds with Pre-Loaded Base Images

```bash
cat > Dockerfile <<EOF
FROM registry.internal:5000/python:3.12-slim
WORKDIR /app
COPY requirements.txt .
COPY wheels/ /tmp/wheels/
RUN pip install --no-index --find-links /tmp/wheels/ -r requirements.txt \
    && rm -rf /tmp/wheels/
COPY . .
EXPOSE 8080
CMD ["python", "app.py"]
EOF
```

### Pre-Downloading Python Packages

On the connected side, download wheel files for transfer:

```bash
python -m pip wheel -r requirements.txt -w ./wheels/
```

Transfer the wheels directory along with your image bundle. Then build inside the air-gapped network:

```bash
podman build -t registry.internal:5000/myapp:v1.0 .
podman push registry.internal:5000/myapp:v1.0
```

### Pre-Downloading Node.js Packages

```bash
# On connected side
npm ci --cache ./npm-cache/
tar czf npm-cache.tar.gz npm-cache/ package.json package-lock.json

# Inside the air-gapped build environment
npm ci --offline --cache ./npm-cache/
```

---

## Image Verification and Signing

### Verifying Image Integrity

Create a verification script that runs after extracting the bundle:

```bash
#!/bin/bash
# verify-images.sh
MANIFEST="MANIFEST.txt"

echo "Verifying image integrity..."
while read -r expected_sha filename _image_ref; do
  [[ "$expected_sha" =~ ^# ]] && continue
  [[ -z "$expected_sha" ]] && continue

  actual_sha=$(sha256sum "images/$filename" | awk '{print $1}')
  if [ "$expected_sha" = "$actual_sha" ]; then
    echo "PASS: $filename"
  else
    echo "FAIL: $filename (expected $expected_sha, got $actual_sha)"
    exit 1
  fi
done < "$MANIFEST"

echo "All images verified successfully"
```

### Using Cosign for Image Signing

Sign images before transfer and verify inside the air-gapped network:

```bash
# On connected side - sign the image
cosign sign --key cosign.key docker.io/myorg/myapp:v1.0

# Save the signed image and signatures for transfer
cosign save docker.io/myorg/myapp:v1.0 --dir ./signed-image/

# On air-gapped side - verify offline
cosign verify --key cosign.pub --offline --local-image ./signed-image
```

---

## Update Workflow

### Regular Update Process

```bash
#!/bin/bash
# update-cycle.sh - Run on air-gapped registry host after receiving new bundle

BUNDLE=$1
echo "Processing update bundle: $BUNDLE"

# Extract and verify
tar xzf "$BUNDLE"
cd "$(basename "$BUNDLE" .tar.gz)"
sha256sum -c SHA256SUMS || exit 1

# Load and push new images
for tar in images/*.tar; do
  image=$(podman load -i "$tar" | sed -n 's/^Loaded image(s):  *//p; s/^Loaded image:  *//p' | head -1)
  if [ -z "$image" ]; then
    echo "Failed to determine the loaded image name for $tar"
    exit 1
  fi
  basename=$(echo "$image" | sed 's|docker.io/library/||; s|docker.io/||')
  podman tag "$image" "registry.internal:5000/$basename"
  podman push "registry.internal:5000/$basename"
done

echo "Registry updated. Hosts can now pull new versions."
```

---

## Conclusion

Running Podman in air-gapped environments requires discipline around image preparation, transfer, and verification, but the workflow is straightforward once established. Build image transfer bundles on the connected side with checksums and vulnerability scans, transfer through your approved boundary process, and load images into a private registry inside the air-gapped network. Block public registries on all hosts to prevent accidental external connections. Sign and verify images to maintain supply chain integrity. With a private registry and well-defined update cycles, you can run containerized applications in fully disconnected environments using the same Podman commands and patterns you use everywhere else.
