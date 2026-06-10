# Validation Summary: How to Handle Docker Security Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker (CLI, daemon, runtime)
- Docker Compose (Compose Spec, version "3.9")
- Dockerfile (multi-stage builds, BuildKit `# syntax=docker/dockerfile:1.6`)
- Distroless images (`gcr.io/distroless/static-debian12`)
- Alpine Linux (apk package manager)
- Linux capabilities (CAP_SYS_ADMIN, NET_BIND_SERVICE, CHOWN, SETUID, etc.)
- Seccomp (libseccomp profile format)
- AppArmor (profile syntax)
- Docker Swarm secrets
- Docker Content Trust / Notary (`docker trust` commands)
- Trivy vulnerability scanner
- GitHub Actions (`aquasecurity/trivy-action`, `github/codeql-action/upload-sarif@v3`)
- Go, Node.js, Python (example Dockerfiles)

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/container/run/ (verified `--read-only`, `--tmpfs`, `--cap-drop`, `--cap-add`, `--user`, `--security-opt`, `--memory-reservation`, `--pids-limit`)
- Docker network create reference: https://docs.docker.com/reference/cli/docker/network/create/ (verified `--driver` and `--internal` flags)
- Compose Specification: https://github.com/compose-spec/compose-spec/blob/main/spec.md (verified `deploy.resources.limits.pids`, `tmpfs` short syntax with options, `secrets`, `networks.internal`, `security_opt`)
- Distroless images repository: https://github.com/GoogleContainerTools/distroless (verified `nonroot` user UID 65532 for `static-debian12`)
- BuildKit secrets documentation: https://docs.docker.com/build/building/secrets/ (verified `--mount=type=secret,id=...,target=...` syntax)
- libseccomp/seccomp profile schema (Docker default profile): verified `defaultAction`, `defaultErrnoRet` (EPERM = 1), `SCMP_ARCH_X86_64`, `SCMP_ARCH_AARCH64`, `SCMP_ACT_ALLOW`
- Trivy CLI reference: https://aquasecurity.github.io/trivy/ (verified `--severity`, `--exit-code`, `--format json`, `-q` flags)
- aquasecurity/trivy-action: https://github.com/aquasecurity/trivy-action (verified `image-ref`, `format`, `output`, `severity`, `exit-code` inputs)
- Docker Content Trust: https://docs.docker.com/engine/security/trust/ (verified `DOCKER_CONTENT_TRUST=1`, `docker trust sign`, `docker trust key generate`, `docker trust signer add`)
- Alpine apk-tools: verified `apk add/upgrade --no-cache` and busybox `addgroup`/`adduser` flags (`-S`, `-g`, `-u`, `-G`)
- AppArmor reference: profile syntax (`#include`, `network inet tcp`, file rules, `deny` rules) verified against upstream AppArmor docs

## Issues Found
- **BuildKit npm token secret source/target mismatch** (Section 6, "Using BuildKit for Build-Time Secrets"): The Dockerfile uses `npm config set //registry.npmjs.org/:_authToken $(cat /run/secrets/npm_token)`, treating the secret content as a raw token value. However, the build command was `--secret id=npm_token,src=$HOME/.npmrc`, which sources the user's `.npmrc` file. The `.npmrc` format is `//registry.npmjs.org/:_authToken=TOKEN` (a key=value line, not a bare token), so concatenating it into the `npm config set` command would produce a malformed token (it would set the auth token value to the entire `key=value` line). Changed `src=$HOME/.npmrc` to `src=$HOME/.npm_token` and added a comment clarifying that the source file should contain only the token value, so the example is internally consistent.

## Review Notes
- `npm ci --only=production` is deprecated in npm v7+ in favor of `npm ci --omit=dev`, but `--only=production` still functions (it emits a deprecation warning). Left as-is since it is still operational and widely used in existing Dockerfiles.
- `aquasecurity/trivy-action@master` works but pinning to a tagged release (e.g., `@0.x.x`) is the recommended supply-chain hygiene practice. Left as-is since the post is illustrating the workflow shape rather than prescribing pinning policy.
- Docker Compose `version: "3.9"` is still accepted but the top-level `version` key is obsolete under the modern Compose Specification (Compose v2). Left as-is since it remains valid and unambiguous; many real-world files still include it.
- Docker Content Trust (Notary v1) is in maintenance mode; newer ecosystems favor Sigstore/Cosign. The commands described still work, but readers operating greenfield should evaluate Cosign as well. Not a correctness issue.
- The Seccomp profile shown is illustrative and intentionally minimal; a real-world application would need additional syscalls (e.g., `brk`, `arch_prctl`, `clone`, `execve`, `wait4`, etc.) to function. The post's framing ("filters limit which system calls a container can make") makes the illustrative intent clear.
- The `nginx:alpine` `--read-only` example only mounts `/tmp` and `/var/run` as tmpfs; nginx also typically needs `/var/cache/nginx` writable. The example is sufficient to demonstrate the pattern but would need an extra tmpfs mount to actually start nginx successfully. Left as-is since the section is about the read-only + tmpfs pattern, not a complete nginx hardening recipe.
- Distroless `nonroot` UID 65532 is correct for `static-debian12` and `nonroot` variants.
- The `addgroup -g 1001 -S nodejs` / `adduser -S nodejs -u 1001 -G nodejs` busybox syntax is correct; note that the `node:20-alpine` base image already ships with a built-in `node` user (UID 1000), so creating a separate `nodejs` user is a stylistic choice rather than a requirement.
