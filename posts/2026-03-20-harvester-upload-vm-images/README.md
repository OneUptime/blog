# How to Upload VM Images to Harvester

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, VM Image, Upload

Description: Step-by-step instructions for uploading virtual machine disk images to Harvester from local files, URLs, and automated pipelines.

## Introduction

Uploading VM images to Harvester is a critical first step before creating virtual machines. Harvester supports importing images from remote URLs and uploading local files - including QCOW2, RAW, and ISO formats. This guide covers Harvester image import workflows through the UI, the Kubernetes API, and automation-friendly scripts.

## Supported Image Formats

| Format | Extension | Notes |
|---|---|---|
| QCOW2 | `.qcow2` | Preferred format; supports compression and snapshots |
| RAW | `.img`, `.raw` | Fastest I/O; larger file size |
| ISO | `.iso` | For installation media; used as CD-ROM |

## Method 1: Upload via the Harvester UI

### Uploading from a URL

1. Log in to the Harvester dashboard
2. Click **Images** in the left navigation
3. Click **Create**
4. Fill in the form:

```text
Name:         ubuntu-22-04-lts
Namespace:    default
Source Type:  Download
URL:          https://cloud-images.ubuntu.com/releases/jammy/release/ubuntu-22.04-server-cloudimg-amd64.img
```

5. Click **Create** - Harvester will begin downloading and importing the image

### Uploading from a Local File

1. Click **Images** → **Create**
2. Switch the source to **Upload**
3. Fill in:

```text
Name:         windows-server-2022
Namespace:    default
Source Type:  Upload
File:         [Choose File] → Select your .qcow2, .raw, or .iso
```

4. Click **Create** - the file upload begins immediately

## Method 2: Upload via kubectl

### From a URL

```yaml
# image-from-url.yaml

apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineImage
metadata:
  name: ubuntu-22-04-lts
  namespace: default
spec:
  displayName: "Ubuntu 22.04 LTS"
  # Download from a public URL
  sourceType: download
  url: "https://cloud-images.ubuntu.com/releases/jammy/release/ubuntu-22.04-server-cloudimg-amd64.img"
```

```bash
kubectl apply -f image-from-url.yaml

# Monitor import progress
kubectl get virtualmachineimage ubuntu-22-04-lts -n default -w

# Check the status conditions for errors
kubectl get virtualmachineimage ubuntu-22-04-lts -n default \
    -o jsonpath='{.status.conditions}' | jq .
```

## Method 3: Create via the Kubernetes API

For scripted imports from URLs, you can create the same `VirtualMachineImage` resource over the Kubernetes API:

```bash
#!/bin/bash
# create-image-via-api.sh - Create a Harvester VM image from a remote URL

set -euo pipefail

API_SERVER="http://127.0.0.1:8001"
IMAGE_NAME="ubuntu-22-04-lts"
NAMESPACE="default"
IMAGE_URL="https://cloud-images.ubuntu.com/releases/jammy/release/ubuntu-22.04-server-cloudimg-amd64.img"

kubectl proxy --api-prefix=/ --port=8001 >/tmp/kubectl-proxy.log 2>&1 &
PROXY_PID=$!
trap 'kill "${PROXY_PID}"' EXIT

until curl -fsS "${API_SERVER}/apis/harvesterhci.io/v1beta1" >/dev/null; do
    sleep 1
done

curl -fsS -X POST \
    "${API_SERVER}/apis/harvesterhci.io/v1beta1/namespaces/${NAMESPACE}/virtualmachineimages" \
    -H "Content-Type: application/json" \
    -d "{
        \"apiVersion\": \"harvesterhci.io/v1beta1\",
        \"kind\": \"VirtualMachineImage\",
        \"metadata\": {
            \"name\": \"${IMAGE_NAME}\",
            \"namespace\": \"${NAMESPACE}\"
        },
        \"spec\": {
            \"displayName\": \"Ubuntu 22.04 LTS\",
            \"sourceType\": \"download\",
            \"url\": \"${IMAGE_URL}\"
        }
    }"

kubectl wait virtualmachineimage/${IMAGE_NAME} \
    -n ${NAMESPACE} \
    --for=condition=Imported=True \
    --timeout=600s
```

```bash
# Make the script executable and run it
chmod +x create-image-via-api.sh
./create-image-via-api.sh
```

## Method 4: Import from an Existing PVC

If you've already created a disk in Kubernetes, you can import it as an image:

```yaml
# image-from-pvc.yaml
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineImage
metadata:
  name: custom-image-from-pvc
  namespace: default
spec:
  sourceType: export-from-volume
  pvcName: my-prepared-disk
  pvcNamespace: default
  displayName: "Custom Application Image"
```

## Batch Upload Script

For importing multiple images at once:

```bash
#!/bin/bash
# batch-import-images.sh - Import multiple cloud images from URLs

NAMESPACE="default"

# Define images as name|url pairs
declare -A IMAGES=(
    ["ubuntu-22-04-lts"]="https://cloud-images.ubuntu.com/releases/jammy/release/ubuntu-22.04-server-cloudimg-amd64.img"
    ["ubuntu-20-04-lts"]="https://cloud-images.ubuntu.com/releases/focal/release/ubuntu-20.04-server-cloudimg-amd64.img"
    ["debian-12"]="https://cloud.debian.org/images/cloud/bookworm/20260413-2447/debian-12-genericcloud-amd64-20260413-2447.qcow2"
    ["rocky-linux-9"]="https://download.rockylinux.org/pub/rocky/9/images/x86_64/Rocky-9-GenericCloud-Base-9.7-20251123.2.x86_64.qcow2"
)

for IMAGE_NAME in "${!IMAGES[@]}"; do
    IMAGE_URL="${IMAGES[$IMAGE_NAME]}"
    echo "Importing: ${IMAGE_NAME}"

    kubectl apply -f - <<EOF
apiVersion: harvesterhci.io/v1beta1
kind: VirtualMachineImage
metadata:
  name: ${IMAGE_NAME}
  namespace: ${NAMESPACE}
  labels:
    managed-by: batch-import
spec:
  sourceType: download
  url: "${IMAGE_URL}"
  displayName: "${IMAGE_NAME}"
EOF

done

echo "Waiting for all images to finish importing..."
for IMAGE_NAME in "${!IMAGES[@]}"; do
    kubectl wait virtualmachineimage/${IMAGE_NAME} \
        -n ${NAMESPACE} \
        --for=condition=Imported=True \
        --timeout=600s
    echo "${IMAGE_NAME}: Ready"
done
```

## Verifying Upload Completion

```bash
# Check all images and their status
kubectl get virtualmachineimage -n default \
    -o custom-columns=\
'NAME:.metadata.name,STATUS:.status.progress,SIZE:.status.size,AGE:.metadata.creationTimestamp'

# An image is ready when:
# - status.progress = 100
# - status.conditions contains type=Imported with status=True

kubectl get virtualmachineimage ubuntu-22-04-lts -n default -o yaml | \
    grep -A 5 "conditions:"
```

## Troubleshooting Upload Issues

**Image stuck in "Importing" state:**
```bash
# Check Longhorn manager logs for storage errors
kubectl logs -n longhorn-system \
    $(kubectl get pods -n longhorn-system -l app=longhorn-manager -o name | head -1)

# If you're using the CDI backend, check the CDI controller pod logs
kubectl logs -n harvester-system \
    $(kubectl get pods -n harvester-system -l app=cdi-controller -o name | head -1)
```

**URL download fails:**
```bash
# Test URL accessibility from within the cluster
kubectl run test-curl --image=curlimages/curl --restart=Never --rm -it -- \
    curl -I https://cloud-images.ubuntu.com/releases/jammy/release/ubuntu-22.04-server-cloudimg-amd64.img
```

## Conclusion

Harvester provides flexible options for importing VM images - from simple UI-driven uploads to scripted API imports for automation pipelines. Building a curated library of tested, labeled images sets a strong foundation for consistent VM deployments. Combine batch import scripts with a regular update schedule to keep your image library current with the latest OS patches and security updates.
