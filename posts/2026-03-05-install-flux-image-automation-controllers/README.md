# How to Install Flux Image Automation Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Installation, Controller

Description: A step-by-step guide to installing the Flux Image Automation Controllers for automated container image updates in your Kubernetes cluster.

---

Flux CD provides a set of image automation controllers that enable automatic updates of container images in your Git repositories. These controllers scan container registries for new image tags, apply policies to select the right tag, and commit updates back to your Git repository. In this guide, you will learn how to install the Flux Image Automation Controllers from scratch.

## Prerequisites

Before you begin, make sure you have the following:

- A Kubernetes cluster supported by your Flux version (current Flux docs list v1.33, v1.34.1 or later, and v1.35 or later)
- kubectl configured to access your cluster
- Flux CLI installed on your local machine
- Cluster admin permissions to install or update Flux controllers

If you have not yet installed the Flux CLI, use the following command.

```bash
# Install the Flux CLI on macOS or Linux

curl -s https://fluxcd.io/install.sh | sudo bash
```

Verify the CLI is installed correctly.

```bash
# Check the Flux CLI version
flux --version
```

## Understanding the Image Automation Controllers

The Flux image automation stack consists of two controllers:

1. **Image Reflector Controller** -- Scans container registries and reflects the discovered image tags as Kubernetes resources (ImageRepository and ImagePolicy).
2. **Image Automation Controller** -- Watches ImagePolicy resources and updates YAML manifests in a Git repository when a new image is available (ImageUpdateAutomation).

Together, these controllers enable a fully automated image update pipeline within your GitOps workflow.

## Step 1: Bootstrap Flux with Image Automation Components

If you are bootstrapping Flux for the first time and want to include the image automation controllers, use the `--components-extra` flag.

```bash
# Bootstrap Flux with image automation controllers included
flux bootstrap github \
  --owner=your-github-username \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --personal \
  --read-write-key \
  --components-extra=image-reflector-controller,image-automation-controller
```

This command installs the core Flux controllers along with the image reflector and image automation controllers in the `flux-system` namespace.

## Step 2: Install Image Automation Controllers on an Existing Flux Installation

If Flux is already running in your cluster without the image automation controllers, you can add them by re-running the bootstrap command with the `--components-extra` flag.

```bash
# Add image automation controllers to an existing Flux installation
flux bootstrap github \
  --owner=your-github-username \
  --repository=your-fleet-repo \
  --branch=main \
  --path=clusters/my-cluster \
  --personal \
  --read-write-key \
  --components-extra=image-reflector-controller,image-automation-controller
```

Alternatively, you can install or upgrade Flux with the extra controllers using the Flux install command.

```bash
# Install Flux with the extra image automation components
flux install \
  --components-extra=image-reflector-controller,image-automation-controller
```

## Step 3: Verify the Installation

After installation, confirm that the image automation controllers are running.

```bash
# Check that all Flux pods are running, including image controllers
kubectl get pods -n flux-system
```

You should see pods for both `image-reflector-controller` and `image-automation-controller` in a Running state.

You can also verify using the Flux CLI.

```bash
# Run Flux checks to confirm the default and image automation controllers are healthy
flux check --components-extra=image-reflector-controller,image-automation-controller
```

The output should confirm that all controllers are installed and ready.

## Step 4: Verify CRDs Are Installed

The image automation controllers install several Custom Resource Definitions (CRDs). Verify they exist.

```bash
# List the image-related CRDs installed by Flux
kubectl get crds | grep image.toolkit.fluxcd.io
```

You should see the following CRDs:

- `imagerepositories.image.toolkit.fluxcd.io`
- `imagepolicies.image.toolkit.fluxcd.io`
- `imageupdateautomations.image.toolkit.fluxcd.io`

## Step 5: Install via Kustomize Manifests

If you prefer a declarative approach, you can add the image automation controllers to your Flux kustomization. Edit the `flux-system/kustomization.yaml` in your Git repository.

```yaml
# flux-system/kustomization.yaml
# Add image automation controller manifests to the kustomization
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
```

Then regenerate the `gotk-components.yaml` with the extra components.

```bash
# Generate the Flux components manifest including image automation
flux install \
  --components-extra=image-reflector-controller,image-automation-controller \
  --export > flux-system/gotk-components.yaml
```

Commit and push the updated manifests to your Git repository. Flux will reconcile and deploy the new controllers automatically.

```bash
# Commit and push the updated manifests
git add flux-system/
git commit -m "Add Flux image automation controllers"
git push origin main
```

## Step 6: Configure Git Credentials for Image Automation

The image automation controller needs permission to push commits to your Git repository. If you bootstrapped with an SSH deploy key, include `--read-write-key` as shown above. If you use HTTPS credentials instead, make sure the GitRepository referenced by your ImageUpdateAutomation has a Git credential secret configured.

```yaml
# Secret for Git repository authentication used by the image automation controller
apiVersion: v1
kind: Secret
metadata:
  name: flux-system
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <your-personal-access-token>
```

Apply the secret to your cluster.

```bash
# Apply the Git credentials secret
kubectl apply -f git-credentials.yaml
```

## Troubleshooting

If the controllers are not starting, check the logs for errors.

```bash
# View logs for the image reflector controller
kubectl logs -n flux-system deployment/image-reflector-controller

# View logs for the image automation controller
kubectl logs -n flux-system deployment/image-automation-controller
```

Common issues include insufficient RBAC permissions, missing CRDs, or network policies blocking access to container registries.

## Summary

You have successfully installed the Flux Image Automation Controllers. With the image reflector controller and image automation controller running, you can now create ImageRepository, ImagePolicy, and ImageUpdateAutomation resources to automate container image updates in your GitOps workflow. The next steps involve configuring image repositories to scan and policies to select the correct tags.
