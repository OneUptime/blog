# How to Handle Git Large File Support (LFS) in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Git LFS

Description: Learn how to configure ArgoCD to work with Git LFS repositories, handle large binary files in your GitOps workflow, and troubleshoot common LFS-related sync failures.

---

Git Large File Support (LFS) replaces large binary files in your repository with lightweight pointer files while storing the actual file content on a separate server. This is common in repositories that contain machine learning models, compiled binaries, container images, or large configuration files. When ArgoCD tries to fetch manifests from a repository that uses Git LFS, it needs special handling to resolve those pointer files into actual content.

Without proper LFS configuration, ArgoCD sees the pointer files instead of the actual manifests, which causes template rendering failures and broken deployments.

## How Git LFS Works

Git LFS intercepts Git operations and replaces large files with pointer files:

```mermaid
flowchart LR
    A[Git Repository] --> B{Is file tracked by LFS?}
    B -->|Yes| C[Pointer File in Git]
    C --> D[Actual File on LFS Server]
    B -->|No| E[Normal Git File]
```

A pointer file looks like this:

```text
version https://git-lfs.github.com/spec/v1
oid sha256:4d7a214614ab2935c943f9e0ff69d22eadbb8f32b1258daaa5e2ca24d17e2393
size 12345
```

When Git LFS is properly configured, the `git checkout` and `git pull` commands automatically replace pointer files with their actual content. The problem with ArgoCD is that its repo server needs to be configured to perform this LFS resolution.

## Enabling Git LFS in ArgoCD

ArgoCD supports Git LFS through the `--enable-git-lfs` flag on the repo server. Enable it by modifying the repo server deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        command:
        - argocd-repo-server
        - --enable-git-lfs
```

If you installed ArgoCD with Helm, enable LFS in your values file:

```yaml
# values.yaml
repoServer:
  extraArgs:
    - --enable-git-lfs
```

Apply the change:

```bash
helm upgrade argocd argo/argo-cd \
  -n argocd \
  -f values.yaml
```

## Configuring LFS Credentials

Git LFS uses a separate authentication mechanism from Git itself. When your LFS files are stored on the same Git hosting service (GitHub, GitLab), the same credentials typically work. But you need to ensure the credentials are available to the LFS client.

For HTTPS repositories, the credentials stored in ArgoCD's repository secrets are automatically passed to the LFS client. No additional configuration is needed.

For SSH repositories, LFS still uses HTTPS for file transfers. You might need to configure additional credentials:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-repo-server-gitconfig
  namespace: argocd
data:
  gitconfig: |
    [lfs]
      # Configure LFS to use the same authentication as Git
      locksverify = false

    [lfs "https://github.com/myorg/myrepo.git/info/lfs"]
      access = basic
```

## Handling LFS with Private Repositories

When using Git LFS with private repositories, you need to ensure that the LFS API endpoint can be reached and authenticated:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: git
  url: https://github.com/myorg/myrepo.git
  username: x-access-token
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The same credentials are used for both Git operations and LFS operations when the LFS server is on the same host. If your LFS objects are hosted on a different server (like a custom LFS server), configure the LFS URL in your gitconfig:

```yaml
data:
  gitconfig: |
    [lfs]
      url = https://lfs.internal.example.com/myorg/myrepo
```

## Storage Considerations for LFS

When LFS is enabled, the repo server downloads actual file content instead of pointer files. This increases disk and memory usage. Plan your repo server resources accordingly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-repo-server
        command:
        - argocd-repo-server
        - --enable-git-lfs
        resources:
          requests:
            memory: 512Mi
            cpu: 250m
          limits:
            memory: 2Gi
            cpu: 1000m
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      # Use a larger volume for LFS file storage
      - name: tmp
        emptyDir:
          sizeLimit: 20Gi
```

For repositories with very large LFS objects, consider using a PersistentVolumeClaim instead of emptyDir to retain cached files across pod restarts:

```yaml
volumes:
  - name: tmp
    persistentVolumeClaim:
      claimName: argocd-repo-server-cache
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: argocd-repo-server-cache
  namespace: argocd
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

## When to Avoid LFS with ArgoCD

Git LFS adds complexity and performance overhead to your GitOps workflow. Consider whether you actually need LFS for your ArgoCD-managed repositories:

**You probably do not need LFS if:**
- Your repository only contains YAML manifests, Helm charts, and Kustomize overlays
- All files in the repository are text-based
- The repository is under 500MB total

**You might need LFS if:**
- Your repository contains binary configuration files (e.g., compiled protobuf schemas)
- You store machine learning models alongside deployment configs
- Your manifests include embedded binary data (like certificates or keystores)
- You use custom plugins that process large input files

The best practice is to separate your Kubernetes manifests from large binary files. Keep your ArgoCD-tracked repositories lean with only deployment configurations, and store large files in artifact registries like OCI registries, S3, or dedicated binary stores.

## Selective LFS Fetch

If your repository tracks many large files with LFS but only a few are needed for manifest generation, you can configure selective LFS fetching:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-repo-server-gitconfig
  namespace: argocd
data:
  gitconfig: |
    [lfs]
      fetchinclude = "k8s/**,manifests/**"
      fetchexclude = "models/**,data/**"
```

This tells Git LFS to only download files matching the include patterns and skip everything else. This can dramatically reduce download time and disk usage.

## Troubleshooting LFS Issues

**"Smudge filter lfs failed" during sync:**

This usually means LFS is not properly installed in the repo server container. Verify that LFS is available:

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- git lfs version
```

If the command fails, the repo server image might not include Git LFS. You may need a custom image or an init container that installs it:

```yaml
initContainers:
- name: install-git-lfs
  image: alpine/git
  command:
  - sh
  - -c
  - |
    apk add git-lfs
    git lfs install --system
  volumeMounts:
  - name: gitconfig
    mountPath: /etc/gitconfig
    subPath: gitconfig
```

**"Repository or object not found" LFS errors:**

The LFS API endpoint is unreachable or credentials are insufficient. Check the LFS URL:

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- \
  git -C /tmp/<repo-hash> lfs env
```

This shows the LFS endpoint and authentication information being used.

**Slow sync operations with LFS:**

LFS files are downloaded on every fresh clone. Enable persistent caching and consider reducing LFS fetch scope:

```bash
# Check how much LFS data is being fetched
kubectl exec -n argocd deployment/argocd-repo-server -- \
  du -sh /tmp/*/lfs
```

## Monitoring LFS Impact

Track the impact of LFS on your ArgoCD performance:

```promql
# Monitor Git request duration - LFS operations will be slower
histogram_quantile(0.99,
  rate(argocd_git_request_duration_seconds_bucket[5m])
)

# Monitor repo server disk usage
kubelet_volume_stats_used_bytes{
  persistentvolumeclaim="argocd-repo-server-cache"
}
```

Git LFS in ArgoCD works well when configured properly, but it is always better to keep your GitOps repositories lean. If you can avoid LFS by restructuring your repository to store only text-based manifests, that will give you the best performance and simplest configuration.
