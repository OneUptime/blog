# Validation Summary: How to Set Up Concourse CI on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Concourse CI (web + worker + TSA + fly CLI)
- Docker / Docker Compose
- PostgreSQL (as Concourse state store)
- Nginx (reverse proxy)
- Let's Encrypt / Certbot
- OpenSSL / ssh-keygen (key generation)
- concourse/oci-build-task (OCI image builds)
- Pipeline YAML (resources, jobs, tasks, `passed` constraints, `((variable))` substitution)
- Ubuntu

## Sources Consulted
- Concourse Jobs schema: https://concourse-ci.org/docs/jobs/
- Concourse fly CLI docs: https://concourse-ci.org/docs/fly/
- Concourse web installation: https://concourse-ci.org/docs/install/running-web/
- Concourse worker installation: https://concourse-ci.org/docs/install/running-worker/
- concourse/oci-build-task README: https://github.com/concourse/oci-build-task
- Concourse containerd runtime: https://github.com/concourse/concourse/issues/9266
- Archived ATC repo (now folded into concourse/concourse): https://github.com/concourse/atc

## Issues Found

1. **Invalid `depends_on` field on a job (full pipeline example).** The `build-and-push` job had `depends_on: [test]`. Concourse has no job-level `depends_on` field — dependencies are expressed via `passed: [job]` on a `get` step inside the consuming job's plan, which the example already does correctly on the next line. Removed the spurious `depends_on:` line.

2. **Broken `curl` command for downloading fly.** The original line was:
   ```
   curl -O https://ci.example.com/api/v1/cli?arch=amd64&platform=linux -o fly
   ```
   Two problems: (a) the unquoted `&` causes the shell to background the first half of the command; (b) `-O` (uppercase, derive filename from URL) conflicts with `-o fly` (write to a file named `fly`). Fixed to:
   ```
   curl -L "https://ci.example.com/api/v1/cli?arch=amd64&platform=linux" -o fly
   ```

3. **Contradictory input mapping for `oci-build-task`.** The build task had:
   ```yaml
   inputs:
     - name: source-repo
       path: .
   params:
     CONTEXT: source-repo
   ```
   With `path: .`, the source-repo contents are placed at the working-directory root, so the `source-repo` directory referenced by `CONTEXT` does not exist at runtime — the build would fail to find the Dockerfile. Removed the `path: .` line so the input is mounted at `./source-repo`, which matches the `CONTEXT: source-repo` param. (The other documented alternative — keeping `path: .` and dropping the `CONTEXT` param so it defaults to `.` — would also work, but the smaller edit preserves the author's clearly intended `CONTEXT` value.)

4. **Outdated "Web (ATC)" terminology.** The architecture section labeled the web component as "Web (ATC)." ATC was an internal sub-binary that was merged into the unified `concourse` binary in 2018; current Concourse docs only refer to the "web node" and treat TSA as a service within it. Updated the label to "Web" and added a brief note that TSA (the worker registration SSH server) runs inside the web node, which is what the rest of the post already assumes (e.g., `concourse-web:2222`).

## Review Notes

- The image resources in the basic pipeline (`type: docker-image`) are still functional but the modern recommendation is `registry-image` (which the more complete pipeline already uses for the output resource). Left as-is — both types work in current Concourse and the author may have chosen `docker-image` deliberately for parity with older docs/examples.
- `chmod 600 /opt/concourse/keys/*` also tightens the `.pub` files. Not a technical error and Concourse doesn't object, but conventionally public keys are world-readable.
- `ssh-keygen` defaults now emit OpenSSH-format keys, which Concourse 5.x+ accepts. No `-m PEM` flag is required for the TSA/worker keys, and the post correctly uses `openssl genrsa` (PEM) for the session signing key.
- `version: '3.8'` at the top of the compose file is harmless but no longer required — Compose v2 ignores the `version` field.
- The `--watch` flag on `fly trigger-job`, `intercept --job`, `set-pipeline`, `unpause-pipeline`, `check-resource`, `workers`, `containers`, `builds -j`, and `watch --job` are all valid fly commands/flags as documented.
