# How to Pull Private Build Images in Drone with `image_pull_secrets`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, CI/CD, Security, Troubleshooting

Description: Configure Docker-format registry credentials as Drone image pull secrets and verify private build images without confusing runner pulls with publishing credentials.

Drone must pull a step image before it can execute that step. A `docker login` command inside the same step therefore cannot fix an authentication failure while pulling its image.

For Docker pipelines, provide registry credentials through `image_pull_secrets`. The referenced secret contains Docker configuration JSON, not a password alone. [Drone private image configuration](https://docs.drone.io/pipeline/docker/syntax/images/)

## Prepare a read-only registry credential

Create a registry account or token with permission to pull the required build-image repository. Use a separate credential for publishing application images so compromise of a build-image credential does not grant write access unnecessarily.

The expected secret has this structure:

```json
{
  "auths": {
    "registry.example.com": {
      "auth": "BASE64_OF_USERNAME_COLON_TOKEN"
    }
  }
}
```

The value shown is a placeholder. Docker's `auth` representation is base64, not encryption. Include the registry's port in the key when the image reference uses a non-default port.

A desktop Docker configuration may instead refer to an operating-system credential helper. Copying that file into Drone does not copy the helper or its stored credentials. Prepare a dedicated configuration containing the actual registry authentication data required by the runner. Docker documents how credential stores differ from credentials kept in `config.json`. [Docker login and credential stores](https://docs.docker.com/reference/cli/docker/login/)

## Create the JSON outside the repository

This example uses Python's standard library and interactive prompts so a password is not written into shell history. Run it on an administrative workstation, not as an untrusted build step:

```bash
drone_auth_dir=$(mktemp -d)
chmod 700 "$drone_auth_dir"

python3 - "$drone_auth_dir/config.json" <<'PY'
import base64
import getpass
import json
import os
import sys

username = getpass.getpass("Registry username: ")
token = getpass.getpass("Registry token: ")
if not username or not token or ":" in username:
    raise SystemExit("A username without colons and a token are required")
encoded = base64.b64encode(f"{username}:{token}".encode()).decode()
config = {"auths": {"registry.example.com": {"auth": encoded}}}
fd = os.open(sys.argv[1], os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, "w") as output:
    json.dump(config, output)
PY
```

Change the registry hostname in the script to your actual registry. Do not print or commit the resulting file.

With an authenticated Drone CLI, create the repository secret directly from the file:

```bash
drone secret add \
  --name build_image_credentials \
  --data "@$drone_auth_dir/config.json" \
  acme/api

rm -rf "$drone_auth_dir"
unset drone_auth_dir
```

The `@` prefix instructs the CLI to read the secret from a file. If the secret already exists, use the corresponding update workflow instead. Ensure the temporary directory is removed even if the upload fails. [Drone secret creation](https://docs.drone.io/cli/secret/drone-secret-add/)

## Reference the secret at pipeline level

```yaml
kind: pipeline
type: docker
name: private-toolchain

image_pull_secrets:
  - build_image_credentials

steps:
  - name: compile
    image: registry.example.com/acme/build-toolchain:2026-09
    pull: always
    commands:
      - ./ci/compile.sh
```

The image and compile script are project-specific examples. Publish the build-toolchain image first, then replace its tag with an approved immutable digest if required by your release policy.

The list entries are **secret names**, not nested `from_secret` objects. `image_pull_secrets` is a peer of `steps`; putting it under `environment` or plugin `settings` does not supply pull credentials to the runner. This example uses Docker-pipeline syntax, not Kubernetes `imagePullSecrets` syntax. [Drone image pull syntax](https://docs.drone.io/pipeline/docker/syntax/images/)

## Verify the actual pull path

Run an allowed event with the secret available and check the runner's image-pull result. `pull: always` helps distinguish a valid authenticated pull from accidental success using a cached image. Check the exact registry hostname, image namespace, tag, and token permission if the pull fails.

Drone's Docker-image documentation warns that private images cached on a shared daemon can be usable by other pipelines without credentials. A successful cached run is therefore neither an authentication test nor proof of tenant isolation. Use dedicated runners or suitable isolation for sensitive private build images. [Drone image caching behavior](https://docs.drone.io/pipeline/docker/syntax/images/#image-caching-behavior)

Finally, test a controlled credential rotation. A new eligible build should still pull the image after the secret is updated. If the pipeline later fails while pushing an application image, configure the publishing tool's credentials separately; image pull secrets have already completed their job.
