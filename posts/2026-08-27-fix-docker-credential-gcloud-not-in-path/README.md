# How to Fix `docker-credential-gcloud Not in System PATH` for Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Google Cloud, Artifact Registry, Docker, Gcloud, Authentication

Description: Restore Artifact Registry Docker authentication by making the gcloud credential helper visible to the process that runs Docker.

---

When Artifact Registry is configured to use the gcloud Docker credential helper, Docker reads an entry like this from its configuration:

```json
{
  "credHelpers": {
    "us-west1-docker.pkg.dev": "gcloud"
  }
}
```

The value `gcloud` tells Docker to execute a program named `docker-credential-gcloud`. If that executable is not visible in the `PATH` inherited by the Docker client process, Docker reports that the credential helper is not in the system path.

This is a local executable discovery failure. Changing repository IAM roles will not fix it.

## Confirm the failing execution context

Run these checks as the same operating-system user and through the same shell, CI runner, or desktop application that invokes `docker push`:

```bash
command -v docker
command -v gcloud
command -v docker-credential-gcloud
printf '%s\n' "${PATH}"
```

`docker` and `gcloud` should be runnable in that context. In particular, `docker-credential-gcloud` must resolve to an executable file on `PATH`; a shell alias or function is not sufficient because Docker launches the helper directly. A helper visible in an interactive terminal can still be missing from a CI service, IDE, GUI application, remote build process, or non-login shell because those processes receive a different `PATH`.

Also identify the Docker configuration used by that user and verify that Docker is reachable:

```bash
docker_config="${DOCKER_CONFIG:-${HOME}/.docker}/config.json"
printf 'Docker config: %s\n' "${docker_config}"
docker info >/dev/null
```

The Docker CLI reads `${HOME}/.docker/config.json` by default. `DOCKER_CONFIG` selects another configuration directory, and an explicit `docker --config DIR ...` option overrides both for that invocation. If one user configured the helper and another user runs Docker, they can use different configuration files and credential stores.

## Put the Cloud SDK binaries on PATH

Install or repair the Google Cloud CLI using Google's supported installation method for the operating system. The gcloud credential helper is distributed with the Google Cloud CLI. Then ensure the directory containing both `gcloud` and `docker-credential-gcloud` is added to the environment used by Docker.

Reopen the terminal or restart the service after changing its environment, then verify:

```bash
command -v gcloud
command -v docker-credential-gcloud
gcloud version
```

If `gcloud` resolves but `docker-credential-gcloud` does not, inspect how that Cloud SDK package was installed. Update or reinstall it with the same supported package manager rather than copying a helper from another machine or creating an untracked executable with that name.

If Docker itself was installed through Snap, changing `PATH` is not sufficient. The Docker snap does not provide an interface for credential helpers, so use a Docker installation that supports external credential helpers.

For CI, add the Cloud SDK binary directory to the job's `PATH` explicitly before invoking Docker. Do not assume a profile such as `.zshrc` or `.bashrc` is loaded by a non-interactive runner.

## Configure only the required Artifact Registry host

Once the helper is visible, configure the exact regional Artifact Registry hostname:

```bash
LOCATION='us-west1'
gcloud auth configure-docker "${LOCATION}-docker.pkg.dev"
```

The command updates Docker configuration with a credential-helper mapping. Limiting the command to the hosts you use keeps configuration smaller and avoids the performance cost of consulting helpers for unrelated registries.

Inspect the resulting mapping without printing credential material:

```bash
docker_config="${DOCKER_CONFIG:-${HOME}/.docker}/config.json"
jq '.credHelpers // {}' "${docker_config}"
```

This `jq` expression selects only the helper mapping. Avoid printing the complete Docker configuration because it can contain credentials for other registries.

The hostname in `credHelpers` must match the registry hostname in the image name. For example:

```text
us-west1-docker.pkg.dev/PROJECT_ID/REPOSITORY/IMAGE:TAG
```

Configuring `us-docker.pkg.dev` does not configure `us-west1-docker.pkg.dev`.

## Handle `sudo docker` carefully

On Linux, running `docker` with `sudo` changes both the effective user and often the `PATH`. Root normally reads `/root/.docker/config.json`, not the invoking user's Docker configuration. Google documents using the following when Docker is normally run with `sudo`:

```bash
sudo gcloud auth configure-docker us-west1-docker.pkg.dev
```

The root execution context must also be able to find the helper and obtain the intended credentials. Avoid alternating unpredictably between root and non-root Docker commands.

Running Docker without `sudo` can simplify configuration, but membership in the Docker group is effectively root-level access on a typical Docker Engine host. Follow the host's security policy rather than adding users casually.

## Consider the standalone helper

Artifact Registry also supports the standalone Docker credential helper, `docker-credential-gcr`. It uses Application Default Credentials and is faster than the gcloud helper. Install and configure it with the official Artifact Registry instructions when that credential model suits the environment:

```bash
docker-credential-gcr configure-docker \
  --registries=us-west1-docker.pkg.dev
```

Do not merely change the Docker configuration value from `gcloud` to `gcr`. Docker constructs an executable name from the configured value, and the standalone helper must actually be installed and configured.

## Separate authentication from authorization

After the path error is fixed, a push can still fail with `403 Forbidden`. The helper only supplies credentials. The resulting principal also needs Artifact Registry permissions, commonly `roles/artifactregistry.writer` on the target repository for a push.

Likewise, a correct IAM grant cannot compensate for a missing local helper. Diagnose failures in this order:

1. Docker can execute the configured helper.
2. The helper can obtain credentials for the intended principal.
3. The image hostname and repository path are correct.
4. The principal has permission on that repository.

Do not store an access token directly in `config.json` as a permanent workaround. Access tokens are short-lived, and service account keys are a higher-risk alternative that should be avoided when a helper or workload identity is available.

## Official Documentation

- [Authenticate to Artifact Registry for Docker](https://cloud.google.com/artifact-registry/docs/docker/authentication)
- [Artifact Registry Docker image names](https://cloud.google.com/artifact-registry/docs/docker/names)
- [Push and pull Docker images](https://cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling)
- [Install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install)

## Conclusion

The `docker-credential-gcloud` path error means Docker cannot launch the helper named in its configuration. Make the Cloud SDK helper visible to the exact user and process that runs Docker, then configure the exact Artifact Registry hostname. Only after helper execution works should you troubleshoot identity and repository IAM.
