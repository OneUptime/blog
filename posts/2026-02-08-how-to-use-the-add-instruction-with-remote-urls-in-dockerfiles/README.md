# How to Use the ADD Instruction with Remote URLs in Dockerfiles

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, ADD Instruction, Remote URL, Image, DevOps

Description: Learn how and when to use Docker's ADD instruction with remote URLs, including its limitations and better alternatives.

---

The ADD instruction in Dockerfiles can download files from remote URLs directly during the build process. This seems convenient at first glance, but it comes with significant trade-offs related to caching, security, and image size. Understanding when ADD is the right choice for remote files, and when you should use alternatives, will help you write better Dockerfiles.

This guide covers the syntax, behavior, practical examples, and the important limitations you need to know about.

## Basic Syntax

The ADD instruction with a remote URL downloads a file from the internet and places it inside the image.

Download a file from a URL during the build:

```dockerfile
# Basic ADD with a remote URL

FROM debian:bookworm-slim

# Download a file from a URL and place it in the container
ADD https://example.com/config.json /app/config.json
```

The file gets downloaded and placed at the specified path inside the image. Docker sets the file permissions to 0600 (readable and writable by the owner only) by default.

## Setting Permissions with --chmod

Docker supports a `--chmod` flag on the ADD instruction to set file permissions at download time.

Download and set executable permissions in one step:

```dockerfile
# syntax=docker/dockerfile:1

FROM debian:bookworm-slim

# Download a binary and make it executable
ADD --chmod=755 https://example.com/tool /usr/local/bin/tool

CMD ["tool"]
```

Without `--chmod`, you would need a separate RUN instruction to change permissions:

```dockerfile
# Without --chmod, you need an extra layer
FROM debian:bookworm-slim

ADD https://example.com/tool /usr/local/bin/tool
RUN chmod +x /usr/local/bin/tool
```

The `--chmod` approach is cleaner and produces one fewer layer in the image.

## Setting Ownership with --chown

Use `--chown` to set the owner and group of the downloaded file:

```dockerfile
# syntax=docker/dockerfile:1

FROM debian:bookworm-slim

# Create a non-root user
RUN useradd -m appuser

# Download the file and assign ownership to appuser
ADD --chown=appuser:appuser https://example.com/data.csv /home/appuser/data.csv

USER appuser
CMD ["cat", "/home/appuser/data.csv"]
```

## Downloading and Extracting Archives

One of ADD's unique features is automatic extraction of compressed archives. When you ADD a local tar file, Docker extracts it automatically. For remote URLs, Docker downloads the archive without extracting it by default.

This is an important distinction. ADD will not extract a tar file downloaded from a URL unless you use the `--unpack` flag:

```dockerfile
# ADD does NOT extract remote archives automatically
FROM debian:bookworm-slim

# This downloads the tar.gz file but does NOT extract it
ADD https://example.com/app-v1.0.tar.gz /tmp/app.tar.gz

# You still need to extract it manually
RUN tar xzf /tmp/app.tar.gz -C /opt/ && \
    rm /tmp/app.tar.gz
```

If you want ADD to download and extract in one step, use `--unpack=true` with a Dockerfile syntax version that supports it:

```dockerfile
# syntax=docker/dockerfile:1

FROM debian:bookworm-slim

# Download and extract the archive into /opt/
ADD --unpack=true https://example.com/app-v1.0.tar.gz /opt/
```

You can also use RUN with curl or wget:

```bash
# Download and extract in a single RUN instruction
RUN curl -fsSL https://example.com/app-v1.0.tar.gz | tar xz -C /opt/
```

## Real-World Example: Installing a Binary Tool

A common use case for ADD with URLs is installing pre-compiled binaries.

Install the `tini` init system from GitHub releases:

```dockerfile
# Install tini using ADD with remote URL
FROM debian:bookworm-slim

# Download tini from GitHub releases
ADD --chmod=755 \
    https://github.com/krallin/tini/releases/download/v0.19.0/tini /usr/local/bin/tini

ENTRYPOINT ["tini", "--"]
CMD ["bash"]
```

Compare this with the curl approach:

```dockerfile
# Same thing using curl in a RUN instruction
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://github.com/krallin/tini/releases/download/v0.19.0/tini \
        -o /usr/local/bin/tini && \
    chmod +x /usr/local/bin/tini && \
    apt-get purge -y curl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

ENTRYPOINT ["tini", "--"]
CMD ["bash"]
```

The ADD version is shorter, but the curl version gives you more control and does not leave curl installed in the image.

## Checksum Verification

When downloading files from the internet, verifying the checksum ensures you got the expected file.

ADD supports built-in checksum verification for HTTP sources using the `--checksum` flag:

```dockerfile
# Download with ADD and verify the SHA256 checksum
FROM debian:bookworm-slim

ADD --checksum=sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 \
    https://example.com/tool-v2.0 /usr/local/bin/tool

RUN chmod +x /usr/local/bin/tool
```

With curl, you can download and verify in the same instruction, which is useful if you need a different hash format or more control over the download:

```dockerfile
# Download and verify checksum in a single RUN
FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    curl -fsSL https://example.com/tool-v2.0 -o /usr/local/bin/tool && \
    echo "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2  /usr/local/bin/tool" | sha256sum -c - && \
    chmod +x /usr/local/bin/tool && \
    apt-get purge -y curl && \
    rm -rf /var/lib/apt/lists/*
```

## Caching Behavior

ADD with remote URLs has specific caching behavior that you need to understand.

Docker caches the downloaded file based on the ADD instruction and the remote source. If you rebuild the image and the instruction has not changed, Docker may use the cached layer. The HTTP `Last-Modified` header can set the destination file's modification time, but that modification time is not used to decide whether the cache should be updated. If you need reproducible cache behavior for a remote artifact, use a versioned URL and `--checksum`.

To force a fresh download, you can bust the cache:

```bash
# Force Docker to re-download by using --no-cache
docker build --no-cache -t myapp .

# Or bust the cache for a specific instruction using a build arg
docker build --build-arg CACHE_BUST=$(date +%s) -t myapp .
```

Using a cache-busting build arg in the Dockerfile:

```dockerfile
FROM debian:bookworm-slim

# Changing this arg value invalidates the cache for subsequent instructions
ARG CACHE_BUST=1
ADD "https://example.com/config.json?cache=${CACHE_BUST}" /app/config.json
```

## When to Use ADD vs Alternatives

ADD with remote URLs is appropriate in specific situations:

Use ADD when you need a simple, single-file download and you do not need to handle authentication or custom HTTP behavior. It works well for downloading static configuration files or small binaries from trusted sources, especially when you can pin them with `--checksum`.

Use curl/wget in a RUN instruction when you need custom checksum logic, HTTP headers or authentication, conditional downloads, or when you want to download and process the file in one step.

Use COPY with a multi-stage build when you want to download files in a builder stage and copy only what you need to the final image.

Multi-stage approach for clean downloads:

```dockerfile
# Stage 1: Download dependencies
FROM debian:bookworm-slim AS downloader

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Download and verify tools
RUN curl -fsSL https://example.com/tool-v2.0 -o /tmp/tool && \
    echo "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2  /tmp/tool" | sha256sum -c - && \
    chmod +x /tmp/tool

# Stage 2: Clean final image
FROM debian:bookworm-slim
COPY --from=downloader /tmp/tool /usr/local/bin/tool
CMD ["tool"]
```

## Security Considerations

Downloading files from the internet during a build introduces security risks.

First, you are trusting that the URL serves the correct, unmodified file. If the server is compromised, your build will include malicious content. Always verify checksums for security-sensitive downloads.

Second, ADD does not support HTTPS certificate pinning or custom CA certificates. If you need these, use curl with the appropriate flags.

Third, remote URLs in Dockerfiles expose your dependencies to the availability of external servers. If the server goes down, your builds break. For production Dockerfiles, consider vendoring binaries in your repository or hosting them on infrastructure you control.

Verify downloads by their content hash whenever possible:

```dockerfile
# Pin to a specific version and verify the hash
FROM debian:bookworm-slim

ADD --checksum=sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 \
    https://github.com/example/tool/releases/download/v1.2.3/tool-linux-amd64 /usr/local/bin/tool

RUN chmod +x /usr/local/bin/tool
```

## ADD with --link Flag

The `--link` flag (available in newer Dockerfile syntax) allows ADD to create an independent layer that does not depend on previous layers. This improves cache reuse.

Use ADD with --link for better caching:

```dockerfile
# syntax=docker/dockerfile:1

FROM debian:bookworm-slim

# --link creates an independent layer
ADD --link --chmod=755 \
    https://example.com/tool /usr/local/bin/tool

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

CMD ["tool"]
```

With `--link`, the ADD layer can be cached and reused even if previous layers change, because it does not depend on the filesystem state of earlier layers.

## Summary

ADD with remote URLs provides a concise way to download files during Docker builds. It works best for simple, trusted downloads where checksums can be pinned with `--checksum`. For anything more complex, involving authentication, custom extraction logic, or conditional logic, use curl or wget in a RUN instruction. Always verify checksums for security-critical files, pin URLs to specific versions, and consider hosting important dependencies on infrastructure you control to avoid build failures from external server outages.
