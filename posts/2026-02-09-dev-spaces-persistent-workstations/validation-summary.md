# Validation Summary: How to Set Up Dev Spaces in Kubernetes with Persistent Developer Workstations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets, Services, Secrets, Ingress, CronJobs, RBAC, PersistentVolumeClaims, and VolumeSnapshots
- kubectl
- Docker and Dockerfiles
- Ubuntu-based development containers
- Go toolchain installation
- code-server
- OpenSSH
- Bash scripting

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service documentation, including headless Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl Linux installation documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- code-server installation documentation: https://coder.com/docs/code-server/install
- code-server secure access documentation: https://coder.com/docs/code-server/guide
- Go release history and downloads: https://go.dev/doc/devel/release and https://go.dev/dl/

## Issues Found
- The Dockerfile attempted to install `kubectl` directly from the default Ubuntu 22.04 apt repositories. Replaced that with the official Kubernetes release-channel binary installation flow.
- The Dockerfile advertised SSH access but did not install or start an SSH server, and the `developer` account had no password. Added `openssh-server`, `sudo`, an initial developer password for the example, `/run/sshd`, and a startup command that starts SSH before code-server.
- The Dockerfile copied dotfiles directly into `/home/developer`, but the Kubernetes manifests mount a persistent volume over that path, which would hide those files at runtime. Moved defaults to `/etc/devspace-defaults` and copied them into the mounted home directory on container startup.
- The Go toolchain version was pinned to the old Go 1.21.5 release. Updated the example to Go 1.26.4, the current stable release returned by the official Go downloads endpoint during review.
- The Go-installed CLI tools were installed as root into `/root/go/bin`, which would not be on the developer user's PATH. Set `GOBIN=/usr/local/bin` for those installs.
- code-server was configured with `--auth none` even though the article later exposes it through Ingress. Changed the examples to use password authentication and Kubernetes Secrets for the deployed password.
- The StatefulSet used its regular ClusterIP Service as the governing service. Added a headless Service and pointed `spec.serviceName` at it, matching Kubernetes StatefulSet guidance.
- Removed an unused standalone PersistentVolumeClaim from the first manifest because the StatefulSet already provisions the `workspace` PVC from `volumeClaimTemplates`.
- The automatic backup CronJob referenced `backup-sa` without defining the ServiceAccount or RBAC permissions. Added ServiceAccount, ClusterRole, and ClusterRoleBinding resources.
- The backup CronJob only backed up PVCs in the shared `devspaces` namespace even though the provisioning script creates one namespace per developer. Updated it to iterate namespaces labeled `type=devspace`.
- The usage report could print a blank developer value for the shared namespace. Added a fallback label value of `shared`.

## Review Notes
- The Docker socket hostPath mount is syntactically valid but only works on clusters whose nodes expose `/var/run/docker.sock`; many Kubernetes clusters use containerd without a Docker socket. It also grants broad host-level access and should be restricted or replaced with a safer build strategy in production.
- The examples assume the `fast-ssd` StorageClass, `csi-snapclass` VolumeSnapshotClass, cert-manager cluster issuer, and an Ingress controller already exist in the cluster.
- YAML snippets were parsed successfully, and Bash script snippets with shebangs passed `bash -n`.
