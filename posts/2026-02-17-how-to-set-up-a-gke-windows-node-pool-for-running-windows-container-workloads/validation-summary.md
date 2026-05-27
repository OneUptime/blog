# Validation Summary: How to Set Up a GKE Windows Node Pool for Running Windows Container Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud CLI (`gcloud`)
- Kubernetes Deployments, Services, node selectors, taints, and tolerations
- Windows Server containers
- .NET Framework containers
- Compute Engine persistent disks and the GKE PD CSI driver
- Cloud Monitoring and Google Cloud Managed Service for Prometheus

## Sources Consulted
- Google Cloud documentation: Creating a cluster using Windows Server node pools - https://cloud.google.com/kubernetes-engine/docs/how-to/creating-a-cluster-windows
- Google Cloud documentation: Windows Server containers on GKE - https://cloud.google.com/kubernetes-engine/docs/concepts/windows-server-gke
- Google Cloud documentation: Deploying a Windows Server application - https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-windows-app
- Google Cloud SDK reference: `gcloud container node-pools create` - https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud documentation: Containerd node images - https://cloud.google.com/kubernetes-engine/docs/concepts/using-containerd
- Google Cloud documentation: Using the Compute Engine persistent disk CSI Driver - https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Kubernetes documentation: Windows containers in Kubernetes - https://kubernetes.io/docs/concepts/windows/intro/
- Microsoft Learn: Windows container version compatibility - https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/version-compatibility

## Issues Found
- Updated the minimum version guidance. The post said GKE 1.16 or later, but Google documents 1.16.8-gke.9 as the minimum for Windows Server node pools and containerd Windows node images require 1.21.1-gke.2200 or later.
- Removed the statement that Windows nodes cannot run kube-proxy. Kubernetes supports kube-proxy on Windows nodes; the accurate GKE requirement is that clusters with Windows node pools must also have a Linux node pool for critical cluster add-ons.
- Reworded the cluster creation intro and command comment. There is no separate "Windows node support addon" in the shown command; the important cluster prerequisite is VPC-native networking with alias IPs.
- Added `--windows-os-version=ltsc2022` to Windows node pool creation commands. GKE defaults `WINDOWS_LTSC_CONTAINERD` node pools to Windows Server 2019 when the OS version is not specified, but the example workloads use `ltsc2022` container images.
- Removed the recommendation to use `WINDOWS_SAC_CONTAINERD`. GKE documentation marks Windows SAC containerd images as unsupported after August 9, 2022.
- Corrected the `kubectl get nodes -o wide` explanation from an OS column to the OS-IMAGE column.
- Corrected the Windows image compatibility quick reference to distinguish LTSC 2022 node pools from the default LTSC 2019 node pools.
- Updated the storage guidance. GKE documentation says Windows persistent disks must use NTFS, so the PVC example now includes a Windows-specific StorageClass with `csi.storage.k8s.io/fstype: NTFS`.
- Replaced vague or inaccurate limitation bullets with documented GKE and Kubernetes Windows limitations, including unsupported host namespaces and Linux-specific security context fields.

## Review Notes
The Kubernetes Deployment, Service exposure, toleration, node selector, resource request, probe, Dockerfile, autoscaling command, and basic monitoring commands are syntactically valid. GKE's admission webhook can add the Windows toleration automatically when the Windows node selector is present, but keeping the toleration explicit is still valid and useful for clarity.
