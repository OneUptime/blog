# Chainguard `latest`, `latest-dev`, and `-full` Image Variants

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Container, Distroless, Docker, Supply Chain Security

Description: Choose among Chainguard standard, development, and full container variants based on runtime minimalism, build tooling, and migration compatibility.

---

The three names describe different image profiles, not security grades:

- A standard tag such as `:latest` is normally the minimal runtime variant.
- A development tag such as `:latest-dev` adds tools for building, testing, or debugging.
- A full tag ending in `-full` is available for selected containers and more closely maps the packages and configuration users expect from the upstream image.

Always confirm a repository's actual variants in the Chainguard Directory. Not every image offers all three, and some repositories have additional workload-specific variants.

## What `latest` means

For a Free Chainguard Container, `latest` is the current build of the current upstream version offered in the public `cgr.dev/chainguard` repository. It is a mutable tag. Chainguard rebuilds containers frequently, so the digest behind it can change as packages and security fixes change.

Standard application variants generally omit:

- `apk`
- `/bin/sh` and `/bin/bash`
- compilers and header files
- package ecosystem installers that are not needed at runtime
- diagnostic clients such as `curl`

The exact entrypoint and default user are image-specific. Inspect them instead of assuming:

```bash
IMAGE=cgr.dev/chainguard/node:latest

docker pull "$IMAGE"
docker image inspect "$IMAGE" \
  --format 'user={{json .Config.User}} entrypoint={{json .Config.Entrypoint}} cmd={{json .Config.Cmd}}'
```

Use the standard variant for a final runtime when the application and its runtime dependencies can be copied in during a multi-stage build.

## What `latest-dev` adds

Development variants are designed to remain close to the standard variant while adding useful tooling. They commonly contain a shell and `apk`; language images may also include compilers, headers, Git, `pip`, `npm`, or other build tools.

```bash
docker run --rm -it \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/python:latest-dev
```

Development does not mean unsigned or unmaintained. Chainguard documents that these variants also receive signatures, SBOMs, provenance, and frequent updates. They simply contain more software, which means a larger attack surface than the corresponding minimal runtime.

Use a development variant when:

- compiling native dependencies;
- installing language packages;
- running tests that need a shell;
- diagnosing a migration;
- the workload truly needs the added tools at runtime and the tradeoff is accepted.

Many development variants still default to a nonroot user. Package installation may need a temporary `USER root`, followed by a return to the runtime user.

## What `-full` means

Chainguard offers full variants for a subset of popular containers. Their purpose is migration compatibility: the packages, environment variables, and entrypoint scripts map more closely to the corresponding third-party upstream image.

A full variant is useful when an application depends on utilities that were implicitly present in its former base image and the standard or development Chainguard variant does not include them. It can reduce the number of variables during an initial migration.

Do not infer a full tag by string manipulation and deploy it blindly. Find the documented tag in the Directory, inspect its SBOM, and test its entrypoint and user. A `-full` variant is not guaranteed for every repository or every version stream.

## Recommended multi-stage pattern

The common pattern is to build with `-dev` and run with the standard variant:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev AS build

WORKDIR /app
RUN python -m venv /app/venv
ENV PATH=/app/venv/bin:$PATH

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM cgr.dev/chainguard/python:latest

WORKDIR /app
COPY --from=build --chown=65532:65532 /app/venv /app/venv
COPY --chown=65532:65532 app.py .

ENV PATH=/app/venv/bin:$PATH
ENTRYPOINT ["python", "/app/app.py"]
```

Use matching language version streams in both stages. Test native modules carefully because a builder can contain shared libraries that the standard runtime does not.

## Choose by requirement, not by suffix

| Requirement | Starting choice | Reason |
| --- | --- | --- |
| Minimal production runtime | Standard | Contains only the runtime-focused package set |
| Build or test tooling | Development | Includes shell, package manager, and ecosystem tools |
| Interactive migration diagnosis | Development | Closest convenient diagnostic environment |
| Closer parity with a third-party image | Full, if offered | Includes more expected upstream-compatible packages and configuration |
| One or two extra system packages | Custom Assembly or documented distroless extension | Keeps additions explicit and maintained |
| Reproducible production release | Any suitable variant pinned by digest | A tag alone can move |

Free containers publicly expose a limited latest-oriented tag set. Production Containers are accessed through an organization's `cgr.dev/<organization>/<image>` repository and offer supported version streams, patch SLAs, and other enterprise features. Do not assume a tag visible in the Directory is anonymously pullable from `cgr.dev/chainguard`.

## Verify the choice

Before promotion:

```bash
docker build --pull -t example:test .
docker image inspect example:test
docker run --rm example:test
```

Then inspect the resulting SBOM and resolved digest. The right variant is the smallest one that contains every demonstrated runtime requirement, not necessarily the smallest image that happens to start.

## Official Documentation

- [Chainguard container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Tips for migrating to Chainguard Containers](https://edu.chainguard.dev/chainguard/migration/migration-tips/)
- [Overview of Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/overview/)
- [Chainguard Containers Directory](https://images.chainguard.dev/)
