# How to Create Minimal Images with Buildah and Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Minimal Images, Security, Optimization

Description: Learn how to create minimal, production-optimized container images using Buildah and Podman with multi-stage builds and layer optimization.

---

> Minimal container images reduce attack surface, speed up deployments, and lower storage costs.

Every unnecessary package in a container image is a potential vulnerability and wasted space. Buildah combined with Podman provides several techniques to create the smallest possible images while keeping them functional. This guide covers strategies for minimizing image size, from choosing the right base image to multi-stage builds and layer squashing.

---

## Understanding Image Size

```bash
# Compare common base image sizes

podman pull ubuntu:22.04
podman pull debian:bookworm-slim
podman pull alpine:3.19
podman pull gcr.io/distroless/static-debian12

podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" \
  --filter "reference=ubuntu|debian|alpine|distroless"

# Typical sizes:
# ubuntu:22.04           ~77MB
# debian:bookworm-slim   ~74MB
# alpine:3.19            ~7MB
# distroless/static      ~2MB
# scratch                 0MB
```

## Strategy 1: Choose a Minimal Base Image

```bash
# Start with Alpine instead of Ubuntu for smaller images
container=$(buildah from alpine:3.19)

# Install only what you need
buildah run $container -- apk add --no-cache python3 py3-pip

# Check the resulting size after installing packages
buildah commit $container test-alpine:latest
podman images test-alpine --format "{{.Size}}"

# Compare with Ubuntu-based
container2=$(buildah from ubuntu:22.04)
buildah run $container2 -- bash -c "apt-get update && apt-get install -y python3 python3-pip && apt-get clean && rm -rf /var/lib/apt/lists/*"
buildah commit $container2 test-ubuntu:latest
podman images test-ubuntu --format "{{.Size}}"

# Clean up comparison images
buildah rm $container $container2
podman rmi test-alpine:latest test-ubuntu:latest
```

## Strategy 2: Multi-Stage Builds with Buildah

```bash
# Stage 1: Build stage - install build tools and compile
builder=$(buildah from golang:1.21-alpine)

# Install build dependencies
buildah run $builder -- apk add --no-cache git

# Copy and build the application
mkdir -p /tmp/goapp
cat << 'EOF' > /tmp/goapp/main.go
package main
import (
    "fmt"
    "net/http"
)
func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Minimal container!\n")
    })
    http.ListenAndServe(":8080", nil)
}
EOF
cat << 'EOF' > /tmp/goapp/go.mod
module minapp
go 1.21
EOF

buildah copy $builder /tmp/goapp /src
buildah run $builder -- sh -c "cd /src && CGO_ENABLED=0 go build -ldflags '-s -w' -o /app main.go"

# Stage 2: Runtime stage - minimal image with just the binary
runtime=$(buildah from scratch)

# Copy only the compiled binary from the build stage
buildah copy --from $builder $runtime /app /app

# Configure the minimal runtime image
buildah config --port 8080 $runtime
buildah config --entrypoint '["/app"]' $runtime

# Commit the minimal image
buildah commit $runtime minimal-go-app:latest

# Check the size difference
buildah commit $builder builder-stage:latest
echo "Builder stage:"
podman images builder-stage --format "{{.Size}}"
echo "Runtime stage:"
podman images minimal-go-app --format "{{.Size}}"

# Clean up
buildah rm $builder $runtime
podman rmi builder-stage:latest
```

## Strategy 3: Remove Unnecessary Files

```bash
container=$(buildah from python:3.12-slim)

# Install packages and clean up in the same layer
buildah run $container -- bash -c "\
  apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/* \
         /tmp/* \
         /var/tmp/* \
         /usr/share/doc/* \
         /usr/share/man/* \
         /usr/share/info/*"

# Install Python packages without caching
buildah run $container -- pip install --no-cache-dir flask==3.0.0

# Remove pip cache and bytecode
buildah run $container -- bash -c "\
  find / -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; \
  find / -type f -name '*.pyc' -delete 2>/dev/null; \
  rm -rf /root/.cache"

buildah commit $container slim-python:latest
podman images slim-python --format "{{.Size}}"

buildah rm $container
```

## Strategy 4: Squash Layers

```bash
# Build an image with many layers
container=$(buildah from alpine:3.19)
buildah run $container -- apk add --no-cache python3
buildah run $container -- apk add --no-cache py3-flask
mkdir -p /tmp/goapp
echo "placeholder" > /tmp/goapp/placeholder.txt
buildah copy $container /tmp/goapp/placeholder.txt /app/placeholder.txt

# Commit with --squash to merge all layers into one
buildah commit --squash $container squashed-app:latest

# Compare with non-squashed version
buildah commit $container unsquashed-app:latest

echo "Squashed:"
podman images squashed-app --format "{{.Size}}"
echo "Unsquashed:"
podman images unsquashed-app --format "{{.Size}}"

# Squashing removes intermediate layer data that may contain deleted files
buildah rm $container
podman rmi squashed-app:latest unsquashed-app:latest
```

## Strategy 5: Use Distroless Base Images

```bash
# Distroless images contain only the runtime, no shell or package manager
# Build with a full image, then copy to distroless

# Build stage
builder=$(buildah from debian:12-slim)
buildah run $builder -- bash -c "\
  apt-get update && \
  apt-get install -y --no-install-recommends python3-venv gcc libpython3-dev && \
  python3 -m venv /venv && \
  /venv/bin/pip install --upgrade pip setuptools wheel && \
  /venv/bin/pip install --no-cache-dir flask gunicorn && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*"

echo 'from flask import Flask; app = Flask(__name__)
@app.route("/")
def hello(): return "Distroless!"' > /tmp/distroless_app.py
buildah copy $builder /tmp/distroless_app.py /app/app.py

# Runtime stage with distroless
runtime=$(buildah from gcr.io/distroless/python3-debian12)
buildah copy --from $builder $runtime /venv /venv
buildah copy --from $builder $runtime /app /app
buildah config --workingdir /app $runtime
buildah config --entrypoint '["/venv/bin/python3", "app.py"]' $runtime

buildah commit $runtime distroless-flask:latest
podman images distroless-flask --format "{{.Size}}"

buildah rm $builder $runtime
```

## Image Size Audit

```bash
# Analyze what is taking up space in an image
# Use dive or manual inspection
container=$(buildah from slim-python:latest 2>/dev/null || buildah from alpine:3.19)

# Find the largest directories
buildah run $container -- sh -c "du -sh /* 2>/dev/null | sort -rh | head -10"

# Find large individual files
buildah run $container -- sh -c "find / -type f -size +1M -exec ls -lh {} \; 2>/dev/null | sort -k5 -rh | head -10"

buildah rm $container
```

## Cleaning Up

```bash
buildah rm --all
podman rmi minimal-go-app:latest slim-python:latest distroless-flask:latest 2>/dev/null
rm -rf /tmp/goapp /tmp/distroless_app.py
```

## Summary

Creating minimal container images is a combination of choosing the right base image, using multi-stage builds to separate build-time from run-time dependencies, cleaning up unnecessary files, and squashing layers. Buildah makes each of these strategies accessible through its command-line workflow. The result is smaller images that pull faster, start quicker, and present fewer vulnerabilities. Whether you target Alpine, distroless, or scratch, the principles remain the same: include only what your application needs to run.
