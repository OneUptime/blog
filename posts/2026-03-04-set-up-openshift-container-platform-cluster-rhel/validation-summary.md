# Validation Summary: How to Set Up an OpenShift Container Platform Cluster on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat OpenShift Container Platform
- Red Hat Enterprise Linux
- Red Hat Enterprise Linux CoreOS
- Kubernetes
- Ignition
- OpenShift CLI
- OpenShift installer

## Sources Consulted
- Red Hat Documentation: Installing a user-provisioned cluster on bare metal, OpenShift Container Platform 4.17: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/installing_on_bare_metal/installing-bare-metal
- Red Hat Documentation: User-provisioned infrastructure, OpenShift Container Platform 4.18: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/installing_on_bare_metal/user-provisioned-infrastructure
- Red Hat Documentation: Installing on bare metal, OpenShift Container Platform 4.21: https://docs.redhat.com/documentation/openshift_container_platform/4.21/html-single/installing_on_bare_metal/index
- Red Hat Documentation: Installing OpenShift on a single node, OpenShift Container Platform 4.21, for current client and installer download command patterns: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html-single/installing_on_a_single_node/installing_on_a_single_node

## Issues Found
- The description said the guide used installer-provisioned infrastructure, but the commands and `platform: none` configuration describe user-provisioned bare-metal infrastructure. Changed the description to user-provisioned infrastructure.
- The prerequisites listed only partial DNS requirements. Added `api-int`, node records, and load balancer prerequisites to reflect the required user-provisioned bare-metal installation infrastructure.
- The bare-metal `install-config.yaml` example set `compute.replicas` to `3`. Red Hat documentation requires `compute.replicas: 0` for user-provisioned infrastructure, even when worker nodes are deployed manually. Updated the example and added a clarifying sentence.
- The node boot instructions omitted the temporary bootstrap node and showed kernel parameters at the RHCOS ISO boot prompt. Updated the text to include bootstrap, control plane, and worker nodes and changed the ISO example to use `coreos-installer install --ignition-url` with a SHA512 Ignition hash.
- The CSR approval command approved every CSR returned by `oc get csr -o name`, not just pending CSRs. Replaced it with Red Hat's documented pending-CSR filter and added a reminder to verify CSRs before approval.

## Review Notes
The guide is still a high-level overview and does not include every production requirement, such as full load balancer port mappings, reverse DNS validation, DHCP/static IP planning, or disconnected installation steps. Those omissions are acceptable for an overview but should be expanded if the post is intended to be a complete production runbook.
