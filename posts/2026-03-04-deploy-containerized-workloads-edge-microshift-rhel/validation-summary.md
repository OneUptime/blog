# Validation Summary: How to Deploy Containerized Workloads at the Edge Using MicroShift on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat build of MicroShift
- Kubernetes Deployments, Services, and PersistentVolumeClaims
- MicroShift LVMS CSI storage
- CRI-O image cache management with crictl
- Red Hat container images for UBI httpd and RHEL PostgreSQL

## Sources Consulted
- Red Hat build of MicroShift storage documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html-single/storage/
- Red Hat build of MicroShift CLI tools documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html-single/cli_tools/cli_tools
- Red Hat build of MicroShift disconnected installation documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.20/html-single/getting_ready_to_install_microshift/getting_ready_to_install_microshift
- Red Hat build of MicroShift RHEL for Edge offline image documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_microshift/4.21/html/embedding_in_a_rhel_for_edge_image/microshift-embed-in-rpm-ostree-for-offline-use
- Red Hat Enterprise Linux 9 container registry documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/working-with-container-registries_building-running-and-managing-containers
- Red Hat Ecosystem Catalog for ubi9/httpd-24: https://catalog.redhat.com/en/software/containers/ubi9/httpd-24/61a60c3e3e9240fca360f74a
- Red Hat Ecosystem Catalog for rhel9/postgresql-15: https://catalog.redhat.com/en/software/containers/rhel9/postgresql-15/63f763f779eb1214c4d6fcf6
- Kubernetes image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The workload manifests used `:latest` images without setting `imagePullPolicy`. Kubernetes defaults `imagePullPolicy` to `Always` for `:latest`, which would make the later pre-pulling guidance unreliable during offline or intermittent connectivity. Added `imagePullPolicy: IfNotPresent` to both containers so the kubelet can use the pre-pulled CRI-O cache.
- The offline operation section implied that pre-pulling alone was sufficient for edge offline operation. Red Hat documentation recommends mirror registries or embedding images for fully disconnected deployments. Updated the wording to limit pre-pulling to cached-image use for intermittent connectivity and added a note for fully disconnected deployments.

## Review Notes
The manifests use valid Kubernetes API versions and resource fields. The `topolvm-provisioner` StorageClass name matches MicroShift LVMS documentation. The `ubi9/httpd-24` image exposes port 8080, and the PostgreSQL 15 environment variables and data directory match the Red Hat Ecosystem Catalog. The `registry.redhat.io/rhel9/postgresql-15` image requires Red Hat registry authentication in real deployments.
