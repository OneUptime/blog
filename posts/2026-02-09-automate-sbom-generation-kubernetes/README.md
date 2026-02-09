# How to Automate SBOM Generation for All Container Images in a Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, SBOM, Security, Supply Chain, Compliance, CycloneDX

Description: Automate Software Bill of Materials (SBOM) generation for every container image running in Kubernetes clusters using Syft, integrate with admission webhooks, and maintain compliance with software transparency requirements.

---

Software Bill of Materials (SBOM) generation has become a compliance requirement for many industries, especially after the US Executive Order on Cybersecurity. SBOMs document all software components, libraries, and dependencies in your container images, making vulnerability management and license compliance tractable.

Manual SBOM generation doesn't scale when you have hundreds of container images deployed across multiple clusters. Automated SBOM generation integrated with your Kubernetes deployment pipeline ensures every running container has an up-to-date SBOM, enabling rapid vulnerability response and continuous compliance verification.

## Understanding SBOM Formats and Tools

Two main SBOM formats dominate: SPDX and CycloneDX. SPDX focuses on license compliance and originated from the Linux Foundation. CycloneDX targets security use cases and vulnerability management. Most tools support both formats, so choose based on your primary use case or regulatory requirements.

Popular SBOM generation tools include Syft (supports multiple formats), Trivy (vulnerability scanning plus SBOM), and Grype (pairs with Syft for vulnerability analysis). For Kubernetes automation, Syft offers the best balance of speed, accuracy, and format support.

## Installing Syft for SBOM Generation

Start by deploying Syft in your cluster for on-demand SBOM generation:

```bash
# Install Syft CLI locally for testing
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Generate SBOM for a test image
syft packages nginx:latest -o cyclonedx-json > nginx-sbom.json
syft packages nginx:latest -o spdx-json > nginx-sbom-spdx.json

# View the SBOM
cat nginx-sbom.json | jq '.components[] | {name: .name, version: .version, type: .type}'
```

Create a container image that includes Syft for cluster deployments:

```dockerfile
# Dockerfile.sbom-generator
FROM anchore/syft:latest

# Add kubectl for Kubernetes integration
RUN apk add --no-cache curl && \
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Add script for automated generation
COPY generate-sboms.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/generate-sboms.sh

ENTRYPOINT ["/usr/local/bin/generate-sboms.sh"]
```

Create the generation script:

```bash
# generate-sboms.sh
#!/bin/bash

set -euo pipefail

SBOM_FORMAT="${SBOM_FORMAT:-cyclonedx-json}"
OUTPUT_DIR="${OUTPUT_DIR:-/sboms}"
NAMESPACE="${NAMESPACE:-all}"

mkdir -p "$OUTPUT_DIR"

echo "Generating SBOMs for all images in namespace: $NAMESPACE"

# Get all unique images running in the cluster
if [ "$NAMESPACE" = "all" ]; then
  IMAGES=$(kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u)
else
  IMAGES=$(kubectl get pods -n "$NAMESPACE" -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u)
fi

echo "Found $(echo "$IMAGES" | wc -l) unique images"

for IMAGE in $IMAGES; do
  # Sanitize image name for filename
  FILENAME=$(echo "$IMAGE" | tr '/:' '_')
  SBOM_FILE="$OUTPUT_DIR/${FILENAME}.${SBOM_FORMAT}"

  echo "Generating SBOM for $IMAGE..."

  if syft packages "$IMAGE" -o "$SBOM_FORMAT" > "$SBOM_FILE" 2>/dev/null; then
    echo "  ✓ Generated: $SBOM_FILE"

    # Also generate vulnerability scan
    if command -v grype &> /dev/null; then
      grype sbom:"$SBOM_FILE" -o json > "${SBOM_FILE}.vulns.json" 2>/dev/null || true
    fi
  else
    echo "  ✗ Failed to generate SBOM for $IMAGE"
  fi
done

echo "SBOM generation complete. Files saved to $OUTPUT_DIR"
```

Build and push the image:

```bash
docker build -t sbom-generator:latest -f Dockerfile.sbom-generator .
docker tag sbom-generator:latest your-registry.com/sbom-generator:latest
docker push your-registry.com/sbom-generator:latest
```

## Deploying Automated SBOM Generation as a CronJob

Create a Kubernetes CronJob that periodically generates SBOMs for all running images:

```yaml
# sbom-generation-cronjob.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sbom-generator
  namespace: security

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sbom-generator
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sbom-generator
subjects:
  - kind: ServiceAccount
    name: sbom-generator
    namespace: security
roleRef:
  kind: ClusterRole
  name: sbom-generator
  apiGroup: rbac.authorization.k8s.io

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: sbom-storage
  namespace: security
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi

---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sbom-generator
  namespace: security
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: sbom-generator
          containers:
          - name: generator
            image: your-registry.com/sbom-generator:latest
            env:
            - name: SBOM_FORMAT
              value: "cyclonedx-json"
            - name: OUTPUT_DIR
              value: "/sboms/$(date +%Y-%m-%d)"
            - name: NAMESPACE
              value: "all"
            volumeMounts:
            - name: sbom-storage
              mountPath: /sboms
            - name: docker-socket
              mountPath: /var/run/docker.sock
              readOnly: true
            resources:
              requests:
                cpu: 500m
                memory: 1Gi
              limits:
                cpu: 2000m
                memory: 4Gi
          volumes:
          - name: sbom-storage
            persistentVolumeClaim:
              claimName: sbom-storage
          - name: docker-socket
            hostPath:
              path: /var/run/docker.sock
              type: Socket
          restartPolicy: OnFailure
```

Deploy the CronJob:

```bash
kubectl create namespace security --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f sbom-generation-cronjob.yaml

# Verify the CronJob was created
kubectl get cronjob -n security

# Manually trigger a job to test
kubectl create job --from=cronjob/sbom-generator sbom-test -n security
kubectl logs -n security job/sbom-test -f
```

## Integrating SBOM Generation with CI/CD

Generate SBOMs during image builds and attach them to container images:

```yaml
# .github/workflows/build-with-sbom.yaml
name: Build and Generate SBOM

on:
  push:
    branches: [main]

env:
  IMAGE_NAME: myapp
  REGISTRY: ghcr.io

jobs:
  build-and-sbom:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Build image
        run: |
          docker build -t $IMAGE_NAME:${{ github.sha }} .

      - name: Install Syft
        run: |
          curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

      - name: Generate SBOM
        run: |
          syft packages $IMAGE_NAME:${{ github.sha }} \
            -o cyclonedx-json \
            --file sbom-cyclonedx.json

          syft packages $IMAGE_NAME:${{ github.sha }} \
            -o spdx-json \
            --file sbom-spdx.json

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Attach SBOM to image
        run: |
          docker tag $IMAGE_NAME:${{ github.sha }} $REGISTRY/$IMAGE_NAME:${{ github.sha }}

          # Attach CycloneDX SBOM
          cosign attach sbom --sbom sbom-cyclonedx.json \
            $REGISTRY/$IMAGE_NAME:${{ github.sha }}

          # Also attach as attestation
          cosign attest --predicate sbom-cyclonedx.json \
            --type cyclonedx \
            $REGISTRY/$IMAGE_NAME:${{ github.sha }}

      - name: Push image
        run: |
          docker push $REGISTRY/$IMAGE_NAME:${{ github.sha }}

      - name: Upload SBOM artifacts
        uses: actions/upload-artifact@v3
        with:
          name: sboms
          path: |
            sbom-cyclonedx.json
            sbom-spdx.json
```

## Creating an Admission Webhook for SBOM Validation

Implement an admission webhook that requires all images to have attached SBOMs:

```python
# sbom-admission-webhook.py
#!/usr/bin/env python3

from flask import Flask, request, jsonify
import subprocess
import json

app = Flask(__name__)

def has_sbom(image):
    """Check if image has an attached SBOM"""
    try:
        # Try to download SBOM using cosign
        cmd = f"cosign download sbom {image}"
        result = subprocess.run(
            cmd.split(),
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0 and result.stdout:
            # Validate SBOM structure
            sbom = json.loads(result.stdout)
            return 'components' in sbom or 'packages' in sbom
        return False

    except Exception as e:
        print(f"Error checking SBOM: {e}")
        return False

@app.route('/validate', methods=['POST'])
def validate():
    admission_review = request.get_json()

    uid = admission_review['request']['uid']
    pod = admission_review['request']['object']

    # Check all container images
    allowed = True
    messages = []

    for container in pod['spec'].get('containers', []):
        image = container['image']

        # Skip images from exempted registries
        if any(registry in image for registry in ['k8s.gcr.io', 'docker.io/library']):
            continue

        if not has_sbom(image):
            allowed = False
            messages.append(f"Image {image} is missing required SBOM")

    response = {
        "apiVersion": "admission.k8s.io/v1",
        "kind": "AdmissionReview",
        "response": {
            "uid": uid,
            "allowed": allowed,
            "status": {
                "message": "; ".join(messages) if messages else "All images have valid SBOMs"
            }
        }
    }

    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8443)
```

Deploy the webhook:

```yaml
# sbom-webhook-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sbom-webhook
  namespace: security
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sbom-webhook
  template:
    metadata:
      labels:
        app: sbom-webhook
    spec:
      containers:
      - name: webhook
        image: sbom-webhook:latest
        ports:
        - containerPort: 8443

---
apiVersion: v1
kind: Service
metadata:
  name: sbom-webhook
  namespace: security
spec:
  selector:
    app: sbom-webhook
  ports:
  - port: 443
    targetPort: 8443

---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: sbom-validator
webhooks:
- name: validate-sbom.security.svc
  clientConfig:
    service:
      name: sbom-webhook
      namespace: security
      path: /validate
    caBundle: <base64-ca-cert>
  rules:
  - operations: ["CREATE"]
    apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
  admissionReviewVersions: ["v1"]
  sideEffects: None
  failurePolicy: Ignore  # Allow deployment if webhook fails
  namespaceSelector:
    matchLabels:
      sbom-required: "true"
```

## Analyzing SBOMs for Vulnerabilities

Use Grype to scan SBOMs for known vulnerabilities:

```bash
# scan-sboms-for-vulns.sh
#!/bin/bash

SBOM_DIR="/sboms/$(date +%Y-%m-%d)"
REPORT_DIR="/reports/$(date +%Y-%m-%d)"

mkdir -p "$REPORT_DIR"

echo "Scanning SBOMs for vulnerabilities..."

for SBOM_FILE in "$SBOM_DIR"/*.cyclonedx-json; do
  BASENAME=$(basename "$SBOM_FILE" .cyclonedx-json)

  echo "Scanning $BASENAME..."

  grype sbom:"$SBOM_FILE" \
    -o json \
    --file "$REPORT_DIR/${BASENAME}.vulns.json"

  # Extract critical and high vulnerabilities
  jq -r '.matches[] | select(.vulnerability.severity=="Critical" or .vulnerability.severity=="High") | "\(.vulnerability.id): \(.artifact.name)@\(.artifact.version)"' \
    "$REPORT_DIR/${BASENAME}.vulns.json" > "$REPORT_DIR/${BASENAME}.critical.txt"

  CRITICAL_COUNT=$(wc -l < "$REPORT_DIR/${BASENAME}.critical.txt")

  if [ "$CRITICAL_COUNT" -gt 0 ]; then
    echo "  ⚠ Found $CRITICAL_COUNT critical/high vulnerabilities"
  else
    echo "  ✓ No critical vulnerabilities found"
  fi
done

echo "Vulnerability scanning complete"
```

Deploy as a post-processing job:

```yaml
# sbom-vulnerability-scan-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sbom-vulnerability-scan
  namespace: security
spec:
  schedule: "30 2 * * *"  # Run after SBOM generation
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scanner
            image: anchore/grype:latest
            command: ["/bin/bash", "/scripts/scan-sboms-for-vulns.sh"]
            volumeMounts:
            - name: sbom-storage
              mountPath: /sboms
            - name: reports
              mountPath: /reports
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: sbom-storage
            persistentVolumeClaim:
              claimName: sbom-storage
          - name: reports
            persistentVolumeClaim:
              claimName: vulnerability-reports
          - name: scripts
            configMap:
              name: scan-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
```

## Creating SBOM Compliance Reports

Generate compliance reports showing SBOM coverage and vulnerability status:

```bash
# sbom-compliance-report.sh
#!/bin/bash

echo "SBOM Compliance Report - $(date)"
echo "================================"

SBOM_DIR="/sboms/$(date +%Y-%m-%d)"
TOTAL_IMAGES=$(kubectl get pods --all-namespaces -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u | wc -l)
SBOM_COUNT=$(find "$SBOM_DIR" -name "*.cyclonedx-json" | wc -l)

echo -e "\nCoverage:"
echo "  Total images: $TOTAL_IMAGES"
echo "  SBOMs generated: $SBOM_COUNT"
echo "  Coverage: $(awk "BEGIN {printf \"%.1f%%\", ($SBOM_COUNT/$TOTAL_IMAGES)*100}")"

echo -e "\nVulnerability Summary:"
find /reports/$(date +%Y-%m-%d) -name "*.critical.txt" -exec sh -c '
  CRITICAL=$(cat "$1" | wc -l)
  if [ $CRITICAL -gt 0 ]; then
    echo "  $(basename "$1" .critical.txt): $CRITICAL critical/high vulnerabilities"
  fi
' sh {} \;

echo -e "\nLicense Summary:"
for SBOM in "$SBOM_DIR"/*.cyclonedx-json; do
  echo "  $(basename "$SBOM"):"
  jq -r '.components[].licenses[]?.license.id' "$SBOM" | sort | uniq -c | head -5
done
```

Automated SBOM generation transforms software transparency from a manual audit task into a continuous compliance process. By generating SBOMs for every container image and integrating with admission controls, you ensure complete visibility into your software supply chain while enabling rapid vulnerability response and license compliance verification.
