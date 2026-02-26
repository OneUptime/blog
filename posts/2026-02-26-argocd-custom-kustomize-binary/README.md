# How to Use Custom Kustomize Binary with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize

Description: Learn how to configure ArgoCD to use a custom Kustomize binary version, including custom images, init containers, version pinning, and managing multiple Kustomize versions side by side.

---

ArgoCD bundles a specific Kustomize version in its repo server. Sometimes that version is too old for features you need, or too new and introduces breaking changes. Running a custom Kustomize binary gives you full control over which version renders your manifests. This is especially important for organizations that standardize on a specific toolchain version.

This guide covers three approaches to running a custom Kustomize binary in ArgoCD, configuring per-application version selection, and managing the upgrade lifecycle.

## Why Use a Custom Binary

Reasons to replace the bundled Kustomize include:

- You need a feature only available in a newer version (replacements, components, helmCharts)
- You need to pin an older version because a newer one introduced breaking changes
- Your organization requires specific binary versions for compliance
- You use Kustomize plugins that need a particular version

## Approach 1: Custom Repo Server Image

The most straightforward method is building a custom ArgoCD repo server image:

```dockerfile
# Dockerfile.repo-server
FROM quay.io/argoproj/argocd:v2.9.3

USER root

# Install the specific Kustomize version you need
ARG KUSTOMIZE_VERSION=5.4.1

RUN curl -sL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv${KUSTOMIZE_VERSION}/kustomize_v${KUSTOMIZE_VERSION}_linux_amd64.tar.gz" | \
    tar xz -C /usr/local/bin/ && \
    chmod +x /usr/local/bin/kustomize

# Verify the installation
RUN kustomize version

USER argocd
```

Build and deploy:

```bash
# Build the image with your desired version
docker build -t myorg/argocd-repo-server:v2.9.3-kustomize-5.4.1 \
  --build-arg KUSTOMIZE_VERSION=5.4.1 \
  -f Dockerfile.repo-server .

# Push to your registry
docker push myorg/argocd-repo-server:v2.9.3-kustomize-5.4.1
```

Update the ArgoCD repo server deployment:

```yaml
# kustomize patch or Helm values to override the image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: repo-server
          image: myorg/argocd-repo-server:v2.9.3-kustomize-5.4.1
```

## Approach 2: Init Container with Volume Mount

If you do not want to maintain a custom image, use an init container to download the binary at startup:

```yaml
# Patch for argocd-repo-server deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      initContainers:
        - name: install-kustomize
          image: alpine:3.19
          command:
            - sh
            - -c
            - |
              KUSTOMIZE_VERSION="5.4.1"
              echo "Installing Kustomize v${KUSTOMIZE_VERSION}..."
              wget -qO- "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv${KUSTOMIZE_VERSION}/kustomize_v${KUSTOMIZE_VERSION}_linux_amd64.tar.gz" | \
                tar xz -C /custom-tools/
              chmod +x /custom-tools/kustomize
              /custom-tools/kustomize version
          volumeMounts:
            - name: custom-tools
              mountPath: /custom-tools
      containers:
        - name: repo-server
          volumeMounts:
            - name: custom-tools
              mountPath: /usr/local/bin/kustomize
              subPath: kustomize
      volumes:
        - name: custom-tools
          emptyDir: {}
```

## Approach 3: Multiple Versions Side by Side

For teams that need different Kustomize versions for different applications, install multiple binaries:

```dockerfile
# Dockerfile.repo-server-multi
FROM quay.io/argoproj/argocd:v2.9.3

USER root

# Install multiple Kustomize versions
RUN curl -sL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz" | \
    tar xz -C /tmp/ && mv /tmp/kustomize /usr/local/bin/kustomize-5.3.0

RUN curl -sL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.4.1/kustomize_v5.4.1_linux_amd64.tar.gz" | \
    tar xz -C /tmp/ && mv /tmp/kustomize /usr/local/bin/kustomize-5.4.1

# Set the default
RUN ln -sf /usr/local/bin/kustomize-5.4.1 /usr/local/bin/kustomize

USER argocd
```

Register the versions in ArgoCD's ConfigMap:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Register custom Kustomize binary paths
  kustomize.path.v5.3.0: /usr/local/bin/kustomize-5.3.0
  kustomize.path.v5.4.1: /usr/local/bin/kustomize-5.4.1
```

## Per-Application Version Selection

Once multiple versions are registered, specify the version in each Application:

```yaml
# Application using Kustomize 5.3.0
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: legacy-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/k8s-configs.git
    path: apps/legacy-app/overlays/production
    kustomize:
      version: v5.3.0
  destination:
    server: https://kubernetes.default.svc
    namespace: production

---
# Application using Kustomize 5.4.1
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: new-app
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/k8s-configs.git
    path: apps/new-app/overlays/production
    kustomize:
      version: v5.4.1
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Configuring Build Options

Set global build options that apply to all Kustomize applications:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Build options applied to all Kustomize builds
  kustomize.buildOptions: "--enable-helm --load-restrictor LoadRestrictionsNone"

  # Version-specific build options
  kustomize.buildOptions.v5.4.1: "--enable-helm --enable-alpha-plugins"
```

## Installing Kustomize Plugins

If your Kustomize configuration uses plugins (exec or Go plugins), install them alongside the custom binary:

```dockerfile
FROM quay.io/argoproj/argocd:v2.9.3

USER root

# Install Kustomize
RUN curl -sL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.4.1/kustomize_v5.4.1_linux_amd64.tar.gz" | \
    tar xz -C /usr/local/bin/

# Install SopsSecretGenerator plugin
RUN curl -sL "https://github.com/goabout/kustomize-sopssecretgenerator/releases/download/v1.6.0/SopsSecretGenerator_1.6.0_linux_amd64.tar.gz" | \
    tar xz -C /tmp/ && \
    mkdir -p /home/argocd/.config/kustomize/plugin/goabout.com/v1beta1/sopssecretgenerator/ && \
    mv /tmp/SopsSecretGenerator /home/argocd/.config/kustomize/plugin/goabout.com/v1beta1/sopssecretgenerator/

USER argocd
```

Enable alpha plugins in the build options:

```yaml
kustomize.buildOptions: "--enable-alpha-plugins --enable-exec"
```

## Verifying the Custom Binary

After deployment, verify ArgoCD is using the correct version:

```bash
# Check the Kustomize version in the repo server
kubectl exec -n argocd deploy/argocd-repo-server -- kustomize version

# Check all installed versions
kubectl exec -n argocd deploy/argocd-repo-server -- ls -la /usr/local/bin/kustomize*

# Test a build directly in the repo server
kubectl exec -n argocd deploy/argocd-repo-server -- \
  kustomize build /tmp/test-app/overlays/production
```

## Upgrade Strategy

When upgrading ArgoCD, your custom Kustomize binary is preserved if it is in a volume mount or custom image. However, test the new ArgoCD version against your Kustomize configuration before upgrading:

1. Build a new custom image with the updated ArgoCD base and your Kustomize version
2. Deploy to a staging ArgoCD instance
3. Sync a few applications and check for rendering differences
4. Roll out to production ArgoCD

```bash
# Compare rendering output between versions
OLD_OUTPUT=$(argocd app manifests my-app --source git)
# After upgrade
NEW_OUTPUT=$(argocd app manifests my-app --source git)
diff <(echo "$OLD_OUTPUT") <(echo "$NEW_OUTPUT")
```

For more on Kustomize version differences, see our guide on [handling Kustomize version differences in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-kustomize-version-differences/view).
