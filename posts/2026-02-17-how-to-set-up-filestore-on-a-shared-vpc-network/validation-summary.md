# Validation Summary: How to Set Up Filestore on a Shared VPC Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Filestore
- Google Cloud Shared VPC
- Private Service Access
- Service Networking API
- Google Cloud CLI
- NFS
- Google Kubernetes Engine
- Filestore CSI driver
- Google Cloud VPC firewall rules

## Sources Consulted
- Google Cloud Filestore: Create an instance on a Shared VPC network in service projects: https://docs.cloud.google.com/filestore/docs/shared-vpc
- Google Cloud Filestore: Create an instance: https://docs.cloud.google.com/filestore/docs/creating-instances
- Google Cloud SDK: gcloud filestore instances create: https://docs.cloud.google.com/sdk/gcloud/reference/filestore/instances/create
- Google Cloud SDK: gcloud compute networks subnets list-usable: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/list-usable
- Google Cloud Filestore: Mounting file shares on Compute Engine clients: https://cloud.google.com/filestore/docs/mounting-fileshares
- Google Cloud Filestore: Configure firewall rules: https://docs.cloud.google.com/filestore/docs/configuring-firewall
- Google Kubernetes Engine: Access Filestore instances with the Filestore CSI driver: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/filestore-csi-driver
- Google Cloud Filestore: IAM roles and permissions: https://cloud.google.com/filestore/docs/iam
- Google Cloud SDK: gcloud compute firewall-rules create: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- GitHub author profile link: https://github.com/nawazdhandala

## Issues Found
- The post incorrectly focused on granting `roles/compute.networkUser` to the Filestore service agent. For service-project Filestore instances on Shared VPC, the official requirement is private services access on the Shared VPC network. I replaced that step with Service Networking API enablement, private services access peering checks, allocated range creation, and VPC peering creation.
- The Filestore creation examples omitted `connect-mode=PRIVATE_SERVICE_ACCESS`, which is required when specifying a Shared VPC from a service project. I added the connect mode to both instance creation examples.
- The reserved IP range example used a placeholder `filestore-range` without explaining that PSA requires a named allocated address range rather than a direct CIDR. I changed it to the allocated range name used earlier in the guide.
- The `gcloud compute networks subnets list-usable` command used the service project as `--project`. Official gcloud documentation uses the host project as `--project` and the service project as `--service-project`, so I corrected the command.
- The examples used `1TB` capacity. Official Filestore examples use `1TiB`, so I updated the capacity values to `1TiB`.
- The firewall section described allowing ingress TCP 2049 to client VMs as the primary NFS rule. Official Filestore guidance requires egress from clients to the Filestore reserved range on TCP 111, 2046, 2049, 2050, and 4045 when egress is restricted, and ingress from Filestore to clients only for NFS file locking. I corrected the explanation and commands.
- The GKE section used a Kubernetes service account IAM member and `roles/compute.networkUser`, which does not match the official Shared VPC setup for GKE Filestore CSI. I changed it to grant `roles/container.hostServiceAgentUser` to the service project's GKE service account and updated the StorageClass to include `connect-mode: PRIVATE_SERVICE_ACCESS` and `reserved-ip-range`.
- The troubleshooting guidance repeated the incorrect Filestore service agent `compute.networkUser` advice. I replaced it with private services access and GKE CSI driver checks that match current documentation.

## Review Notes
The guide is now technically aligned with current Google Cloud documentation. The author profile link resolves correctly. Future improvements could mention that the Filestore reserved IP range in firewall examples should be replaced with the actual range returned by `gcloud filestore instances describe`, and that NFS locking ingress ports depend on the client `statd` and `nlockmgr` configuration.
