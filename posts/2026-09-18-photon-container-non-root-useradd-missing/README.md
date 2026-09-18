# How to Create a Non-Root User in a Minimal Photon OS Container When useradd Is Missing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Docker, Security

Description: Create a non-root account in minimal Photon containers using the correct package, stable numeric identity, and explicit file ownership.

---

A minimal Photon container image can omit account-management tools even though it can run processes as a non-root UID. When a Dockerfile fails with `useradd: not found`, distinguish the missing build tool from the runtime identity you want. Installing the right package during the build is usually clearer than editing account databases with ad hoc shell commands.

## Confirm the image and missing command

Use the exact base image tag or digest from the failing build:

```bash
docker run --rm photon:5.0 sh -c \
  'cat /etc/os-release; command -v useradd; command -v groupadd'
```

This command can exit nonzero when a tool is absent; that is expected during diagnosis. If the image differs from the official Photon base or comes from an internal registry, inspect its build history and package inventory before assuming a standard layout.

Photon's [shadow package specification](https://github.com/vmware/photon/blob/5.0/SPECS/shadow/shadow.spec) supplies account-management programs including `useradd` and `groupadd`. Package splits and dependencies can change between revisions, so inspect what the matching repositories provide with `tdnf info shadow` and, after installation, `rpm -ql shadow`.

Do not use an `apt`, `apk`, or `useradd` installation command copied from a different container distribution. The package manager belongs to the image filesystem, not to the operating system running Docker.

## Build with an explicit UID and GID

Here is a minimal Dockerfile that creates a service identity and demonstrates its default user:

```dockerfile
FROM photon:5.0

RUN tdnf install -y shadow \
    && groupadd -g 10001 app \
    && useradd -u 10001 -g app -M -d /app -s /bin/false app \
    && mkdir -p /app /var/lib/app \
    && chown 10001:10001 /app /var/lib/app \
    && tdnf clean all

WORKDIR /app
USER 10001:10001
CMD ["id"]
```

For production, replace the moving base tag with an approved digest and install your actual application. The example chooses a deterministic UID and GID so filesystem permissions can be coordinated with deployment configuration. Check that they do not collide with existing image accounts or your organization's allocation policy.

`-M` avoids creating a home directory, while `/bin/false` prevents this account from being useful as an interactive login. Neither setting prevents Docker from directly executing the application's process. The image's `USER` instruction selects its default runtime identity, as described in the [Dockerfile reference](https://docs.docker.com/reference/dockerfile/#user).

Build and verify:

```bash
docker build -t photon-nonroot:test .
docker run --rm photon-nonroot:test
docker image inspect photon-nonroot:test --format '{{.Config.User}}'
```

Expect UID and GID `10001`, and an image user configuration of `10001:10001`. Do not claim success solely because the image built; confirm the runtime process uses the intended identity.

## Assign ownership where the application writes

When adding application files, distinguish read-only program content from writable runtime state. A binary can remain owned by root while the service user reads and executes it. Give the service account write access only to directories where the application actually stores data.

Docker supports `COPY --chown=10001:10001` when application-owned copied files are appropriate. Avoid broad recursive permission changes over the entire image. Test a real application operation that writes to its state directory and another that should fail against a protected path.

A bind mount replaces the image directory with a host filesystem view. Ownership established in the Dockerfile does not automatically fix the host directory's permissions. Docker's [bind-mount documentation](https://docs.docker.com/engine/storage/bind-mounts/) explains this relationship. Prepare host storage using the intended UID/GID mapping, and account for user namespaces if enabled.

## Know when a numeric-only user is enough

Docker can run a process under a numeric UID without a matching username entry. That can avoid installing account-management tools in very small images. However, applications that query the current username, home directory, or group membership may fail when the corresponding account information is missing.

Choose the numeric-only approach only after testing those application behaviors. A named service account is often easier to operate when the application expects normal user-database lookups.

## Test deployment overrides

Compose, Kubernetes, and `docker run --user` can override the image's default user. Inspect the effective deployment configuration, then verify the running process identity again. A correct Dockerfile does not prevent an operator from starting the container as root.

Finally run the application with its real volumes, configuration files, and restricted privileges. The acceptance criteria are that it starts, reads its configuration, writes only to intended locations, and retains a non-root identity throughout its normal lifecycle.
