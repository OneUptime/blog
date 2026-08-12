# How to Reproduce a Woodpecker Failure Locally with `woodpecker-cli exec`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, woodpecker-cli, Local Debugging, CI/CD, Troubleshooting

Description: Reproduce a Woodpecker workflow locally with matching code, metadata, backend, secrets, and runtime inputs while understanding the limits of local execution.

---

Re-running a failing Woodpecker pipeline by repeatedly pushing commits is slow and changes several variables at once. `woodpecker-cli exec` runs a workflow from a local checkout, so it can shorten the loop to seconds. A useful reproduction, however, needs more than the same YAML file. It needs the same revision, event metadata, backend, environment, secrets, architecture, and external dependencies-or an explicit record of every difference.

This guide uses Woodpecker 3.17 behavior. Keep the CLI aligned with the server version, especially when replaying downloaded metadata.

## Know What Local Execution Can Prove

A local run is well suited to finding:

- shell and application command failures;
- missing tools in a step image;
- incorrect working directories and file paths;
- service-container startup or network problems;
- workflow parsing and conditional-execution mistakes;
- secret or environment-variable names that were wired incorrectly;
- Docker volume, platform, and image differences available on the test host.

It does not reproduce the Woodpecker server receiving a forge webhook, the scheduler selecting an agent, repository approval rules, an agent's labels or capacity, or Kubernetes admission and cluster policy unless the matching Kubernetes backend is deliberately configured. If no local container ever starts while the hosted workflow is pending, the problem may be upstream of the workflow commands.

## 1. Match the CLI and Failing Revision

Check the installed binary and use the release that corresponds to the server:

~~~bash
woodpecker-cli --version
git status --short
git rev-parse HEAD
~~~

The official releases publish `woodpecker-cli`, and the distribution-package documentation provides DEB and RPM packages. Avoid using an old CLI against 3.x syntax or a development CLI against a stable server's metadata.

Run from the repository checkout or pass `--repo-path`. For a faithful reproduction, check out the failing commit in a clean, disposable worktree so uncommitted local files cannot make the test pass accidentally:

~~~bash
git fetch --all --tags
git worktree add --detach ../woodpecker-repro <failing-commit-sha>
cd ../woodpecker-repro
git status --short
~~~

Compare the SHA with the pipeline page. A local run from the tip of `main` does not reproduce an older pull-request commit.

## 2. Run the Exact Workflow with the Docker Backend

From the clean checkout, choose the workflow file explicitly:

~~~bash
woodpecker-cli exec --backend-engine docker .woodpecker/test.yaml
~~~

You can pass a directory to execute every `.yaml` and `.yml` file recursively beneath it:

~~~bash
woodpecker-cli exec --backend-engine docker .woodpecker/
~~~

For diagnosis, start with one file. Running the directory can introduce unrelated workflow failures and additional activity.

The Docker backend needs access to a Docker daemon. Confirm the same user can use it before blaming Woodpecker:

~~~bash
docker version
docker info --format '{{.OSType}}/{{.Architecture}}'
woodpecker-cli --log-level debug exec \
  --backend-engine docker \
  .woodpecker/test.yaml
~~~

Docker is normally the closest local match for a Docker-backed Woodpecker agent because each step still runs in its declared image. Selecting `--backend-engine local` runs commands directly on the host and does not recreate the image environment. The local backend also has no container isolation; use it only for trusted code. For command steps in local-backend workflows, the `image` value identifies the shell; for plugin steps, it identifies the executable. If a clone step is enabled, `git` must be in `PATH`. The backend reuses a `plugin-git` binary from `PATH` when available and otherwise downloads the latest release asset matching the host OS and architecture, so offline use should preinstall it.

## 3. Reproduce Event and Branch Metadata

Without overrides, `exec` uses synthetic defaults, including the `manual` pipeline event and `main` as the commit branch. Those defaults can skip the exact `when` condition you are trying to debug.

For a push to `main`, provide the important fields explicitly:

~~~bash
woodpecker-cli exec \
  --backend-engine docker \
  --pipeline-event push \
  --commit-branch main \
  --commit-ref refs/heads/main \
  --commit-sha "$(git rev-parse HEAD)" \
  --repo-default-branch main \
  .woodpecker/test.yaml
~~~

For path filters, also describe the changed files:

~~~bash
woodpecker-cli exec \
  --backend-engine docker \
  --pipeline-event pull_request \
  --commit-branch main \
  --commit-ref refs/pull/42/head \
  --commit-sha "$(git rev-parse HEAD)" \
  --pipeline-changed-files 'src/api/server.go,go.mod,go.sum' \
  .woodpecker/test.yaml
~~~

For pull requests, Woodpecker's branch condition refers to the target branch. Avoid guessing the full PR metadata when the real values are available.

Woodpecker 3.17.0 exposes a `--repo` flag, but this release does not apply it to the pipeline metadata used by `exec`. If repository identity or a `repo` condition matters, use downloaded metadata as described in the next section; `--repo` cannot override it in 3.17.0.

## 4. Replay Downloaded Pipeline Metadata

Woodpecker can export pipeline metadata from the web interface. Download it from the failing pipeline and replay it:

~~~bash
woodpecker-cli exec \
  --backend-engine docker \
  --metadata-file ./pipeline-metadata.json \
  .woodpecker/test.yaml
~~~

Individual flags can override values in the file. That is useful for a controlled comparison:

~~~bash
woodpecker-cli exec \
  --backend-engine docker \
  --metadata-file ./pipeline-metadata.json \
  --commit-branch main \
  .woodpecker/test.yaml
~~~

The metadata file is not a stable interchange format. Woodpecker's 3.17 documentation guarantees it only for the same server and CLI version it came from. Re-download it after an upgrade rather than storing it as a permanent fixture. It may also contain repository and user context, so inspect it before sharing and keep it out of Git.

`exec` does not preserve platform metadata from the file: it uses `--system-platform` when set and otherwise uses the CLI host's OS and architecture. If a platform condition or `CI_SYSTEM_PLATFORM` matters, pass the hosted agent's value explicitly. This changes metadata only; it does not emulate that platform.

Metadata is especially useful for cron and complex pull-request failures because not every metadata field has a convenient command-line flag.

## 5. Supply Environment Variables and Secrets Safely

Regular variables can be passed with `--env`:

~~~bash
woodpecker-cli exec \
  --backend-engine docker \
  --env GOFLAGS=-mod=readonly \
  --env APP_ENV=test \
  .woodpecker/test.yaml
~~~

Server-stored secrets are not downloaded automatically. For a single value, the CLI supports `--secrets`. For repeated work, use a local YAML file that is ignored by Git. Keep it outside `.woodpecker/`, because a directory invocation recursively treats every `.yaml` and `.yml` file there as a workflow:

~~~yaml
# .woodpecker-local-secrets.yaml
registry_username: local-debug-user
registry_password: replace-with-a-temporary-token
~~~

~~~bash
chmod 600 .woodpecker-local-secrets.yaml
printf '%s\n' '.woodpecker-local-secrets.yaml' >> "$(git rev-parse --git-path info/exclude)"

woodpecker-cli exec \
  --backend-engine docker \
  --secrets-file .woodpecker-local-secrets.yaml \
  .woodpecker/test.yaml
~~~

Use a short-lived, least-privileged test credential where possible. Do not paste production tokens into terminal history, commit them, or upload them with a bug report. A failure caused by a secret's event or plugin-image restrictions may not reproduce locally because the local file bypasses the server-side eligibility decision. Record that difference.

## 6. Match Volumes, Networks, Privileged Plugins, and Platform

A workflow that depends on an agent-mounted volume or existing Docker network needs the same local inputs:

~~~bash
woodpecker-cli exec \
  --backend-engine docker \
  --volumes /tmp/repro-cache:/cache \
  --network integration-test \
  .woodpecker/integration.yaml
~~~

Review every mount before running untrusted pipeline code. A writable host mount gives the step access to host data.

Downloaded metadata does not authorize trust-gated YAML fields. If the production repository is trusted, pass only the corresponding local flags: `--repo-trusted-security` for `privileged`, `--repo-trusted-network` for custom DNS, hosts, or network mode, and `--repo-trusted-volumes` for volumes, devices, or `tmpfs`.

Privileged plugins are not silently enabled. The CLI provides `--plugins-privileged` to mirror the administrator's allowlist. Mirror the production entry exactly, and grant a tagged image only when the production Woodpecker instance is configured to grant it:

~~~bash
woodpecker-cli exec \
  --backend-engine docker \
  --plugins-privileged woodpeckerci/plugin-docker-buildx:6.1.1 \
  .woodpecker/build-image.yaml
~~~

Also compare `docker info`, CPU architecture, kernel, DNS, proxy variables, certificate mounts, and Docker Engine version. An `amd64` laptop cannot faithfully reproduce an `arm64` native binary failure merely by using the same YAML.

## 7. Reduce the Failure Without Changing Its Boundary

Once the full run fails locally, reduce it systematically:

1. Save the original command, revision, CLI version, Docker version, and output.
2. Select only the failing workflow file.
3. Keep the same step image digest, metadata, and backend.
4. Remove unrelated later steps.
5. Replace secrets with temporary test credentials, preserving their names.
6. Add diagnostics such as `pwd`, `id`, `env | cut -d= -f1 | sort`, tool versions, and directory listings, but never print secret values.
7. Change one input at a time and record the first passing run.

If the original pipeline fails only on Woodpecker, compare the two environments rather than declaring the bug unreproducible. Check for server extensions, injected global environment, agent default volumes, trusted-repository settings, network policy, and external service reachability.

## A Compact Reproduction Command

For a typical push failure, this is a useful starting template:

~~~bash
woodpecker-cli --log-level debug exec \
  --backend-engine docker \
  --metadata-file ./pipeline-metadata.json \
  --secrets-file .woodpecker-local-secrets.yaml \
  --commit-sha "$(git rev-parse HEAD)" \
  --timeout 20m \
  .woodpecker/test.yaml
~~~

Before sharing it, replace secrets and private URLs, but retain image tags, relevant metadata fields, exit codes, and the smallest failing YAML.

## Official Documentation

- [Woodpecker local pipeline execution](https://woodpecker-ci.org/docs/usage/local-execution)
- [Woodpecker CLI reference](https://woodpecker-ci.org/docs/cli#exec)
- [Woodpecker workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker secrets](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker Docker backend](https://woodpecker-ci.org/docs/administration/configuration/backends/docker)
- [Woodpecker supported platforms](https://woodpecker-ci.org/docs/administration/installation/supported-platforms)
- [Woodpecker 3.17.0 release](https://github.com/woodpecker-ci/woodpecker/releases/tag/v3.17.0)

## Conclusion

`woodpecker-cli exec` is most valuable when it is treated as a controlled replay, not merely a way to run YAML. Match the failed commit, CLI release, event metadata, Docker backend, secrets, volumes, networks, and platform. When the failure reproduces, minimize it one variable at a time. When it does not, the documented differences point toward the server, scheduler, agent policy, or cluster rather than the workflow command itself.
