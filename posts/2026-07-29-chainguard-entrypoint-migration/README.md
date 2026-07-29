# Why Did My Entrypoint Break After Switching to a Chainguard Image?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Docker, Entrypoint, Distroless, Container Migration

Description: Diagnose Chainguard startup failures by inspecting inherited entrypoints, removing shell assumptions, and using explicit exec-form commands.

---

Changing only `FROM` can change the command that Docker ultimately executes. Chainguard application images often have a runtime-specific `ENTRYPOINT`, no shell, and a nonroot user. A `CMD` that worked with an upstream image may become arguments to a different executable.

For example, a Node image can define `/usr/bin/node` as its entrypoint. This instruction:

```dockerfile
CMD ["npm", "start"]
```

can then be interpreted as:

```text
/usr/bin/node npm start
```

That is not the same as running `npm start`.

## Inspect both image configurations

Compare the old and new bases before editing commands:

```bash
for image in \
  node:24 \
  cgr.dev/chainguard/node:latest
do
  docker image inspect "$image" \
    --format '{{.RepoTags}} user={{json .Config.User}} entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}} workdir={{json .Config.WorkingDir}}'
done
```

The effective process follows Docker's `ENTRYPOINT` and `CMD` combination rules:

- exec-form `ENTRYPOINT` plus exec-form `CMD` appends the `CMD` elements as arguments;
- a command supplied to `docker run IMAGE ...` replaces `CMD`, not `ENTRYPOINT`;
- `--entrypoint` replaces the image entrypoint;
- setting a new `ENTRYPOINT` in a Dockerfile resets an inherited `CMD`.

## Make the final process explicit

If the application should run a Node file, avoid relying on inherited behavior:

```dockerfile
FROM cgr.dev/chainguard/node:latest

WORKDIR /app
COPY --chown=65532:65532 server.js /app/server.js

ENTRYPOINT ["/usr/bin/node", "/app/server.js"]
```

For Python:

```dockerfile
FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --chown=65532:65532 main.py /app/main.py

ENTRYPOINT ["/usr/bin/python", "/app/main.py"]
```

Absolute executable and script paths remove uncertainty about `PATH` and `WORKDIR`. Some images intentionally configure a useful runtime entrypoint, in which case a concise `CMD` is appropriate:

```dockerfile
CMD ["/app/main.py"]
```

Choose one model deliberately and document it.

## Remove shell-form instructions

This form requires `/bin/sh -c`:

```dockerfile
ENTRYPOINT python /app/main.py
```

A distroless image has no shell, so use a JSON array:

```dockerfile
ENTRYPOINT ["python", "/app/main.py"]
```

The same rule applies to shell operators and variable expansion:

```dockerfile
CMD ["sh", "-c", "python \"$APP_FILE\" && echo done"]
```

That still needs a shell because it names one explicitly. Prefer application arguments with fixed paths, or perform configuration inside the application.

Exec form also makes the application process PID 1 directly, so it receives termination signals without an intermediate shell failing to forward them.

## Check scripts and executable metadata

An entrypoint script can fail even when it was copied:

- its shebang names `/bin/bash`, which is absent;
- it has Windows CRLF line endings, changing the shebang interpreter path;
- its execute bit is missing;
- it is owned or protected so the runtime UID cannot traverse its parent directories;
- it invokes utilities that were present in the old image but not the new one.

Inspect it during the build or in a development variant:

```bash
file entrypoint.sh
head -n 1 entrypoint.sh
stat -c '%A %u:%g %n' entrypoint.sh
```

If a shell script is genuinely required, use a documented development or full variant that contains the chosen shell, and invoke the absolute interpreter:

```dockerfile
ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
```

Do not assume `/bin/bash` exists because `/bin/sh` exists, or the reverse.

## Check the runtime user and working directory

Chainguard application containers commonly run as nonroot. Startup may fail with `permission denied` when the former image ran as root:

```dockerfile
WORKDIR /app
COPY --chown=65532:65532 . /app
```

Keep immutable code read-only, and provide a separate owned path or volume for state. Do not change the final stage to `USER root` just to conceal a file-layout problem.

## Reproduce the exact effective command

Show the final configuration:

```bash
docker image inspect app:test \
  --format 'entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}} user={{json .Config.User}}'
```

Then test overrides independently:

```bash
docker run --rm app:test
docker run --rm app:test --version
docker run --rm --entrypoint /usr/bin/node app:test --version
```

The last form is especially useful for a distroless image because it invokes a known executable directly instead of attempting to start a shell.

Also review Kubernetes `command` and `args`. In Kubernetes, `command` corresponds to the image entrypoint and `args` corresponds to the image command. A manifest copied from the previous image can override an otherwise correct Chainguard configuration.

## Official Documentation

- [Migrating to Node.js Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-node/)
- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Dockerfile `ENTRYPOINT` reference](https://docs.docker.com/reference/dockerfile/#entrypoint)
- [Kubernetes commands and arguments](https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/)
