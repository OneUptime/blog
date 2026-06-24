# How to Configure Rancher Desktop Allowed Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Security, Image, Allow List, Policy

Description: Set up image allow lists in Rancher Desktop to restrict which container images can be pulled and run locally.

## Introduction

Rancher Desktop is an open-source desktop application that provides container management and Kubernetes on the desktop. It includes an `Allowed Images` setting that lets you control which registry artifacts can be accessed from your local Rancher Desktop instance. This guide covers how to configure Rancher Desktop Allowed Images in detail.

## Prerequisites

- A supported macOS, Windows, or Linux installation of Rancher Desktop
- Rancher Desktop installed and running
- `nerdctl` if you use the `containerd` engine, or `docker` if you use the `moby` engine
- Administrator/sudo privileges only if your platform requires them for installation or for system-level deployment profiles
- Enough local resources for your workloads; Rancher Desktop recommends 8 GB of memory and 4 CPU

## Overview

Rancher Desktop allowed images lets you:

- Restrict image pulls and pushes to names that match an allow list
- Define patterns with the format `[registry/][:port/][organization/]repository[:tag]`
- Use Docker Hub defaults when the registry or organization is omitted
- Lock the setting with deployment profiles for managed environments

Note: Tag filtering is not reliable by itself. Rancher Desktop documents that matching digests (`repository@digest`) also need to be added to the allow list.

## Step 1: Initial Setup

```bash
# Verify the CLI is available
rdctl version

# Rancher Desktop must be running for list-settings
rdctl list-settings

# Use the CLI that matches your selected container engine
nerdctl version
# or
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences and go to **Container Engine > Allowed Images**.

- Check **Enable** to turn the policy on
- Add one or more allowed image patterns, such as `busybox`, `nginx`, or `registry.internal:5000`
- Use the `+` and `-` controls to add or remove patterns

You can also lock the policy with a deployment profile. For example, a user-level locked profile on Linux looks like this:

`~/.config/rancher-desktop.locked.json`

```json
{
  "version": 10,
  "containerEngine": {
    "allowedImages": {
      "enabled": true,
      "patterns": ["busybox", "nginx"]
    }
  }
}
```

On macOS, user deployment profiles are stored in `~/Library/Preferences/io.rancherdesktop.profile.locked.plist`. On Windows, user deployment profiles are stored under `HKEY_CURRENT_USER\Software\Policies\Rancher Desktop\Locked`.

## Step 3: Working with Containers

Use the container CLI that matches your selected runtime. With an allow list that includes `busybox` and `nginx`, the following pulls are allowed:

```bash
# containerd runtime
nerdctl pull busybox
nerdctl pull nginx

# moby runtime
docker pull busybox
docker pull nginx

# If alpine is not on the allow list, this pull is denied
nerdctl pull alpine
# or
docker pull alpine
```

## Step 4: Working with Kubernetes

If Kubernetes is enabled and you are using `containerd`, use the `k8s.io` namespace when you pre-pull an allowed image for workloads:

```bash
# Pre-pull an allowed image into the Kubernetes namespace
nerdctl --namespace k8s.io pull nginx

# Deploy a workload that uses an allowed image
kubectl create deployment hello-world \
  --image=nginx

# Check the pods
kubectl get pods

# Clean up
kubectl delete deployment hello-world
```

## Step 5: Using Deployment Profiles

Deployment profiles are useful when you want the allow list applied automatically or locked for other users. Rancher Desktop can export the current settings so you can use them as a starting point.

```bash
# Export current settings to a user deployment profile on Linux
rdctl list-settings > ~/.config/rancher-desktop.defaults.json

# Shut Rancher Desktop down after editing deployment profiles
rdctl shutdown

# Start Rancher Desktop again so it reloads the profile
rdctl start
```

If a deployment profile exists but cannot be parsed correctly, Rancher Desktop will refuse to load the application.

## Common Configuration Tasks

```bash
# View the currently loaded allowed image settings
rdctl list-settings

# Start Rancher Desktop with a specific container engine
rdctl start --container-engine.name containerd
# or
rdctl start --container-engine.name moby

# Generate a deployment profile in Windows .reg format from current settings
rdctl create-profile --output reg --hive=hkcu --from-settings
```

## Troubleshooting

If the policy does not behave as expected, verify the exact image name against your patterns. For Docker Hub images, Rancher Desktop defaults the registry to `docker.io` and the organization to `library` when they are omitted. You can also use **Troubleshooting > Show Logs** in the Rancher Desktop UI to open the log directory.

```bash
# Confirm the active settings Rancher Desktop is using
rdctl list-settings

# Restart Rancher Desktop after changing deployment profiles
rdctl shutdown
rdctl start
```

## Conclusion

How to Configure Rancher Desktop Allowed Images gives you a practical way to limit which container registries and repositories can be used on a local development machine. Configure the policy from the **Allowed Images** tab for individual use, or enforce it with deployment profiles when you need a locked configuration across managed systems.
