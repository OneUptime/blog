# Validation Summary: How Docker Actually Works

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker images and OCI image manifests
- OverlayFS and copy-on-write layers
- Linux namespaces
- Linux cgroups v2
- Docker bridge, macvlan, ipvlan, and CNI networking
- Docker volumes, bind mounts, and tmpfs mounts
- containerd, ctr, and snapshotters
- runc and OCI runtime bundles
- Linux capabilities, seccomp, AppArmor, SELinux, and rootless/user namespaces

## Sources Consulted
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs: Seccomp security profiles - https://docs.docker.com/engine/security/seccomp/
- Docker Docs: AppArmor security profiles - https://docs.docker.com/engine/security/apparmor/
- Docker Docs: Rootless mode - https://docs.docker.com/engine/security/rootless/
- Docker Docs: User namespace remapping - https://docs.docker.com/engine/security/userns-remap/
- Docker CLI help output for `docker run`, `docker history`, `docker image prune`, and `docker volume create`
- containerd project overview - https://containerd.io/
- Local `ctr run`, `ctr images pull`, and `ctr tasks metrics` help output
- Local `runc`, `runc spec`, and `runc run` help output
- Local `nsenter` help output
- OCI Image Manifest Specification - https://github.com/opencontainers/image-spec/blob/main/manifest.md
- Kubernetes network plugins documentation - https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- CNI specification overview - https://www.cni.dev/docs/
- GoogleContainerTools Distroless documentation - https://github.com/GoogleContainerTools/distroless

## Issues Found
- The post stated that every Docker image is an OCI manifest. Updated this to say modern Docker images are distributed as OCI or Docker v2 manifests, because registries and clients may use either media type.
- The image config bullet said OCI annotations live in the config object. Updated it to distinguish image config fields and manifest/index annotations.
- The Go multi-stage Dockerfile copied a potentially dynamically linked Alpine-built binary into `gcr.io/distroless/base`. Changed the example to build with `CGO_ENABLED=0` and use `gcr.io/distroless/static-debian12`, which is the appropriate distroless target for a static Go binary.
- The post said each Dockerfile instruction creates a layer. Updated this to clarify that filesystem-changing instructions create filesystem layers, while metadata instructions may appear in history without adding filesystem data.
- The post said `/var/lib/docker/overlay2` directories are identified by layer digest. Updated this to describe them as Docker-managed overlay layer and cache directories, since Docker's on-disk IDs do not necessarily correspond to image layer IDs or digests.
- The cgroup path was shown as a fixed `/sys/fs/cgroup/docker/<id>/` path and `pids.max = 4096` was presented as a default. Updated this to note that paths depend on cgroup version and driver, and that `pids.max` is written when a PID limit is configured.
- The post referenced `ctr cgroup`, which is not a current `ctr` command. Replaced it with `ctr --namespace moby task metrics <container>`, matching the later observability example and local `ctr` help.
- The networking section implied Docker directly uses custom CNI plugins and that Compose v2 hands networking to CNI. Updated this to Docker network drivers for Docker Engine and Kubernetes/containerd-based setups for CNI.
- The macvlan/ipvlan description said both provide real MAC addresses. Updated it to clarify that macvlan gives each container its own MAC address while ipvlan shares the parent interface MAC.
- The named volumes bullet listed `local`, `nfs`, and CSI as Docker volume plugins. Updated this to Docker's local driver, NFS options, and third-party volume plugins.

## Review Notes
The `crane manifest` example is syntactically plausible for go-containerregistry, but `crane` was not installed locally, so validation relied on the documented purpose of the tool and a successful `docker manifest inspect nginx:1.27` check instead. Docker daemon access was available for client-side manifest inspection and `docker info`; containerd daemon access was permission-limited, so `ctr` examples were validated with local CLI help rather than live execution.
