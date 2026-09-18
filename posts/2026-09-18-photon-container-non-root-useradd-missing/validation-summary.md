# Validation Summary: How to Create a Non-Root User in a Minimal Photon OS Container When useradd Is Missing

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Photon OS 5.0 container images
- Docker, Dockerfile instructions, and Docker Compose
- tdnf and RPM package management
- Shadow account-management tools (`useradd` and `groupadd`)
- Linux user/group identities, file ownership, and user namespaces
- Kubernetes security contexts

## Sources Consulted
- [Photon 5.0 shadow package specification](https://github.com/vmware/photon/blob/5.0/SPECS/shadow/shadow.spec): package contents and dependencies.
- [Photon 5.0 tdnf commands](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/): installation, package information, and cache cleanup.
- [Photon administration guide: package command options](https://vmware.github.io/photon/assets/files/html/1.0-2.0/photon-admin-guide.html): `-y` / `--assumeyes`.
- [RPM manual](https://rpm.org/docs/4.20.x/man/rpm.8): installed-package queries and file listings.
- [Shadow 4.13 useradd manual](https://raw.githubusercontent.com/shadow-maint/shadow/4.13/man/useradd.8.xml): `-u`, `-g`, `-M`, `-d`, and `-s`.
- [Shadow 4.13 groupadd manual](https://raw.githubusercontent.com/shadow-maint/shadow/4.13/man/groupadd.8.xml): explicit GID selection and uniqueness requirements.
- [Docker official-image metadata for Photon](https://raw.githubusercontent.com/docker-library/official-images/master/library/photon): official image tags and architectures.
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/): `FROM`, `RUN`, `WORKDIR`, `USER`, exec-form `CMD`, and numeric `COPY --chown`.
- [Docker container runtime reference](https://docs.docker.com/engine/containers/run/): numeric identities, runtime user overrides, and command execution.
- [Docker image inspect reference](https://docs.docker.com/reference/cli/docker/image/inspect/): formatted inspection output.
- [Docker bind mounts](https://docs.docker.com/engine/storage/bind-mounts/): host-backed mounts obscure image content at the target path.
- [Docker user namespace remapping](https://docs.docker.com/engine/security/userns-remap/): host UID/GID mappings and bind-mount permissions.
- [Compose service user](https://docs.docker.com/reference/compose-file/services/#user): overriding the image user.
- [Kubernetes security contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/): `runAsUser` and `runAsGroup` settings.
- [GNU C Library user/group documentation source](https://raw.githubusercontent.com/bminor/glibc/master/manual/users.texi): numeric process credentials and account database lookups.
- [Author profile](https://github.com/nawazdhandala): verified the author link resolves.

## Issues Found
- The package-inspection advice presented `rpm -ql shadow` without noting that the RPM CLI may be absent. The tested official Photon 5.0 image still reported `rpm: command not found` after installing `shadow`. Qualified the command to require an available RPM CLI and explained that `tdnf` can be present without it. The RPM documentation confirms the query syntax; the failure was a missing executable, not an invalid query.

## Review Notes
- The README received only the RPM CLI availability correction. The Dockerfile and other commands agree with official documentation; no deprecated options were identified.
- Photon 5.0's shadow specification explicitly provides `useradd` and `groupadd`. Installing `shadow` also resolves its declared dependencies; it is not necessary to guess a package name from another distribution.
- `-M` suppresses home creation by `useradd`; the later `mkdir` deliberately creates `/app`. The configured login shell does not govern Docker's direct execution of `CMD`.
- Explicit UID/GID values and directory ownership support the demonstrated non-root identity. An application still needs suitable read/execute permission on its program files and write permission on its state directories.
- Numeric-only identities are valid for Linux containers, but applications using account database lookups require separate compatibility checks.
- The diagnostic shell command returns the status of its final `command -v groupadd`; its exit code alone is not a combined check of both commands. The post correctly says it can exit nonzero and shows both lookups.
- The `photon:5.0` tag and repository packages are mutable. The post appropriately recommends an approved digest and deployment-specific permission tests.
- Bind-mount ownership and deployment user overrides were verified against Docker and Kubernetes documentation. No Compose or Kubernetes deployment was executed, and no application-specific lifecycle test is possible because the example intentionally runs `id`.
- Executed the original diagnostic command against the official ARM64 image: `/etc/os-release` identified Photon 5.0, both command lookups were empty, and the command exited 1 as expected.
- Built the exact Dockerfile successfully on Docker Engine 29.4.3 / Linux ARM64, using the test tag `photon-nonroot:validation-20260918`. The base resolved to `photon:5.0@sha256:ab4b68e15c8ff6b9c79ba525f696260f772c711761d576dd53bf43c351c9a504`; installation selected shadow 4.13-14.ph5.
- Confirmed numeric-only execution separately: `/proc/self/status` showed UID and GID 10001 without an account entry. The base image's `id` command returned `id: bad uid 10001`, illustrating the documented lookup caveat rather than a failure to run under that UID.
- The built image returned `uid=10001(app) gid=10001(app) groups=10001(app)`, and formatted image inspection returned `10001:10001`. A runtime check successfully created a file under `/var/lib/app` and received permission denied under `/etc`. Both application directories were owned by `app:app`; the account entry had home `/app` and shell `/bin/false`.
