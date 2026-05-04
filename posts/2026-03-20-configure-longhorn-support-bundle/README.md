# How to Configure Longhorn Support Bundle Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Support Bundle, Diagnostic, Troubleshooting

Description: Learn how to generate and configure Longhorn Support Bundles to collect comprehensive diagnostics for troubleshooting and reporting issues.

## Introduction

The Longhorn Support Bundle is a comprehensive collection of diagnostic information that helps identify and resolve complex issues. It includes cluster configuration, Longhorn settings, pod logs, volume states, node information, and more. This guide explains how to generate, configure, and use the Support Bundle Manager effectively.

## What the Support Bundle Contains

A Longhorn support bundle typically includes:
- Kubernetes cluster information and version
- All Longhorn custom resources (volumes, replicas, nodes, settings)
- Pod logs from all Longhorn components
- Node disk information
- Backup and snapshot status
- Event history
- Networking information

## Generating a Support Bundle via UI

The simplest way to generate a support bundle:

1. Open the Longhorn UI
2. Navigate to **Setting** → **Support Bundle**
3. Enter a description of the issue you are experiencing
4. Click **Generate Support Bundle**
5. Wait for the bundle to be created (progress indicator shows status)
6. Download the generated ZIP file

## Generating a Support Bundle via kubectl

```yaml
# supportbundle.yaml - Generate a Longhorn support bundle via CRD

apiVersion: longhorn.io/v1beta2
kind: SupportBundle
metadata:
  name: issue-investigation-20260320
  namespace: longhorn-system
spec:
  # A brief description of the issue (required)
  description: "Volume attachment failures on node worker-node-1 after upgrade"
  # Optional issue URL (e.g., a GitHub issue link)
  issueURL: ""
  # Optional preferred responsible controller node ID (leave empty to let Longhorn choose)
  nodeID: ""
```

```bash
kubectl apply -f supportbundle.yaml

# Check the support bundle status
kubectl get supportbundles.longhorn.io -n longhorn-system

# Watch progress
kubectl get supportbundle.longhorn.io issue-investigation-20260320 \
  -n longhorn-system -w
```

## Downloading the Support Bundle

```bash
# Get the download URL once the bundle is ready
kubectl get supportbundle.longhorn.io issue-investigation-20260320 \
  -n longhorn-system -o yaml | grep downloadURL

# Port-forward the Longhorn frontend
kubectl port-forward -n longhorn-system svc/longhorn-frontend 8080:80

# Download via the URL shown in the UI or the downloadURL from above.
# The endpoint format is /v1/supportbundles/${ID}/${BUNDLE_NAME}/download
curl -o longhorn-support-bundle.zip \
  "http://localhost:8080/v1/supportbundles/${BUNDLE_ID}/${BUNDLE_NAME}/download"
```

## Configuring Support Bundle Settings

### Setting the Support Bundle Manager Image

```bash
# Check the current support bundle manager image
kubectl get settings.longhorn.io support-bundle-manager-image \
  -n longhorn-system -o yaml

# Update the support bundle manager image
kubectl patch settings.longhorn.io support-bundle-manager-image \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhornio/support-bundle-kit:v0.0.37"}'
```

### Configure Failed Bundle Auto Cleanup

```bash
# Set how many failed support bundles to retain in the cluster
# (set to 0 to have Longhorn automatically purge all failed bundles)
kubectl patch settings.longhorn.io support-bundle-failed-history-limit \
  -n longhorn-system \
  --type merge \
  -p '{"value": "1"}'

# Set the timeout for collecting node bundles (in minutes; default is 30)
kubectl patch settings.longhorn.io support-bundle-node-collection-timeout \
  -n longhorn-system \
  --type merge \
  -p '{"value": "60"}'  # 60 minutes
```

## Automating Diagnostic Collection

For proactive monitoring, create a script to regularly collect diagnostics:

```bash
#!/bin/bash
# collect-longhorn-diagnostics.sh - Collect key Longhorn diagnostics

DATE=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="/tmp/longhorn-diagnostics-$DATE"
mkdir -p "$OUTPUT_DIR"

echo "Collecting Longhorn diagnostics..."

# Collect Longhorn resource status
kubectl get all -n longhorn-system > "$OUTPUT_DIR/longhorn-resources.txt"
kubectl get volumes.longhorn.io -n longhorn-system > "$OUTPUT_DIR/volumes.txt"
kubectl get replicas.longhorn.io -n longhorn-system > "$OUTPUT_DIR/replicas.txt"
kubectl get nodes.longhorn.io -n longhorn-system > "$OUTPUT_DIR/nodes.txt"
kubectl get settings.longhorn.io -n longhorn-system > "$OUTPUT_DIR/settings.txt"
kubectl get backupvolumes.longhorn.io -n longhorn-system > "$OUTPUT_DIR/backup-volumes.txt"

# Collect events
kubectl get events -n longhorn-system --sort-by='.lastTimestamp' > "$OUTPUT_DIR/events.txt"

# Collect pod logs (last 200 lines each)
for pod in $(kubectl get pods -n longhorn-system -o name); do
  pod_name=$(echo $pod | cut -d/ -f2)
  kubectl logs -n longhorn-system "$pod_name" --tail=200 \
    > "$OUTPUT_DIR/log-${pod_name}.txt" 2>&1
done

# Package everything
tar -czf "longhorn-diagnostics-$DATE.tar.gz" -C /tmp "longhorn-diagnostics-$DATE"
echo "Diagnostics saved to: longhorn-diagnostics-$DATE.tar.gz"
```

```bash
chmod +x collect-longhorn-diagnostics.sh
./collect-longhorn-diagnostics.sh
```

## Analyzing the Support Bundle

After downloading, extract and review key files:

```bash
# Extract the support bundle
unzip longhorn-support-bundle.zip -d support-bundle/

# Navigate the structure
ls support-bundle/

# Review Longhorn-specific information
ls support-bundle/longhorn/

# Check for error patterns in logs
grep -r "ERROR\|FATAL\|panic" support-bundle/logs/ | head -50

# Check volume states
cat support-bundle/longhorn/volumes/*.yaml | grep -E "robustness|state"
```

## Providing Bundle to Longhorn Support

When opening a GitHub issue or seeking support:

1. Generate the support bundle as described above
2. Redact sensitive information if needed (credentials, IP addresses in non-public filings)
3. Attach the bundle to the GitHub issue at: https://github.com/longhorn/longhorn/issues
4. Include:
   - Longhorn version
   - Kubernetes version
   - Clear description of the issue
   - Steps to reproduce
   - The support bundle

## Listing and Cleaning Up Old Bundles

```bash
# List all support bundles
kubectl get supportbundles.longhorn.io -n longhorn-system

# Delete a specific bundle after downloading
kubectl delete supportbundle.longhorn.io issue-investigation-20260320 \
  -n longhorn-system

# Clean up all support bundles
kubectl delete supportbundles.longhorn.io --all -n longhorn-system
```

## Conclusion

The Longhorn Support Bundle Manager is an invaluable tool for diagnosing complex storage issues. By generating comprehensive bundles that capture the full state of your Longhorn environment, you can significantly accelerate troubleshooting both on your own and when seeking help from the Longhorn community. Regular diagnostic collection, even without issues, provides a baseline for comparison when problems do occur. Always generate a support bundle as the first step in any serious Longhorn troubleshooting investigation.
