# Drone Secrets Are Empty: Fix `from_secret`, Target Names, and Repository or Organization Scope

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Security, Troubleshooting, YAML

Description: Trace empty Drone secrets through stored secret names, environment and plugin targets, repository ownership, pull-request policy, and local execution.

An empty credential in a Drone step often comes from a naming or scope mismatch rather than a failed secret store. There are several names involved: the stored secret, the environment variable your application reads, and, for a plugin, its setting name.

Trace those names explicitly before recreating credentials. This guide uses Drone's current `from_secret` syntax for Docker pipelines.

## Connect the stored name to the consumer

Suppose the repository has a secret named `package_read_token`, while the application expects `PACKAGE_TOKEN`:

```yaml
kind: pipeline
type: docker
name: check-secret

trigger:
  event: [push]

steps:
  - name: check-presence
    image: alpine:3
    environment:
      PACKAGE_TOKEN:
        from_secret: package_read_token
    commands:
      - |
        set +x
        if [ -z "$${PACKAGE_TOKEN:-}" ]; then
          echo "PACKAGE_TOKEN is unavailable" >&2
          exit 1
        fi
        echo "PACKAGE_TOKEN is available"
```

`package_read_token` is the source lookup. `PACKAGE_TOKEN` is the target variable. The names do not need to match, but their spelling and case must match the store and consumer respectively. An environment mapping belongs to the step that needs it. [Drone repository secrets](https://docs.drone.io/secret/repository/)

The diagnostic disables shell tracing before testing the value and prints only presence. Do not print the token, its prefix, or a full `env` dump. Masking is a secondary protection, not a reason to deliberately emit credentials.

The doubled dollar sign in `$${PACKAGE_TOKEN:-}` preserves the shell expression through Drone's preprocessing. Drone evaluates substitutions before parsing YAML; runtime values should be expanded by the step's shell. [Drone substitution and escaping](https://docs.drone.io/pipeline/environment/substitution/)

## Use plugin setting names for plugins

A plugin usually expects its documented settings rather than arbitrary application variable names. For example:

```yaml
steps:
  - name: publish
    image: plugins/docker
    settings:
      registry: registry.example.com
      repo: registry.example.com/acme/api
      username:
        from_secret: registry_writer_name
      password:
        from_secret: registry_writer_token
```

Here `password` is the plugin's target setting. A secret named `registry_writer_token` does not automatically appear as an environment variable with that name. Similarly, setting `PACKAGE_TOKEN` would not configure this plugin's password. Consult the plugin's contract, and pin an approved plugin image for production. [Docker plugin settings](https://plugins.drone.io/plugins/docker)

Avoid adding `commands` to a plugin step just to inspect its environment: Drone commands replace the image entrypoint, which can prevent the actual plugin from running. Use a separate minimal diagnostic step when necessary. [Drone step command behavior](https://docs.drone.io/pipeline/docker/syntax/steps/)

## Confirm which repository owns the build

Inspect the build's full repository name and compare it with the repository where the secret was created. A fork, renamed repository, or similarly named project in another organization is a different lookup context.

Check the stored names using the UI or an authenticated CLI:

```bash
drone secret ls acme/api
```

Review names and policy, not values. If the pipeline uses an organization secret, confirm the repository belongs to that organization. Drone documents organization secrets as a self-hosted feature administered by system administrators. An organization secret is referenced with the same `from_secret` form; the YAML does not take an `organization/name` path. [Drone organization secrets](https://docs.drone.io/secret/organization/)

During diagnosis, use an unambiguous test-secret name rather than creating identically named secrets in several scopes and guessing which value won. If a secret extension is involved, also inspect that extension's repository and event policy and its own lookup identifiers. [Drone external secret protocol](https://docs.drone.io/extensions/secret/)

## Check the event and execution environment

Drone does not expose repository secrets to pull requests by default. A token available on a push but absent on a pull request can therefore indicate policy working as intended. Keep release credentials out of untrusted PR workloads; make the PR pipeline operate without them or use a separate controlled workflow. [Repository secret event policy](https://docs.drone.io/secret/repository/#pull-requests)

Local `drone exec` is another separate environment. It cannot retrieve the server's repository and organization secrets. Supply a local secret file explicitly when reproducing a problem, keep it outside version control, and use non-production credentials. [Drone local execution](https://docs.drone.io/quickstart/cli/)

Once presence checks pass, test a harmless authenticated operation against the intended service. A nonempty token can still be expired, malformed, or missing permission. Treat that result as a service-authentication issue instead of broadening Drone secret access until the error disappears.
