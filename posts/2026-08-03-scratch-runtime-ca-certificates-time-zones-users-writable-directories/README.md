# Scratch Runtime Essentials: CA Certs, Time Zones, Users, and Writable Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Scratch Image, Multi-Stage Builds, CA Certificates, Time Zones, Non-Root Containers, Container Security

Description: Turn an empty scratch filesystem into an application-specific runtime by adding only the trust roots, zone data, identities, and writable paths the process actually uses.

---

`FROM scratch` supplies no files at all. It has no shell, package database, CA trust store, time-zone database, user records, or `/tmp`. Docker describes scratch as a reserved empty starting point, suitable only when you add every runtime dependency yourself.

A statically linked binary solves the code-linkage problem. It does not create the data files and filesystem layout that the program expects. Build a runtime contract from observed application behavior rather than copying an arbitrary subset of a distribution.

## Start with an Explicit Inventory

Ask four questions before choosing scratch:

1. Does the executable have an ELF interpreter or shared objects?
2. Does it make outbound TLS connections using the system trust store?
3. Does it load named zones such as `Europe/London`, or only use UTC?
4. Which paths does the non-root process need to write?

Also check whether the application looks up its current user, spawns shell commands, relies on locale data, or loads plugins. If that list becomes broad, a maintained slim or distroless runtime is often safer than a hand-built root filesystem.

## Build a Concrete Scratch Layout

This example packages a pure-Go service and Debian's generated certificate and time-zone data:

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.25-bookworm AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -o /out/service ./cmd/service

RUN mkdir -p /layout/etc /layout/tmp /layout/var/lib/service \
    && printf '%s\n' \
      'appuser:x:65532:65532:Application user:/:/sbin/nologin' \
      > /layout/etc/passwd \
    && printf '%s\n' 'appuser:x:65532:' > /layout/etc/group

FROM scratch
COPY --from=build --chmod=0555 /out/service /service
COPY --from=build /etc/ssl/certs/ca-certificates.crt \
  /etc/ssl/certs/ca-certificates.crt
COPY --from=build /usr/share/zoneinfo/ /usr/share/zoneinfo/
COPY --from=build --chmod=0444 /layout/etc/passwd /layout/etc/group /etc/
COPY --from=build --chown=65532:65532 --chmod=0700 \
  /layout/var/lib/service/ /var/lib/service/
COPY --from=build --chown=65532:65532 --chmod=0700 \
  /layout/tmp/ /tmp/
USER 65532:65532
ENTRYPOINT ["/service"]
```

The UID and GID are numeric so Docker does not need account files to apply ownership. The account records are present for application code that resolves user information and for useful identity in diagnostic output.

## CA Certificates Are Application Data

An HTTPS client must decide which certificate authorities to trust. On Debian, installing `ca-certificates` creates the conventional bundle at `/etc/ssl/certs/ca-certificates.crt`, which many runtimes recognize. Copy the generated bundle from a trusted, updated builder stage rather than downloading a random PEM file.

Not every runtime searches the same paths. Confirm the rules for the language or TLS library in use. If the service connects only to a private CA, add that root through the distribution's trust-store mechanism in the builder, run its update command, and copy the generated result. Do not disable certificate verification to compensate for an absent bundle.

Certificate roots age. A scratch image does not receive package updates at runtime, so rebuild and redeploy it when the source `ca-certificates` package changes.

## Time Zones Are Optional Until They Are Not

Unix timestamps and UTC formatting do not require the entire IANA database. Loading a named zone normally does. Debian's `tzdata` package installs zone files under `/usr/share/zoneinfo`, so the example copies that tree.

For Go, another option is importing `time/tzdata`, which embeds a copy of the database in the program. That avoids a filesystem dependency at the cost of binary size and still requires rebuilding to receive updates. Choose one source of truth and test a zone affected by daylight-saving transitions, not just `UTC`.

Setting `TZ=UTC` is not a substitute if application or customer data names other zones. Conversely, do not copy all zone data if the application contract explicitly supports UTC only.

## User Records and `USER` Solve Different Problems

`USER 65532:65532` tells the runtime which credentials to use. It does not create `/etc/passwd` or `/etc/group`. Linux can run a process using numeric IDs without names, but libraries and application endpoints may try to map those IDs to a user.

Keep account files minimal and non-login. Do not assign UID `0`, and do not copy a builder's complete account database into the image. Kubernetes `runAsUser` or Docker `--user` can override the image's user, so ensure deployment policy and directory ownership agree.

## Create Only the Writable Paths You Need

Scratch does not contain `/tmp`, `/var/run`, a home directory, or an application state directory. A read-only root filesystem is easiest to enforce when the image owns only a few explicit writable mount points.

The example gives the application private `0700` directories. If unrelated users truly need a shared `/tmp`, create it with mode `1777` instead. Do not recursively chown `/` or make application binaries writable.

Test the final policy:

```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m,uid=65532,gid=65532,mode=700 \
  scratch-service:dev
```

If persistent state is needed, mount `/var/lib/service` explicitly. The root filesystem can remain read-only while the one data path is writable.

## Remember What Scratch Cannot Debug

There is no `/bin/sh`, `ls`, `cat`, or package manager in the final image. A shell-form `CMD` will fail; use JSON exec form. Provide health checks through the orchestrator or an application subcommand, and keep a separate debug target based on a compatible maintained image.

Test DNS, TLS, user lookup, named time zones, signals, read-only root operation, and each required write path before shipping. That test matrix is the real specification for the contents of the scratch image.

## Official Documentation

- [Docker base image documentation for scratch](https://docs.docker.com/build/building/base-images/)
- [Dockerfile USER reference](https://docs.docker.com/reference/dockerfile/#user)
- [Docker read-only container option](https://docs.docker.com/reference/cli/docker/container/run/#read-only)
- [Debian ca-certificates package](https://packages.debian.org/bookworm/ca-certificates)
- [Debian tzdata file list](https://packages.debian.org/bookworm/all/tzdata/filelist)
- [Go time package zoneinfo documentation](https://pkg.go.dev/time)
