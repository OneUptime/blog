# Validation Summary: How to Configure RKE with Custom Docker Options

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Kubernetes Engine (RKE/RKE1)
- Kubernetes
- Docker Engine / dockerd
- Docker daemon configuration (`daemon.json`)
- RKE `cluster.yml`
- Kubernetes kubelet configuration
- Private container registries
- systemd proxy configuration

## Sources Consulted
- RKE1 Overview: https://rke.docs.rancher.com/
- RKE1 Service Extra Args, Extra Binds, and Extra Environment Variables: https://rke.docs.rancher.com/config-options/services/services-extras
- RKE1 Private Registries: https://rke.docs.rancher.com/config-options/private-registries
- RKE1 Node Options: https://rke.docs.rancher.com/config-options/nodes
- RKE1 System Images: https://rke.docs.rancher.com/config-options/system-images
- RKE1 Requirements and Docker version guidance: https://rke.docs.rancher.com/os
- SUSE RKE1 v1.28 Support Matrix: https://www.suse.com/suse-rke1/support-matrix/all-supported-versions/rke1-v1-28/
- SUSE KB for `rke config --list-version --all`: https://www.suse.com/support/kb/doc/?id=000021088
- SUSE KB for setting kubelet parameters via config file in RKE: https://www.suse.com/support/kb/doc/?id=000021322
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker logging driver configuration: https://docs.docker.com/engine/logging/configure/
- Docker JSON file logging driver: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker OverlayFS storage driver: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker deprecated features (`overlay2.override_kernel_check`): https://docs.docker.com/engine/deprecated/
- Docker daemon proxy configuration: https://docs.docker.com/engine/daemon/proxy/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kubelet config file task: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/

## Issues Found
1. **RKE1 lifecycle missing**: Added a note that RKE1 reached end of life on July 31, 2025, and that the guidance is for existing RKE1 clusters.

2. **Removed deprecated Docker storage option**: Removed `overlay2.override_kernel_check=true` from Docker daemon examples. Docker deprecated this option in v19.03 and removed it in v24.0.

3. **Incorrect RKE service-level Docker wording**: Changed the description from per-service Docker options to RKE service container customization, because RKE supports `extra_args`, `extra_binds`, `extra_env`, and image overrides, not arbitrary Docker daemon options per service.

4. **Unsupported `extra_labels` field**: Removed `extra_labels` examples. Official RKE service extras document `extra_args`, `extra_binds`, and `extra_env`, not `extra_labels`.

5. **Invalid kubelet max pods environment variable**: Replaced `KUBELET_MAX_PODS=250` with the supported kubelet argument `max-pods: "250"`.

6. **Incorrect etcd image comment and version**: Changed the misleading "Docker resource limits" comment to an optional image override note, and aligned the example etcd image with the RKE1 v1.28 support matrix (`v3.5.7`).

7. **Private registry comments were inaccurate**: Clarified that `private_registries` provides registry credentials and that `is_default: true` prefixes RKE system images, rather than acting as a Docker Hub mirror or default for all pulls.

8. **Per-service log driver claim was incorrect**: Reworked the log section to explain that Docker log drivers are configured in `daemon.json`, not per RKE service.

9. **Deprecated kubelet log rotation flags**: Replaced the `container-log-max-size` and `container-log-max-files` flag example with a kubelet configuration file mounted into the RKE-managed kubelet container.

10. **Incorrect `overlay2.size` guidance**: Removed `overlay2.size=20G` from the default storage example and added the prerequisite that it is only supported on XFS with project quotas.

11. **Proxy wording was too broad**: Changed "RKE engine config" wording to clarify that proxy environment variables should be passed to the RKE-managed Kubernetes components that need outbound HTTP(S) access.

12. **RKE compatibility command mislabeled**: Clarified that `rke config --list-version --all` lists Kubernetes versions supported by the RKE binary; Docker compatibility still needs to be checked against the support matrix.

## Review Notes
- The corrected Docker daemon JSON examples are syntactically valid and use supported Docker daemon keys.
- RKE1 remains useful context for existing clusters, but new deployments should generally use RKE2 or K3s because RKE1 is end-of-life.
- Docker logging changes apply to newly created containers; existing containers retain their original logging configuration until recreated.
