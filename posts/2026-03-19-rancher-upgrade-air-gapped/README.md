# How to Upgrade Rancher in an Air-Gapped Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Upgrade, Air-Gapped

Description: Learn how to upgrade Rancher in an air-gapped or disconnected environment using a private registry and offline Helm charts.

Air-gapped environments have no internet access, which means you cannot pull container images or Helm charts from public registries. Upgrading Rancher in these environments requires downloading all necessary assets on an internet-connected machine, transferring them to the air-gapped network, and then performing the upgrade. This guide covers every step.

## Prerequisites

- An internet-connected workstation for downloading images and charts
- A private container registry accessible within the air-gapped network
- A method to transfer files to the air-gapped environment (USB drive, secure file transfer)
- Helm 3 and kubectl installed on both the workstation and the air-gapped machine
- `docker` or `skopeo` for image mirroring

## Step 1: Determine the Target Version

On your internet-connected workstation, check available Rancher versions:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
helm search repo rancher-stable/rancher --versions | head -10
```

Note the target version you want to upgrade to.

## Step 2: Download the Helm Chart

Fetch the Rancher Helm chart for offline use:

```bash
helm pull rancher-stable/rancher --version <TARGET_VERSION>
```

This creates a file like `rancher-<TARGET_VERSION>.tgz` in your current directory.

Also download the cert-manager chart for the version currently running on your cluster if you use Rancher-generated certificates:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm pull jetstack/cert-manager --version <CERT_MANAGER_VERSION>
```

## Step 3: Download the Container Images

Rancher provides a script and image list for air-gapped installations. Download them:

```bash
# Download the image list for the target version

wget https://github.com/rancher/rancher/releases/download/<TARGET_VERSION>/rancher-images.txt

# Download the save and load scripts
wget https://github.com/rancher/rancher/releases/download/<TARGET_VERSION>/rancher-save-images.sh
wget https://github.com/rancher/rancher/releases/download/<TARGET_VERSION>/rancher-load-images.sh

chmod +x rancher-save-images.sh rancher-load-images.sh

# If you use Rancher-generated certificates, append the cert-manager images
helm template cert-manager ./cert-manager-<CERT_MANAGER_VERSION>.tgz \
  | awk '$1 ~ /image:/ {print $2}' \
  | sed 's/\"//g' >> ./rancher-images.txt

sort -u rancher-images.txt -o rancher-images.txt
```

### Save Images to a Tar Archive

```bash
./rancher-save-images.sh --image-list ./rancher-images.txt
```

This pulls all images and saves them into `rancher-images.tar.gz`. This process can take a while and requires significant disk space.

### Alternative: Use skopeo for Selective Mirroring

If your private registry already contains the unchanged images from the currently running Rancher version, you can mirror only the new images:

```bash
# Compare old and new image lists to find differences
comm -13 <(sort rancher-images-old.txt) <(sort rancher-images.txt) > new-images.txt

# Mirror only new images
while IFS= read -r image; do
  skopeo copy --all "docker://$image" "docker://registry.internal.company/$image"
done < new-images.txt
```

## Step 4: Transfer Files to the Air-Gapped Environment

Transfer the following files to a machine inside the air-gapped network:

- `rancher-<TARGET_VERSION>.tgz` (Helm chart)
- `rancher-images.txt` (image list)
- `rancher-images.tar.gz` (container images)
- `rancher-load-images.sh` (image loading script)
- `cert-manager-<CERT_MANAGER_VERSION>.tgz` (only if you also plan to upgrade cert-manager separately)

Use your approved transfer method (USB drive, secure file transfer, etc.).

## Step 5: Load Images into the Private Registry

On a machine inside the air-gapped network that can access the private registry:

```bash
./rancher-load-images.sh \
  --image-list ./rancher-images.txt \
  --images ./rancher-images.tar.gz \
  --registry registry.internal.company
```

Verify that key images are available:

```bash
# Check the Rancher image
docker pull registry.internal.company/rancher/rancher:<TARGET_VERSION>
```

## Step 6: Back Up Before Upgrading

Take an etcd snapshot of the management cluster:

```bash
# For RKE2
rke2 etcd-snapshot save --name pre-airgap-upgrade
```

Export current Helm values:

```bash
helm get values rancher -n cattle-system -o yaml > current-values.yaml
```

## Step 7: Perform the Upgrade

Update your Helm values to reference the private registry. Edit `current-values.yaml`:

```yaml
hostname: rancher.internal.company
replicas: 3
image:
  registry: registry.internal.company
systemDefaultRegistry: registry.internal.company
useBundledSystemChart: true
certmanager:
  version: <CERT_MANAGER_VERSION> # If you use Rancher-generated certificates
```

Run the upgrade using the local chart file:

```bash
helm upgrade rancher ./rancher-<TARGET_VERSION>.tgz \
  --namespace cattle-system \
  --values current-values.yaml
```

## Step 8: Monitor the Upgrade

Watch the rollout:

```bash
kubectl rollout status deployment rancher -n cattle-system
kubectl get pods -n cattle-system
```

Check pod logs if any pods are not starting:

```bash
kubectl logs -l app=rancher -n cattle-system --tail=50
```

Common issues in air-gapped environments include image pull errors. If a pod is stuck in `ImagePullBackOff`, check:

```bash
kubectl describe pod <pod-name> -n cattle-system
```

Ensure the image exists in your private registry and that image pull secrets are configured.

## Step 9: Verify the System Default Registry Setting

After upgrading, verify that the `system-default-registry` setting points to your private registry:

```bash
kubectl get settings.management.cattle.io system-default-registry -o jsonpath='{.value}'
```

If the system default registry is not set correctly:

```bash
kubectl patch settings.management.cattle.io system-default-registry --type=merge -p '{"value":"registry.internal.company"}'
```

## Step 10: Verify the Upgrade

Confirm the new version:

```bash
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'
```

Check that all managed clusters are healthy:

```bash
kubectl get clusters.management.cattle.io
```

Log in to the Rancher UI and verify all features are working.

## Step 11: Update Downstream Cluster Agents

Downstream cluster agents also need images from the private registry. Verify that agents can pull the updated images:

```bash
# On a downstream cluster
kubectl get pods -n cattle-system
kubectl describe pod cattle-cluster-agent-<id> -n cattle-system
```

If agents fail to update, check the image pull secrets and registry configuration on the downstream clusters.

## Troubleshooting Air-Gapped Upgrades

- **Missing images**: Compare the running image list with your registry contents. Use `kubectl get pods -n cattle-system -o jsonpath='{.items[*].spec.containers[*].image}'` to see what images are needed.
- **Registry authentication**: Ensure image pull secrets exist in the `cattle-system` namespace.
- **Chart version mismatch**: The Helm chart version must match the images you loaded.
- **Webhook issues**: The Rancher webhook may reference images not in your registry. Check the webhook deployment.

## Conclusion

Upgrading Rancher in an air-gapped environment requires more preparation than a connected upgrade, but the process is reliable when you follow the steps: download the chart and images, transfer them to the air-gapped network, load images into your private registry, and run the Helm upgrade. Always back up before upgrading and verify that all images are available in your private registry before starting.
