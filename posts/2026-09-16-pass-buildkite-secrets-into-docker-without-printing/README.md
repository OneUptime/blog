# How to Pass Buildkite Secrets into Docker Steps Without Printing Them

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Docker, Security, CI/CD, Bash

Description: Retrieve Buildkite secrets at job runtime and pass only selected environment variable names into Docker containers.

---

A secret available to a Buildkite hook is not automatically available inside a Docker container. The unsafe workaround is to interpolate its value directly into pipeline YAML or a `docker run` command that is printed in the log.

Keep the secret in the job environment and pass its variable name to Docker. Retrieve it before the container starts, limit which variables cross that boundary, and verify presence without printing the value.

## Retrieve the secret before the command phase

Assume the secret `integration_api_token` exists in Buildkite Secrets and its access policy permits the current test job. Native secret keys must start with a letter, contain only letters, digits, and underscores, be at most 255 characters long, and not start with `buildkite` or `bk` (case-insensitive); see the [secret key requirements](https://buildkite.com/docs/apis/rest-api/clusters/secrets). On a self-hosted Linux agent, a repository `pre-command` hook can retrieve it:

```bash
#!/usr/bin/env bash
set -euo pipefail
set +x

INTEGRATION_API_TOKEN=$(buildkite-agent secret get integration_api_token)
export INTEGRATION_API_TOKEN
[[ -n "$INTEGRATION_API_TOKEN" ]] || {
  echo 'Required integration token is empty' >&2
  exit 1
}
```

Save the hook as `.buildkite/hooks/pre-command` and make it executable. Shell hooks can export values into subsequent job phases. The [hook lifecycle](https://buildkite.com/docs/agent/hooks) documents the ordering that makes this available before the Docker plugin's command hook launches the container.

Only use a repository hook this way for code trusted to receive the secret. Access policies and queue isolation must enforce that trust outside a contributor-controlled script. A malicious test can read any credential intentionally given to it.

## Pass names through the Docker plugin

Configure the Docker plugin to pass the selected variable:

```yaml
steps:
  - label: "API integration tests"
    command: "./scripts/api-tests.sh"
    plugins:
      - docker#v5.14.0:
          image: "python:3.13-slim"
          environment:
            - INTEGRATION_API_TOKEN
          propagate-environment: false
```

This example assumes the repository script and required test dependencies are available in the container. Pin the image by digest in your production configuration if reproducible image content is required.

The plugin's [environment option](https://github.com/buildkite-plugins/docker-buildkite-plugin) supports bare names as well as `KEY=value` entries. Bare names obtain the value from the outer environment without embedding it in the pipeline definition.

`propagate-environment: true` is not a substitute for this list. Its documented source is the pipeline environment recorded in `BUILDKITE_ENV_FILE`; it does not automatically include all exports from preceding hooks. An explicit list is both clearer and more selective.

## Avoid upload-time interpolation

Do not write a plugin entry such as `INTEGRATION_API_TOKEN=${INTEGRATION_API_TOKEN}` into dynamically uploaded YAML. The upload process may expand it before the test job runs, storing the secret in configuration or triggering secret-upload protections.

Likewise, putting the secret value in a command string can expose it when commands are logged or inspected. Disabling shell tracing in the retrieval hook helps, but does not make arbitrary command interpolation safe.

The [pipeline upload reference](https://buildkite.com/docs/agent/cli/reference/pipeline) explains interpolation. Passing only a name avoids the need to juggle escaped dollar signs for the credential itself.

## Use the same pattern without a plugin

For a controlled script that directly invokes Docker:

```bash
#!/usr/bin/env bash
set -euo pipefail
set +x

INTEGRATION_API_TOKEN=$(buildkite-agent secret get integration_api_token)
export INTEGRATION_API_TOKEN
[[ -n "$INTEGRATION_API_TOKEN" ]] || exit 1

docker run --rm \
  --env INTEGRATION_API_TOKEN \
  --mount "type=bind,src=$PWD,dst=/work" \
  --workdir /work \
  python:3.13-slim \
  ./scripts/api-tests.sh
```

The command line contains the variable name, while Docker reads its value from the invoking environment. The application still receives a secret in its container environment, so users with Docker daemon access or sufficient container inspection privileges may be able to inspect it. The goal here is avoiding accidental log and configuration exposure, not hiding credentials from the machine administrator.

For image builds, use BuildKit secret mounts instead of build arguments or Dockerfile `ENV` instructions. Runtime container environment and build-time image layers have different lifetimes and leakage paths.

## Verify the boundary without revealing data

Inside the test runner, check only whether the credential exists:

```bash
if [[ -z "${INTEGRATION_API_TOKEN:-}" ]]; then
  echo 'Integration credential is missing' >&2
  exit 1
fi
```

Do not print its prefix, suffix, checksum, or length as a routine diagnostic. An existence check plus a narrowly scoped authenticated test is usually enough. Avoid `env`, `set`, verbose HTTP request logging, and shell tracing around credential-consuming commands.

Buildkite automatically redacts some sensitive values, including secrets fetched through `secret get`; the [redactor reference](https://buildkite.com/docs/agent/cli/reference/redactor) describes this behavior. Treat redaction as additional protection because transformed or application-formatted output may not match the original value.

## Check failure paths too

Test a job denied access to the secret and a missing secret. You can also mock an empty command result to exercise the shell guard; Buildkite Secrets does not permit blank stored values. Each should fail before the container performs authenticated work. Inspect the stored YAML and logs for the harmless test credential used in a staging trial.

Finally, confirm that an untrusted fork job cannot request the secret at all. A clean log is useful, but the stronger boundary is limiting which jobs and containers receive credentials in the first place.
