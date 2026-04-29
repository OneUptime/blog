# Validation Summary: How to Configure K3s Automatic Manifest Deployment

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- K3s AddOn auto-deploying manifests
- K3s Helm controller and `HelmChart` resources
- Kubernetes RBAC
- Kubernetes `StorageClass` resources
- Rancher local path provisioner
- Git-based manifest synchronization
- Cron

## Sources Consulted
- K3s docs: Managing Packaged Components - https://docs.k3s.io/installation/packaged-components
- K3s docs: Helm - https://docs.k3s.io/add-ons/helm
- K3s docs: Networking Services - https://docs.k3s.io/networking/networking-services
- K3s docs: Server CLI - https://docs.k3s.io/cli/server
- K3s docs: Configuration Options - https://docs.k3s.io/installation/configuration
- K3s docs: Volumes and Storage - https://docs.k3s.io/add-ons/storage
- Kubernetes docs: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes docs: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes docs: Limit Ranges - https://kubernetes.io/docs/concepts/policy/limit-range/

## Issues Found
- The post said manifests are applied using both the AddOn controller and `helm-controller`. I changed this to clarify that manifest files are applied as AddOns, and `helm-controller` only reconciles `HelmChart` resources defined in those manifests.
- The Step 3 lead-in said the RBAC example was "for all namespaces", but the example binds a `ServiceAccount` in the `production` namespace. I changed the wording to match the actual scope of the example.
- The install example comment mentioned disabling only Traefik, while the command also disables `metrics-server`. I updated the comment to match the command.
- The Git sync section implied a more GitOps-like workflow than K3s actually provides. I changed the wording, added a note that deleting manifest files from Git does not delete already-applied cluster resources, and kept the example aligned with K3s's documented non-pruning behavior.
- The cron example executed the sync script directly without showing an executable-bit step. I changed the cron entry to invoke `bash` explicitly so the example works as written.
- The conclusion described the setup as "self-healing", which overstates the behavior. I changed it to describe the documented restart-based reapplication behavior more precisely.

## Review Notes
- K3s requires AddOn filenames to be unique across the manifests tree, including subdirectories. The examples in this post already use unique basenames.
- K3s versions starting with 1.32 install Traefik v3 by default; earlier versions installed Traefik v2.
- The manifest-writing commands assume sufficient privileges to write under `/var/lib/rancher/k3s/server/manifests/`, and the `kubectl` examples assume access to the K3s kubeconfig.
