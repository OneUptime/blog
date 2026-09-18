# Fix Invalid Variable Names in Buildkite Docker Compose Cache Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Docker Compose, Bash, CI/CD, Troubleshooting

Description: Separate Docker Compose cache specifications from shell variable names and correct Buildkite plugin cache configuration.

---

An `invalid variable name` error during Docker Compose caching is often raised by Bash before Docker starts building. It is different from a registry rejecting an image name or BuildKit reporting a cache miss.

Identify the interpreter and the exact value it treated as a variable name. Then correct the boundary between pipeline configuration, plugin environment variables, and Docker cache specifications.

## Read the first useful error

Find the earliest failure in the plugin log, including its script path and line number. A message from a Bash helper using indirect expansion points to configuration interpretation. An error from `docker compose config` points to the Compose document. A registry authentication failure happens later still.

Record the pinned Docker Compose plugin version, agent version, Bash version, and Compose version. A failure that started with a plugin upgrade may require comparing that release's schema and helper implementation rather than editing a working Dockerfile.

The official [Docker Compose plugin repository](https://github.com/buildkite-plugins/docker-compose-buildkite-plugin) is the source for its supported configuration and hook code. Do not infer plugin options from similarly named Docker CLI flags.

## Use the plugin's service-prefixed format

A minimal pipeline example is:

```yaml
steps:
  - label: "Build application image"
    plugins:
      - docker-compose#v5.12.1:
          config: docker-compose.yml
          build: app
          buildkit: true
          buildkit-inline-cache: true
          cache-from:
            - "app:registry.example.com/team/app:cache"
```

This assumes `docker-compose.yml` contains a service named `app`, registry authentication is already configured, and that cache image is intended for this build. The cache string begins with the Compose service, followed by the cache specification. It is not the name of an environment variable.

The corresponding Compose file can begin:

```yaml
services:
  app:
    image: registry.example.com/team/app:development
    build:
      context: .
```

The plugin key is `cache-from` with a hyphen. Inside a Compose build definition, the key is `cache_from` with an underscore. Keep each spelling in its own schema.

## Recognize accidental indirection

Bash indirect expansion expects a variable name:

```bash
CACHE_IMAGE=registry.example.com/team/app:cache
variable_name=CACHE_IMAGE
printf '%s\n' "${!variable_name}"
```

Here the indirection is intentional: `variable_name` contains `CACHE_IMAGE`, which is a valid identifier. By contrast, putting the image reference itself in `variable_name` asks Bash to look up something containing slashes and colons as a variable name.

This is a common class of wrapper error, not proof that every cache failure has this cause. If your log names a plugin helper, compare the helper's expected argument with the actual generated configuration. Remove unintended `${!...}` expansion in your own wrapper; do not rename a valid image reference merely to make it look like a shell variable.

The [Bash parameter expansion manual](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html) documents the distinction between a value and indirect lookup.

## Inspect configuration shapes

Keep `cache-from` as the string or array format supported by the pinned plugin. A YAML map copied from another caching tool is not interchangeable with a list of service-prefixed strings.

For example, this is a different shape and should not be assumed valid for the plugin:

```yaml
cache-from:
  app:
    image: registry.example.com/team/app:cache
```

Use a YAML parser to inspect the generated document and the plugin's schema to check types. Avoid manually creating `BUILDKITE_PLUGIN_DOCKER_COMPOSE_*` environment variables as a substitute for the plugin configuration; Buildkite translates the configured fields for the plugin itself.

If a generator constructs the cache reference, validate its result as data and serialize YAML or JSON normally. Do not run `eval` on a cache string to make embedded expressions resolve.

## Choose the expansion phase

A variable in uploaded pipeline YAML may expand during `pipeline upload`, while variables in a repository Compose file are processed later by Compose. Single quotes in YAML do not disable Buildkite's interpolation.

Prefer a literal known cache reference while diagnosing the problem. Once that works, introduce a simple exported variable at the phase that needs it. If the plugin needs a fully formed cache specification at upload time, calculate it in the uploader. Do not assume every plugin option performs a second runtime expansion of escaped dollar variables.

Docker's [Compose build specification](https://docs.docker.com/reference/compose-file/build/) documents `cache_from` and `cache_to`. Those fields describe cache storage, not arbitrary shell programs.

## Verify one boundary at a time

First parse the pipeline YAML. Then render the Compose configuration with nonsecret test values:

```bash
docker compose -f docker-compose.yml config --quiet
```

Run a build with one literal cache source. A missing cache can make the first build cold, while a malformed configuration should fail distinctly. After a successful build, push or export cache through your intended workflow and repeat to observe reuse.

Restore dynamic branch or platform selection only after the literal case works. The durable fix is a correctly typed cache specification passed through the intended expansion phase, with no image reference accidentally interpreted as a Bash variable name.
