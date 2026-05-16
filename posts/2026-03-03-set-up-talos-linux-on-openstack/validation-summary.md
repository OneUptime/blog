# Validation Summary: How to Set Up Talos Linux on OpenStack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- OpenStack Nova, Neutron, Glance, Octavia, and floating IPs
- Kubernetes
- OpenStack Cinder / cloud-provider-openstack
- `talosctl`
- OpenStack CLI

## Sources Consulted
- Sidero Labs Talos OpenStack installation guide: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/cloud-platforms/openstack
- Sidero Labs Talos v1.9 MachineConfig reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config
- Sidero Labs Talos v1.9 CLI reference: https://docs.siderolabs.com/talos/v1.9/reference/cli
- Sidero Labs Image Factory documentation: https://www.talos.dev/v1.9/learn-more/image-factory/
- Sidero Labs Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos v1.9.0 GitHub release metadata: https://api.github.com/repos/siderolabs/talos/releases/tags/v1.9.0
- OpenStackClient image command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/image-v2.html
- OpenStackClient server command documentation: https://docs.openstack.org/python-openstackclient/latest/cli/command-objects/server.html
- OpenStackClient security group rule documentation: https://docs.openstack.org/python-openstackclient/3.5.0/command-objects/security-group-rule.html

## Issues Found
- The post downloaded `nocloud-amd64.raw.xz` from the Talos v1.9.0 GitHub release. That asset is not present in the v1.9.0 release metadata, and the official OpenStack flow uses the Talos Image Factory OpenStack image. Updated the commands to download `openstack-amd64.raw.xz` from Image Factory using the default schematic ID.
- The upload command referenced the decompressed `nocloud-amd64.raw` file. Updated it to upload `openstack-amd64.raw`.
- The Talos configuration snippet placed the load balancer VIP under `machine.certSANs`, which affects the Talos machine certificate, not the Kubernetes API server certificate. Moved the SAN entry to `cluster.apiServer.certSANs`.
- The generated Kubernetes endpoint used the private load balancer VIP even though the post later assigns a floating IP to the load balancer. Added guidance to use the externally reachable floating IP or DNS name in both `talosctl gen config` and `cluster.apiServer.certSANs` when clients connect from outside the tenant network.
- The OpenStack server creation commands did not pass the generated Talos machine configs to the instances. Updated control plane and worker creation to include `--user-data controlplane.yaml` and `--user-data worker.yaml`, matching the official OpenStack installation pattern.
- Because configs are now supplied as OpenStack user-data during instance creation, the later `talosctl apply-config --insecure` loops were redundant and could conflict with the documented boot flow. Removed those loops and left the bootstrap commands.

## Review Notes
- The security group, image upload, load balancer, floating IP, and `talosctl` command flags used in the post are valid according to the referenced CLI documentation.
- The Cinder section is a minimal cloud configuration secret example. A production setup should also install the appropriate OpenStack cloud controller manager and Cinder CSI components, and prefer application credentials or another secret-management approach over static passwords where possible.
