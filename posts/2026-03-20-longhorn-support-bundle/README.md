# How to Configure Longhorn Support Bundle Manager - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Support Bundle, Troubleshooting, Kubernetes, Diagnostic, SUSE Rancher

Description: Learn how to use Longhorn's support bundle feature to collect comprehensive diagnostic information including logs, configurations, and volume status for troubleshooting and support escalations.

---

Longhorn's support bundle feature collects Longhorn-related configuration and logs - pod logs, settings, volume status, node conditions, and Kubernetes events - into a single archive. This makes it easy to share relevant information with the Longhorn team or your support provider. Most Longhorn logs are included, but `dmesg` still needs to be retrieved from each node separately.

---

## What the Support Bundle Collects

- Longhorn manager, driver, and engine pod logs
- Kubernetes events in the `longhorn-system` namespace
- All Longhorn CRD objects (volumes, replicas, nodes, settings)
- Node and disk status
- Longhorn version information
- Cluster node information

---

## Step 1: Generate a Support Bundle via the UI

The simplest way is through the Longhorn UI:

1. Open the Longhorn UI
2. At the bottom of the Longhorn UI, click **Generate Support Bundle**
3. Enter a description (e.g., "Volume XXX stuck in attaching state")
4. Click **Generate**
5. Download the generated zip archive

---

## Step 2: Generate a Support Bundle via kubectl

```yaml
# Create a SupportBundle resource

apiVersion: longhorn.io/v1beta2
kind: SupportBundle
metadata:
  name: support-bundle-2026-03-20
  namespace: longhorn-system
spec:
  description: "Volume pvc-xxxxx stuck in attaching state"
  issueURL: ""
```

```bash
kubectl apply -f support-bundle.yaml

# Watch the bundle generation progress
kubectl get supportbundle support-bundle-2026-03-20 -n longhorn-system -w

# When status shows "ReadyForDownload", get the owner node ID
kubectl get supportbundle support-bundle-2026-03-20 \
  -n longhorn-system \
  -o jsonpath='{.status.ownerID}'
```

---

## Step 3: Download the Support Bundle

```bash
# Port-forward the Longhorn backend API
kubectl port-forward -n longhorn-system svc/longhorn-backend 9500:9500

# Download the bundle
BUNDLE_NAME="support-bundle-2026-03-20"
NODE_ID=$(kubectl get supportbundle "${BUNDLE_NAME}" \
  -n longhorn-system \
  -o jsonpath='{.status.ownerID}')

curl -o support-bundle.zip \
  "http://localhost:9500/v1/supportbundles/${NODE_ID}/${BUNDLE_NAME}/download"
```

---

## Step 4: Inspect the Support Bundle

```bash
# Extract the bundle
unzip support-bundle.zip -d support-bundle/

# View the directory structure
ls support-bundle/bundle/

# Check manager logs for errors
grep -iE "error|fatal|panic" \
  support-bundle/bundle/logs/longhorn-system/longhorn-manager-*/longhorn-manager-*.log

# Check the captured Longhorn volume CRs
grep -n "name: pvc-xxxxx" -A 20 \
  support-bundle/bundle/yamls/namespaced/longhorn-system/longhorn.io/v1beta2/volumes.yaml
```

---

## Step 5: Clean Up Old Support Bundles

```bash
# Delete the SupportBundle resource if it still exists
kubectl delete supportbundle support-bundle-2026-03-20 \
  -n longhorn-system \
  --ignore-not-found

# A successful download through the Longhorn API already removes the SupportBundle resource
```

---

## Best Practices

- Generate a support bundle **immediately** when you notice an issue - logs are rotated and historical data may be lost if you wait.
- Include a clear description of the issue in the bundle so support engineers understand the context.
- Share the bundle via a private channel - it contains cluster topology and configuration information.
- Run support bundle generation before performing risky operations (upgrades, node removals) as a baseline snapshot.
