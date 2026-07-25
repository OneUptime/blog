# Validation Summary: Persistent Storage in Devfiles: Volumes, PVCs, and Data Between Dev Sessions

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Devfile schema 2.3.0
- Kubernetes volumes, `emptyDir`, PersistentVolumes, and PersistentVolumeClaims
- odo development environments and source synchronization
- Devfile container, volume, Kubernetes, exec-command, and composite-command components
- Maven, Go, Node.js, and Trivy container images
- kubectl storage troubleshooting commands
- Unix `du` and `find` commands

## Sources Consulted

- [Devfile 2.3: Adding a volume component](https://devfile.io/docs/2.3.0/adding-a-volume-component)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3: Adding a composite command](https://devfile.io/docs/2.3.0/adding-a-composite-command)
- [Devfile 2.3: Adding a Kubernetes or OpenShift component](https://devfile.io/docs/2.3.0/adding-a-kubernetes-or-openshift-component)
- [Devfile 2.3: Extending Kubernetes resources](https://devfile.io/docs/2.3.0/overriding-pod-and-container-attributes)
- [odo architecture: How odo works](https://odo.dev/docs/development/architecture/how-odo-works/)
- [odo command reference: `odo dev`](https://odo.dev/docs/command-reference/dev/)
- [Kubernetes: Volumes](https://kubernetes.io/docs/concepts/storage/volumes/)
- [Kubernetes: Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: Ephemeral Volumes](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes: Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Docker Official Image: Maven](https://hub.docker.com/_/maven)
- [Docker Official Image: Go](https://hub.docker.com/_/golang)
- [Go release history and support policy](https://go.dev/doc/devel/release)
- [Trivy filesystem scanner reference](https://www.trivy.dev/docs/latest/guide/references/configuration/cli/trivy_filesystem/)
- [Trivy v0.70.0 release](https://github.com/aquasecurity/trivy/releases/tag/v0.70.0)

## Issues Found

- The Maven cache was mounted and measured at `/home/developer/.m2`, but the selected official Maven image runs Maven with `/root/.m2` as its local repository location. Changed the mount and cleanup examples to `/root/.m2` so they cache the dependencies downloaded by that image.
- The builder used `golang:1.24`. Go 1.24 became unsupported when Go 1.26 was released under Go's two-newer-major-releases policy. Updated the image to the supported `golang:1.26` tag.
- The shared-volume example used the non-existent placeholder image `registry.example.com/security/scanner:4` and a placeholder `scanner` executable. Replaced them with the published `aquasec/trivy:0.70.0` image and the documented `trivy fs /scan/input/app` invocation.
- The lifecycle explanation could imply that a PVC-backed odo volume survives normal development-session cleanup, and it described the PVC itself as being reclaimed. Clarified that current odo makes generated PVCs dependents of its development Deployment and deletes session resources when `odo dev` ends normally. Also clarified that reclaim policy applies to the backing PV after claim deletion, and that Devfile persistence does not itself guarantee retention between tool-managed sessions.
- The source-storage discussion now explicitly applies the same odo cleanup caveat to the `odo-projects` PVC and user-declared persistent Devfile volumes.
- The capacity-planning checklist referred to a storage mode when asking about concurrent mounts. Changed this to access mode, which is the Kubernetes concept that describes how nodes may mount a volume.
- The volume-component documentation link targeted Devfile 2.2 while the post discusses schema 2.3. Updated it to the corresponding Devfile 2.3 page.

## Review Notes

- Devfile 2.3.0 remains the current documented schema version. The `volume.size`, `volume.ephemeral`, `volumeMounts`, `mountSources`, `sourceMapping`, composite-command, and Kubernetes-component fields in the post match that schema and its validation rules.
- Current odo documentation confirms that non-ephemeral Devfile volumes and default source storage use PVCs, while ephemeral Devfile volumes and ephemeral source storage use `emptyDir`. The two settings are independent.
- The referenced Maven, Go, Node.js, and Trivy image tags resolved at review time. The floating Maven, Go, and Node.js tags can move; digest pinning can improve reproducibility.
- Trivy may need outbound registry access to download its vulnerability database unless the environment provides a mirror or pre-populated cache.
- A Devfile Kubernetes component is not deployed at startup unless it is invoked by an apply command or has `deployByDefault: true`; the post only claims that the native manifest defines the outer-loop workload, so its example is correct as written.
