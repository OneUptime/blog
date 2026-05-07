# How to Install Rancher UI Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, UI Extensions, Plugin, Dashboard

Description: Learn how to install, manage, and troubleshoot Rancher UI extensions to add new features and integrations to your Rancher dashboard.

Rancher UI Extensions allow you to add new pages, resource views, and integrations to the Rancher dashboard. This guide covers how to enable the extensions feature, install extensions from official and third-party repositories, and manage their lifecycle.

## Prerequisites

- Rancher v2.7.0 or later
- Admin privileges in Rancher
- A Rancher instance with internet access (or a private registry for air-gapped environments)

## Enabling the Extensions Feature

Extensions may need to be enabled on your Rancher instance before you can install them.

### Step 1: Enable Extensions in the UI

1. Log into Rancher as an administrator
2. Navigate to the main menu and look for **Extensions** in the sidebar
3. If you see a prompt to enable extensions, click **Enable**
4. Rancher will install the `ui-plugin-operator` in the `cattle-ui-plugin-system` namespace
5. On non-air-gapped installations, leave the option to add the official Rancher extensions repository enabled

### Step 2: Verify the Operator is Running

```bash
kubectl get pods -n cattle-ui-plugin-system
```

You should see the `ui-plugin-operator` pod running:

```plaintext
NAME                                   READY   STATUS    RESTARTS   AGE
ui-plugin-operator-xxxxxxxxx-xxxxx     1/1     Running   0          2m
```

### Step 3: Enable via Helm (Alternative)

If you prefer to enable extensions via Helm, install the operator charts from the Rancher charts repository and choose versions that match your Rancher release:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install ui-plugin-operator-crd rancher-charts/ui-plugin-operator-crd \
  --namespace cattle-ui-plugin-system \
  --create-namespace \
  --version <compatible-version>

helm install ui-plugin-operator rancher-charts/ui-plugin-operator \
  --namespace cattle-ui-plugin-system \
  --version <compatible-version>
```

## Installing Extensions from the Built-In Repository

### Step 1: Browse Available Extensions

1. Click **Extensions** in the Rancher sidebar
2. Switch to the **Available** tab
3. Browse the list of available extensions

### Step 2: Install an Extension

1. Find the extension you want to install
2. Click the **Install** button
3. Select the version you want to install
4. Click **Install** to confirm

The extension is downloaded and loaded into the Rancher UI. Click the **Reload page** button after the installation completes so the new UI components are loaded.

### Step 3: Verify Installation

After installation, the extension appears in the **Installed** tab. Navigate to the new menu items or features it adds.

## Adding Third-Party Extension Repositories

### Step 1: Add a Repository via the UI

1. Go to **Extensions** in the sidebar
2. Click the kebab menu (three dots) in the top right
3. Select **Manage Repositories**
4. Click **Create**
5. Fill in the repository details:
   - **Name**: A unique identifier (e.g., `my-company-extensions`)
   - **Target**: Choose **Git repository**, **http(s) URL**, or **OCI Repository**
   - For Git-backed catalogs, provide **Git Repo URL** and optionally **Git Branch**
   - For Helm repositories, provide **Index URL**
   - For OCI registries, provide **OCI Repository Host URL**
6. Click **Create**

### Step 2: Add a Repository via kubectl

```yaml
# extension-repo.yaml

apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: my-company-extensions
spec:
  gitRepo: https://github.com/example/ui-plugin-charts
  gitBranch: main
```

```bash
kubectl apply -f extension-repo.yaml
```

### Step 3: Add an OCI-Based Repository

For OCI container registries:

```yaml
apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: oci-extensions
spec:
  url: oci://registry.example.com/charts
```

### Step 4: Install from the New Repository

After adding the repository, return to the **Extensions** page. Your new extensions should appear in the **Available** tab after the repository syncs (this may take a few minutes).

## Installing Extensions via the API

Rancher's API can list configured repositories and installed `UIPlugin` resources, but extension installation itself is typically done by installing the extension chart or by creating a `UIPlugin` resource.

### List Configured Extension Repositories

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="token-xxxxx:yyyyyyyyyyyyyyyy"

curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v1/catalog.cattle.io.clusterrepos" | jq '.data[] | {
    name: .metadata.name,
    source: (.spec.url // .spec.gitRepo),
    branch: .spec.gitBranch
  }'
```

### Install an Extension via Helm

```bash
# Install the extension chart from an OCI registry
helm install my-extension oci://registry.example.com/charts/my-extension \
  --namespace cattle-ui-plugin-system \
  --version 1.0.0
```

### Install Using the UIPlugin Custom Resource

The `endpoint` and `compressedEndpoint` values must point to the extension's built assets, not to the Helm repository itself.

```yaml
# ui-plugin.yaml
apiVersion: catalog.cattle.io/v1
kind: UIPlugin
metadata:
  name: my-extension
  namespace: cattle-ui-plugin-system
spec:
  plugin:
    name: my-extension
    version: 1.0.0
    endpoint: https://downloads.example.com/my-extension/1.0.0
    compressedEndpoint: https://downloads.example.com/my-extension/1.0.0.tgz
    noCache: false
```

```bash
kubectl apply -f ui-plugin.yaml
```

## Managing Installed Extensions

### Viewing Installed Extensions

Via the UI:

1. Go to **Extensions** in the sidebar
2. Check the **Installed** tab

Via kubectl:

```bash
kubectl get uiplugins -n cattle-ui-plugin-system
```

Via the API:

```bash
curl -s -k \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  "${RANCHER_URL}/v1/catalog.cattle.io.uiplugins" | jq '.data[] | {
    name: .metadata.name,
    version: .spec.plugin.version,
    state: .status.cacheState
  }'
```

### Upgrading Extensions

#### Via the UI

1. Go to **Extensions > Updates**
2. Click **Update** for the extension you want to upgrade
3. Select the new version if Rancher prompts you to do so
4. Confirm the upgrade

#### Via Helm

```bash
helm upgrade my-extension oci://registry.example.com/charts/my-extension \
  --namespace cattle-ui-plugin-system \
  --version 2.0.0
```

### Disabling Extensions

Rancher does not provide a per-extension disable toggle that keeps an extension installed. To disable extension support for all extensions:

1. Go to **Extensions**
2. Click the kebab menu (three dots) in the top right
3. Select **Disable Extension Support**
4. Confirm the removal of the extension support components
5. Reload the page

### Uninstalling Extensions

#### Via the UI

1. Go to **Extensions > Installed**
2. Click **Uninstall** on the extension you want to remove
3. Confirm the removal

#### Via Helm

```bash
helm uninstall my-extension -n cattle-ui-plugin-system
```

#### Via kubectl

If you created the `UIPlugin` resource manually:

```bash
kubectl delete uiplugin my-extension -n cattle-ui-plugin-system
```

## Air-Gapped Installation

For environments without internet access, you need to mirror or publish an Extension Catalog Image and then import it into Rancher.

### Step 1: Mirror the Catalog Image

On a machine with internet access:

```bash
export REGISTRY_ENDPOINT="internal-registry.example.com"

docker pull rancher/ui-plugin-catalog:<tag>
docker tag rancher/ui-plugin-catalog:<tag> \
  ${REGISTRY_ENDPOINT}/rancher/ui-plugin-catalog:<tag>
docker push ${REGISTRY_ENDPOINT}/rancher/ui-plugin-catalog:<tag>
```

### Step 2: Import the Catalog Image

1. Create any required image pull secrets in the `cattle-ui-plugin-system` namespace
2. Go to **Extensions**
3. Click the kebab menu (three dots) in the top right
4. Select **Manage Extension Catalogs**
5. Click **Import Extension Catalog**
6. Enter the catalog image reference, for example `internal-registry.example.com/rancher/ui-plugin-catalog:<tag>`
7. Select any pull secrets required by the registry
8. Click **Load**

### Step 3: Install from the Imported Catalog

Return to the **Available** tab, reload the list if needed, and install the extension normally.

## Troubleshooting

### Extension Not Appearing After Installation

1. Check the UIPlugin resource status:

```bash
kubectl describe uiplugin my-extension -n cattle-ui-plugin-system
```

2. Check the operator logs:

```bash
kubectl logs -n cattle-ui-plugin-system deployment/ui-plugin-operator --tail=50
```

3. Clear your browser cache and reload the Rancher UI.

### Extension Loading Errors

Check the browser console (F12) for JavaScript errors. Common causes:
- Version incompatibility between the extension and Rancher
- Missing dependencies
- CORS issues with external resources

### Repository Sync Failures

```bash
# Check repository status
kubectl get clusterrepos -o jsonpath='{.items[*].status.conditions}'

# Force a repository refresh
kubectl patch clusterrepo my-repo --type merge \
  -p "{\"spec\":{\"forceUpdate\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}}"
```

### Permissions Issues

Ensure the user has the correct permissions:

```bash
# Check if the user can manage UI plugins
kubectl auth can-i create uiplugins --namespace cattle-ui-plugin-system --as=user-xxxxx
```

## Summary

Installing Rancher UI extensions involves enabling the extension operator, adding extension repositories, and installing compatible extension versions through the UI, Helm, or a `UIPlugin` resource. For air-gapped environments, mirror or publish an Extension Catalog Image and import it into Rancher before installing from the **Available** tab. Keep extensions updated for compatibility with your Rancher release, and use the `UIPlugin` custom resource for declarative management when you need direct control over plugin endpoints.
