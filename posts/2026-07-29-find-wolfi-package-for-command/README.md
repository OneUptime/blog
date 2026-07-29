# How to Find the Wolfi APK Package That Provides a Missing Command

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Wolfi APK, Package Management, Debugging, Container

Description: Search Wolfi's APK index by command, shared library, or package name and install the provider instead of guessing from another distribution.

---

When a migrated Dockerfile reports `command not found`, the package usually has a different name or the utility was split out of a minimal BusyBox package. A plain `apk search` matches package names, not executable filenames. APK's `cmd:` capability searches packages that declare they provide that executable.

## Search from a disposable Wolfi environment

Use `wolfi-base`, which contains a shell and `apk`:

```bash
docker run --rm -it \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/wolfi-base:latest
```

Refresh the index, then search by capability:

```bash
apk update
apk search cmd:useradd
```

The result identifies `shadow` as the package providing `useradd`. Install by package name:

```bash
apk add --no-cache shadow
```

APK also accepts the capability directly:

```bash
apk add --no-cache cmd:ldd
```

Installing by the resolved package name is often clearer in a reviewed Dockerfile, while the capability form is useful when the provider name can change.

## Search the right repository set

The result depends on `/etc/apk/repositories`, architecture, authentication, and organization entitlements:

```bash
cat /etc/apk/repositories
apk --print-arch
apk policy shadow
```

Chainguard Free development images normally reference the public Wolfi repository. The public Extra Packages repository is not enabled in Free images by default. Chainguard customers can also have organization-specific public URLs and an authenticated private APK repository scoped to their entitlements. A package visible to one organization is not necessarily visible to an anonymous public build.

Run the search in the same repository context and architecture as the real build.

## Use capability prefixes

APK indexes more than package names:

| Need | Search |
| --- | --- |
| Executable named `useradd` | `apk search cmd:useradd` |
| Shared object such as libxml2 | `apk search 'so:libxml2.so*'` |
| pkg-config metadata | `apk search 'pc:libcurl'` |
| Package name | `apk search curl` |

Quote wildcard expressions so the local shell does not expand them before `apk` sees them.

For example, a native extension that reports a missing library can be traced with:

```bash
apk search 'so:libpq.so.5'
apk policy libpq-18
apk info -R libpq-18
```

Use the concrete provider returned by the first command; `libpq-18` is the current default version stream. `apk info -R` shows dependencies. It helps distinguish a build package such as `postgresql-18-dev` from the smaller runtime provider.

## Find the owner of an installed file

If the command already exists in a development image, ask which installed package owns its full path:

```bash
command -v ldd
apk info --who-owns /usr/bin/ldd
```

Wolfi has adopted a merged `/usr` layout. If an ownership query against `/bin`, `/sbin`, or `/lib` fails, resolve the symlink or retry with the corresponding `/usr/bin`, `/usr/sbin`, or `/usr/lib` path.

This ownership check only covers installed files. Use `apk search cmd:<name>` to search all indexed packages.

## Check package mappings before translating names

Debian, Red Hat, Alpine, and Wolfi can package the same upstream project differently. Examples include:

- Debian `build-essential` to Wolfi `build-base`;
- Debian `libcurl4-openssl-dev` to Wolfi `curl-dev`;
- Red Hat `*-devel` packages to Wolfi's usual `*-dev` naming;
- GNU account tools in Wolfi's `shadow` package, while BusyBox also supplies simpler `adduser` and `addgroup`.

Chainguard publishes package-name mapping tables, but the current APK index is authoritative for availability.

Do not add Alpine repositories to a Wolfi image to satisfy a missing result. The two ecosystems both use the APK format but target different distributions and libc environments. Mixing their packages is unsupported and can introduce ABI and supply-chain problems.

## Put only the required provider in the right stage

If the command is build-only:

```dockerfile
FROM cgr.dev/chainguard/python:latest-dev AS build

USER root
RUN apk add --no-cache cmd:git build-base

USER 65532
# Build application artifacts here.
```

Do not carry Git and compilers into the final runtime. If the application invokes the command after startup, document that as a real runtime dependency and use an appropriate variant, Custom Assembly, or Chainguard's distroless APK assembly workflow.

## Use the browser-based explorer when needed

Chainguard's APK Explorer offers a web search for Wolfi repositories. It is useful when the failing image has no shell, but still verify the selected package against the actual repositories and architecture used by the build.

Package indexes move as Wolfi is updated. Record the resolved image digest and package version in build evidence instead of copying example version numbers from documentation.

## Official Documentation

- [Migrating Dockerfiles to Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migrating-to-chainguard-images/)
- [Wolfi FAQ](https://edu.chainguard.dev/open-source/wolfi/faq/)
- [Package and image name mappings](https://edu.chainguard.dev/chainguard/chainguard-images/about/package-name-mappings/)
- [Alpine Package Keeper search documentation](https://docs.alpinelinux.org/user-handbook/0.1a/Working/apk.html)
