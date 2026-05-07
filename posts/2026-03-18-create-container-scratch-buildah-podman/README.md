# How to Create a Container from Scratch with Buildah and Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Scratch Image, Minimal Containers, Security

Description: Learn how to build a container image from scratch using Buildah and Podman for minimal, secure containers with no base image overhead.

---

> Building from scratch produces very small container images with no unnecessary OS packages inherited from a base image.

Most container images start from a base like `ubuntu` or `alpine`, which includes an operating system with hundreds of packages you may never need. Building from scratch means starting with an empty filesystem and adding only what your application requires. This approach produces very small images and reduces the inherited attack surface. Buildah makes this process straightforward.

---

## Why Build from Scratch

```bash
# Compare image sizes to understand the benefit

podman pull ubuntu:22.04
podman pull alpine:3.19
podman images ubuntu:22.04 --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
podman images alpine:3.19 --format "{{.Repository}}\t{{.Tag}}\t{{.Size}}"

# Typical sizes:
# ubuntu:22.04  ~  77MB
# alpine:3.19   ~  7MB
# scratch        =  0MB (empty filesystem)
```

## Creating a Scratch Container

### Start with an Empty Image

```bash
# Create a working container from the special "scratch" image
# This gives you a completely empty filesystem
container=$(buildah from scratch)

# Verify the container was created
buildah containers --format "table {{.ContainerName}}\t{{.ImageName}}"

# The container has no files, no shell, nothing
# You cannot run shell commands such as "buildah run $container -- sh"
# until you add a shell or executable
```

## Building a Go Application from Scratch

Go is ideal for scratch containers because it can produce statically linked binaries.

### Write the Application

```bash
# Create a simple Go web server
mkdir -p /tmp/go-scratch-app

cat << 'EOF' > /tmp/go-scratch-app/main.go
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello from a scratch container!\n")
		fmt.Fprintf(w, "Built with Buildah, running on Podman.\n")
	})

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintf(w, "OK\n")
	})

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
EOF

cat << 'EOF' > /tmp/go-scratch-app/go.mod
module scratch-app
go 1.21
EOF
```

### Compile as a Static Binary

```bash
# Build the Go binary as a completely static executable
# CGO_ENABLED=0 ensures no C library dependencies
# -ldflags '-s -w' strips debug information to reduce size
podman run --rm \
  -v /tmp/go-scratch-app:/src:Z \
  -w /src \
  golang:1.21 \
  sh -c "CGO_ENABLED=0 GOOS=linux go build -ldflags '-s -w' -o /src/app main.go"

# Check the binary size
ls -lh /tmp/go-scratch-app/app

# Verify it is statically linked
file /tmp/go-scratch-app/app
# Should show: "statically linked"
```

### Assemble the Scratch Image

```bash
# Create the scratch container
container=$(buildah from scratch)

# Copy just the static binary into the empty filesystem
buildah copy $container /tmp/go-scratch-app/app /app

# If your app needs SSL certificates (for HTTPS requests)
# Copy the CA certificates from the build image
podman run --rm golang:1.21 cat /etc/ssl/certs/ca-certificates.crt > /tmp/ca-certificates.crt
buildah copy $container /tmp/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

# Configure the image metadata
buildah config --port 8080 $container
buildah config --entrypoint '["/app"]' $container
buildah config --env PORT=8080 $container
buildah config --label maintainer="team@example.com" $container
buildah config --label description="Scratch container with Go app" $container

# Commit the image
buildah commit $container go-scratch-app:latest

# Check the final image size
podman images go-scratch-app --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
# Typically 5-10MB for a simple Go app
```

### Run and Test

```bash
# Run the scratch image with Podman
podman run -d --name scratch-test -p 8080:8080 go-scratch-app:latest

# Test the application
curl http://localhost:8080/
curl http://localhost:8080/health

# Check the running container
podman ps --filter "name=scratch-test" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

# Compare the image size against common base images
echo "=== Image Size Comparison ==="
podman images go-scratch-app --format "{{.Repository}}:{{.Tag}} -> {{.Size}}"
podman images ubuntu:22.04 --format "{{.Repository}}:{{.Tag}} -> {{.Size}}"
podman images alpine:3.19 --format "{{.Repository}}:{{.Tag}} -> {{.Size}}"
```

## Building a C Application from Scratch

```bash
# For C/C++ applications, you need to compile statically
mkdir -p /tmp/c-scratch-app

cat << 'EOF' > /tmp/c-scratch-app/hello.c
#include <stdio.h>

int main() {
    printf("Hello from a C scratch container!\n");
    return 0;
}
EOF

# Compile statically using a builder container
podman run --rm -v /tmp/c-scratch-app:/src:Z gcc:13 \
  gcc -static -o /src/hello /src/hello.c

# Verify static linking
file /tmp/c-scratch-app/hello

# Build the scratch image
container=$(buildah from scratch)
buildah copy $container /tmp/c-scratch-app/hello /hello
buildah config --entrypoint '["/hello"]' $container
buildah commit $container c-scratch-app:latest

# Run it
podman run --rm c-scratch-app:latest
```

## Adding Essential Files to Scratch Images

```bash
# Some applications need specific files even in scratch images
container=$(buildah from scratch)

# Timezone data (if your app handles time zones)
podman run --rm alpine:3.19 tar czf - /usr/share/zoneinfo | \
  podman run --rm -i alpine:3.19 cat > /tmp/zoneinfo.tar.gz
buildah add $container /tmp/zoneinfo.tar.gz /

# Passwd file (if your app changes user)
echo "nobody:x:65534:65534:Nobody:/:" > /tmp/passwd
buildah copy $container /tmp/passwd /etc/passwd

# Set the user to nobody for security
buildah config --user nobody $container

buildah commit $container scratch-with-extras:latest
```

## Cleaning Up

```bash
# Stop and remove test containers
podman stop scratch-test 2>/dev/null && podman rm scratch-test

# Remove working containers
buildah rm --all

# Remove test images
podman rmi go-scratch-app:latest c-scratch-app:latest scratch-with-extras:latest 2>/dev/null

# Clean up temporary files
rm -rf /tmp/go-scratch-app /tmp/c-scratch-app /tmp/ca-certificates.crt /tmp/passwd /tmp/zoneinfo.tar.gz
```

## Summary

Building containers from scratch with Buildah produces very small images by including only your application binary and its essential dependencies. This approach works best with applications that can be statically compiled, including Go, Rust, and C. The result is an image that often measures under 10MB with no shell, no package manager, and less inherited attack surface. Combined with Podman for runtime, you get a minimal, secure container workflow from build to deployment.
