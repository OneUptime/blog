# Validation Summary: How to Port Podman Containers to OpenShift from RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- OpenShift Container Platform
- CRI-O
- SecurityContextConstraints
- Kubernetes Deployments, Services, PersistentVolumeClaims, and Secrets
- OpenShift Routes
- Red Hat Universal Base Image 9

## Sources Consulted
- OpenShift Container Platform 4.20 documentation: Creating images and supporting arbitrary user IDs: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/images/creating-images
- OpenShift Container Platform 4.20 documentation: Registry access and exposing the image registry: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/registry/securing-exposing-registry
- OpenShift Container Platform 4.20 documentation: OpenShift CLI and `oc new-app`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html/cli_tools/openshift-cli-oc
- OpenShift Container Platform 4.20 documentation: Ingress and load balancing, `oc expose service`, and Routes: https://docs.redhat.com/en/documentation/openshift_container_platform/4.20/html-single/ingress_and_load_balancing/ingress_and_load_balancing
- OpenShift Container Platform 4.15 documentation: Persistent storage and PersistentVolumeClaims: https://docs.redhat.com/en/documentation/openshift_container_platform/4.15/html/storage/configuring-persistent-storage
- Podman documentation: `podman kube generate`: https://docs.podman.io/en/stable/markdown/podman-kube-generate.1.html
- Red Hat Enterprise Linux 9 documentation: Building UBI-based images and using `microdnf` in UBI minimal images: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/

## Issues Found
- The architecture diagram described OpenShift as "Always rootless by default." OpenShift runs containers as non-root arbitrary UIDs by default under its security constraints, but this is not the same as Podman rootless runtime mode. Changed the label to "Non-root containers by default."
- The Containerfile comment said not to set `USER` to a specific UID while the example set `USER 1001`. OpenShift image guidelines recommend a numeric non-root `USER` declaration for image metadata, while OpenShift can still assign a different UID at runtime. Updated the comment and key-change bullet.
- The `podman kube generate` command omitted `--type deployment` even though the following YAML is a Kubernetes Deployment. Podman generates a Pod by default. Updated the command to include `--type deployment --replicas 2`.
- The internal registry heading implied direct use of the internal registry while the command uses the external default registry route. Updated the heading to "OpenShift internal registry route."
- The project creation heading said "Create or switch" but only showed `oc new-project`, which creates and switches to a new project but does not switch to an existing one. Updated the heading to "Create your project."

## Review Notes
The remaining examples are syntactically valid and consistent with the documented OpenShift and Podman behavior. In a future revision, the guide could add caveats for clusters where the default image registry route is not enabled and for storage classes that require `fsGroup` or administrator-provisioned permissions.
