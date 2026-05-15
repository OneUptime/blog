# Validation Summary: How to Set Up an OpenShift Container Platform Cluster on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Enterprise Linux CoreOS
- OpenShift Container Platform
- OpenShift CLI
- Kubernetes

## Sources Consulted
- Red Hat OpenShift Container Platform 4.21 documentation: Installing a cluster on any platform: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/installing_on_any_platform/installing-platform-agnostic
- Red Hat OpenShift Container Platform 4.17 documentation: Adding RHEL compute machines to an OpenShift Container Platform cluster: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/machine_management/adding-rhel-compute
- Red Hat OpenShift Container Platform 4.21 documentation: OpenShift CLI (`oc`): https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/cli_tools/openshift-cli-oc
- Red Hat OpenShift Container Platform 4.21 documentation: Installer-provisioned infrastructure examples using `openshift-install create install-config` and `openshift-install create cluster`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html-single/installing_on_openstack/installing_on_openstack

## Issues Found
- The post implied that all OpenShift cluster nodes could run RHEL 9. Red Hat documentation states that bootstrap and control plane machines must use RHCOS; RHEL is supported only for compute machines in supported scenarios. Updated the title, description, introduction, and prerequisites to describe a cluster with RHEL 9 compute nodes instead.
- The conclusion described logging and CI/CD as integrated capabilities. OpenShift includes integrated monitoring, while logging and CI/CD are optional capabilities provided through additional OpenShift components/operators. Updated the conclusion to reflect that distinction.
- The conclusion recommended installer-provisioned infrastructure without noting that RHEL compute nodes are not automatically created by IPI scaling. Added the documented caveat that RHEL compute machines must be added manually because automatic scaling creates RHCOS compute machines by default.

## Review Notes
The `openshift-install create install-config`, `openshift-install create cluster`, `oc get nodes`, `oc get clusterversion`, `oc get co`, and monitoring namespace commands are valid OpenShift CLI usage. The local environment did not have `openshift-install` or `oc` installed, so command verification was performed against official Red Hat documentation rather than local `--help` output.
