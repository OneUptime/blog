# Validation Summary: How to Set Up Buildah for Rootless Container Image Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Buildah
- Kubernetes Pods and security contexts
- Tekton Tasks and Pipelines
- Container registry authentication
- containers/storage storage.conf
- Multi-architecture OCI image manifests

## Sources Consulted
- Buildah upstream README and command documentation: https://github.com/containers/buildah
- Buildah build command man page: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Buildah manifest command documentation: https://github.com/containers/buildah/blob/main/docs/buildah-manifest.1.md
- Buildah manifest add documentation: https://man.archlinux.org/man/extra/buildah/buildah-manifest-add.1.en
- Buildah manifest push documentation: https://www.mankier.com/1/buildah-manifest-push
- Tekton Tasks documentation: https://tekton.dev/docs/pipelines/tasks/
- Tekton Pipeline API reference: https://tekton.dev/docs/pipelines/pipeline-api/
- Red Hat OpenShift Pipelines Buildah non-root guidance: https://docs.redhat.com/en/documentation/red_hat_openshift_pipelines/1.20/html-single/securing_openshift_pipelines/index
- containers-storage.conf documentation: https://man.archlinux.org/man/containers-storage.conf.5.en

## Issues Found
- Rootless Buildah storage was mounted at `/var/lib/containers`, which is the rootful storage location. Changed rootless Kubernetes and Tekton examples to mount `/home/build/.local/share/containers`, matching the `build` user's rootless container storage path used by the Buildah image and Red Hat's non-root Buildah task guidance.
- The `storage.conf` example configured `driver = "vfs"` together with `mount_program = "/usr/bin/fuse-overlayfs"`. The `mount_program` setting belongs under overlay storage options, not the VFS driver. Split the example into a VFS configuration and a separate overlay/fuse-overlayfs configuration.
- The rootless pod example used `allowPrivilegeEscalation: false` while also adding `SETUID` and `SETGID`. Buildah's non-root mode can require setuid/setgid helpers, and Red Hat documents `allowPrivilegeEscalation: true` for that SCC-based approach. Updated the snippet accordingly.
- The introduction and conclusion overstated the security model as "maximum security" and "completely unprivileged operation." Revised those claims to describe reduced privileges, non-root builds, and non-privileged pods more accurately.

## Review Notes
The Buildah CLI flags and examples checked in the post are current: `bud`, `push`, `--storage-driver`, `--tls-verify`, `--format`, `--arch`, `--os`, and manifest create/add/push are valid. `tekton.dev/v1beta1` examples remain recognizable but Tekton's API reference marks v1beta1 Task as deprecated in favor of `tekton.dev/v1`; a future post refresh should consider updating the Tekton manifests to `v1`.
