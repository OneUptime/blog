# How to Write a Custom Drone Plugin and Map Settings to `PLUGIN_*` Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Docker, CI/CD, Automation, DevOps

Description: Build a small Drone checksum plugin, map settings to PLUGIN_* variables, and test its runtime contract independently.

A Drone plugin is a container image with an entrypoint that performs a task. Drone passes the step's `settings` as environment variables prefixed with `PLUGIN_`. The plugin owns their parsing, defaults, validation, and error behavior.

The [official plugin tutorial](https://docs.drone.io/plugins/tutorials/bash/) describes this mapping. A checksum plugin is a useful small example because its inputs and outputs are easy to test without a running Drone server.

## Define a small input contract

This plugin accepts one required setting, `file`, and calculates its SHA-256 digest. It reads the file from the mounted Drone workspace and writes the digest to stdout. It refuses a path outside that workspace, including a symlink that resolves outside it.

Save this as `plugin.py`:

```python
import hashlib
import os
import sys
from pathlib import Path


def main():
    workspace = Path(os.environ.get("DRONE_WORKSPACE", "/drone/src")).resolve()
    name = os.environ.get("PLUGIN_FILE", "")
    if not name:
        raise ValueError("setting 'file' is required")
    target = (workspace / name).resolve()
    if not target.is_relative_to(workspace) or not target.is_file():
        raise ValueError("file must be a regular file inside the workspace")
    digest = hashlib.sha256()
    with target.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    print(digest.hexdigest())


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print(f"checksum plugin: {error}", file=sys.stderr)
        sys.exit(1)
```

The standard-library [hashlib documentation](https://docs.python.org/3/library/hashlib.html) describes incremental digest updates. Reading in chunks keeps memory use bounded for large artifacts. The digest is an integrity identifier, not proof that the artifact is trustworthy or came from an approved build.

Package it with an entrypoint:

```dockerfile
FROM python:3.13-alpine
WORKDIR /drone/src
COPY plugin.py /usr/local/bin/plugin.py
USER 65532:65532
ENTRYPOINT ["python", "/usr/local/bin/plugin.py"]
```

Use a reviewed base-image digest in your release process. The non-root account needs read permission on the artifact and execute permission on its parent directories. Running as non-root is useful only when the mounted files and host configuration allow the intended access.

## Test the container before testing Drone

Create a disposable `fixtures` directory containing `hello.txt` with the three bytes `abc`. Build and run:

```sh
docker build -t local/drone-checksum:test .
docker run --rm \
  --mount type=bind,src="$PWD/fixtures",dst=/drone/src,readonly \
  -e PLUGIN_FILE=hello.txt \
  local/drone-checksum:test
```

The expected SHA-256 is:

```text
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
```

Test a missing setting, a missing file, a filename containing spaces, and `../outside.txt`. Errors should return a nonzero status. If you later support secrets, never add a startup dump of all `PLUGIN_*` variables to debug input parsing.

## Use the image from a pipeline

Publish the image to a registry the runner can read, then reference its immutable version or digest. Here the registry path is illustrative:

```yaml
kind: pipeline
type: docker
name: checksum-test

steps:
  - name: artifact
    image: alpine:3.22
    commands:
      - mkdir -p dist
      - printf abc > dist/hello.txt
  - name: checksum
    image: registry.example.com/ci/drone-checksum:1.0.0
    settings:
      file: dist/hello.txt
```

`file` becomes `PLUGIN_FILE`. A plugin can also receive a setting through `from_secret` when that input is actually sensitive. Prefer simple scalar settings for a first plugin; if adding arrays or structured values, define and test their serialization against the runner version rather than assuming arbitrary JSON encoding.

Do not add `commands` to the checksum step. Drone uses commands to build an execution script, which can override the image's intended entrypoint behavior. The [Docker plugin-step documentation](https://docs.drone.io/pipeline/docker/syntax/plugins/) shows the settings-based form.

## Make failure and output behavior predictable

Keep normal output small and documented so a later step or log processor can consume it. Send explanations to stderr and return a failure status when the promised artifact is absent. Do not silently checksum an empty string after a failed read.

A production checksum workflow may also need a manifest file or signed attestation. Add that as a deliberate output contract with tests for workspace permissions and reruns. Keep network publishing separate until the local plugin reliably handles its input files, path boundaries, and exit statuses.
