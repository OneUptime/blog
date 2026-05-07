# How to Use the Podman REST API to Build Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container Image, DevOps, Image Building

Description: Learn how to build container images from Containerfiles using the Podman REST API, including build arguments, multi-stage builds, and build cache management.

---

> Building container images through the Podman REST API lets you integrate image builds into automated pipelines, trigger builds from web applications, and manage the entire build lifecycle programmatically.

The Podman REST API exposes a build endpoint that accepts a build context (a tar archive containing your Containerfile and source files) and produces a container image. This is equivalent to running `podman build` from the command line but driven entirely through HTTP. This guide covers the complete build workflow from preparing the build context to monitoring build progress and managing the resulting images.

---

## Understanding the Build Endpoint

The build endpoint at `/v4.0.0/libpod/build` accepts a POST request with the build context as the request body. The build context is a tar archive that must include the Containerfile (or Dockerfile) and any files referenced by COPY or ADD instructions.

The key parameters are passed as query string arguments:

- `dockerfile` - Path to the Containerfile within the build context
- `t` - Tag for the resulting image
- `buildargs` - JSON object of build arguments
- `nocache` - Disable build cache
- `rm` - Remove intermediate containers after a successful build

## Preparing a Build Context

First, create a project directory with a Containerfile and any necessary source files.

```bash
# Create a sample project

mkdir -p /tmp/myapp
cat > /tmp/myapp/Containerfile << 'EOF'
FROM docker.io/library/node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./

EXPOSE 3000
CMD ["node", "server.js"]
EOF

cat > /tmp/myapp/package.json << 'EOF'
{
  "name": "myapp",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0"
  }
}
EOF

cat > /tmp/myapp/server.js << 'EOF'
const express = require('express');
const app = express();
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.listen(3000, () => console.log('Server running on port 3000'));
EOF
```

Now create a tar archive of the build context.

```bash
# Create the build context tar archive
cd /tmp/myapp && tar -cf /tmp/build-context.tar .
```

## Building an Image

Send the tar archive to the build endpoint.

```bash
# Build the image from the tar archive
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/x-tar" \
  --data-binary @/tmp/build-context.tar \
  "http://localhost/v4.0.0/libpod/build?dockerfile=Containerfile&t=myapp:latest"
```

The response is a stream of JSON objects showing each build step. A successful build ends with the resulting image ID in the streamed output.

## Specifying Build Arguments

Pass build-time variables using the `buildargs` query parameter. Because the value is JSON, URI-encode it before adding it to the query string.

```bash
# Create a Containerfile that uses build arguments
cat > /tmp/myapp/Containerfile << 'EOF'
FROM docker.io/library/node:20-alpine

ARG APP_VERSION=1.0.0
ARG NODE_ENV=production

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.js ./

ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=$NODE_ENV

EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Rebuild the context
cd /tmp/myapp && tar -cf /tmp/build-context.tar .

# Build with build arguments
BUILDARGS=$(python3 -c 'import json, urllib.parse; print(urllib.parse.quote(json.dumps({"APP_VERSION":"2.0.0","NODE_ENV":"staging"}), safe=""))')

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/x-tar" \
  --data-binary @/tmp/build-context.tar \
  "http://localhost/v4.0.0/libpod/build?dockerfile=Containerfile&t=myapp:v2.0&buildargs=${BUILDARGS}"
```

## Building Without Cache

Force a clean build by disabling the cache.

```bash
# Build without using the layer cache
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/x-tar" \
  --data-binary @/tmp/build-context.tar \
  "http://localhost/v4.0.0/libpod/build?dockerfile=Containerfile&t=myapp:latest&nocache=true"
```

## Multi-Stage Builds

Multi-stage builds work naturally through the API. The Containerfile handles the staging.

```bash
# Create a multi-stage Containerfile
cat > /tmp/myapp/Containerfile << 'EOF'
# Build stage
FROM docker.io/library/node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server.js ./

# Runtime stage
FROM docker.io/library/node:20-alpine

WORKDIR /app
COPY --from=builder /app /app

EXPOSE 3000
CMD ["node", "server.js"]
EOF

# Rebuild the context with the updated Containerfile
cd /tmp/myapp && tar -cf /tmp/build-context.tar .
```

```bash
# Build a specific stage using the target parameter
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/x-tar" \
  --data-binary @/tmp/build-context.tar \
  "http://localhost/v4.0.0/libpod/build?dockerfile=Containerfile&t=myapp-builder:latest&target=builder"
```

## Setting Labels During Build

Add labels to the built image using the `labels` parameter. Because the value is JSON, URI-encode it before adding it to the query string.

```bash
# Build with custom labels
LABELS=$(python3 -c 'import json, urllib.parse; print(urllib.parse.quote(json.dumps({"maintainer":"team@example.com","version":"1.0"}), safe=""))')

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/x-tar" \
  --data-binary @/tmp/build-context.tar \
  "http://localhost/v4.0.0/libpod/build?dockerfile=Containerfile&t=myapp:latest&labels=${LABELS}"
```

## Controlling Image Size

Use the `squash` parameter to flatten all layers into one, reducing image size.

```bash
# Build and squash layers
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/x-tar" \
  --data-binary @/tmp/build-context.tar \
  "http://localhost/v4.0.0/libpod/build?dockerfile=Containerfile&t=myapp:squashed&squash=true"
```

## Using the Docker-Compatible Build Endpoint

The Docker-compatible endpoint accepts the same tar format.

```bash
# Build using the Docker-compatible endpoint
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/x-tar" \
  --data-binary @/tmp/build-context.tar \
  "http://localhost/v1.40/build?dockerfile=Containerfile&t=myapp:latest&rm=true"
```

## Building with a .containerignore File

Include a `.containerignore` file in your build context to exclude files from the build.

```bash
# Create a .containerignore file
cat > /tmp/myapp/.containerignore << 'EOF'
node_modules
.git
*.md
.env
.dockerignore
EOF

# Rebuild the context (the ignore file is respected during build)
cd /tmp/myapp && tar -cf /tmp/build-context.tar .
```

## Building Images with Python

A Python script that prepares the build context and triggers a build.

```python
import json
import os
import socket
import http.client
import tarfile
import io
import re
from urllib.parse import urlencode

def build_image(socket_path, context_dir, dockerfile, tag, build_args=None):
    # Create tar archive from the context directory
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
        for root, dirs, files in os.walk(context_dir):
            for f in files:
                filepath = os.path.join(root, f)
                arcname = os.path.relpath(filepath, context_dir)
                tar.add(filepath, arcname=arcname)
    tar_data = tar_buffer.getvalue()

    # Build the query string
    params = {
        "dockerfile": dockerfile,
        "t": tag,
        "rm": "true",
    }
    if build_args:
        params["buildargs"] = json.dumps(build_args)

    # Send the build request
    conn = http.client.HTTPConnection('localhost')
    conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    conn.sock.connect(socket_path)

    conn.request(
        'POST',
        f'/v4.0.0/libpod/build?{urlencode(params)}',
        body=tar_data,
        headers={
            'Content-Type': 'application/x-tar',
            'Content-Length': str(len(tar_data))
        }
    )

    resp = conn.getresponse()
    output = resp.read().decode()
    conn.close()

    # Parse build output
    image_id = None
    for line in output.strip().splitlines():
        if line.strip():
            try:
                data = json.loads(line)
                if 'stream' in data:
                    stream = data['stream']
                    print(stream, end='')
                    if re.fullmatch(r'[0-9a-f]{12,64}\n?', stream):
                        image_id = stream.strip()
                if 'aux' in data and isinstance(data['aux'], dict) and 'ID' in data['aux']:
                    image_id = data['aux']['ID']
                if 'error' in data:
                    raise RuntimeError(data['error'])
            except json.JSONDecodeError:
                print(line)

    return image_id


sock = f"{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
image_id = build_image(
    socket_path=sock,
    context_dir="/tmp/myapp",
    dockerfile="Containerfile",
    tag="myapp:latest",
    build_args={"APP_VERSION": "1.0.0"}
)
print(f"\nBuilt image: {image_id}")
```

## Cleaning Up Build Cache

Remove build cache and intermediate images to free disk space.

```bash
# Prune all unused images (including build intermediates)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/prune?all=true"

# Check disk usage
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/system/df | python3 -m json.tool
```

## Conclusion

Building container images through the Podman REST API follows a straightforward pattern: package your source code and Containerfile into a tar archive, send it to the build endpoint with the desired parameters, and receive a stream of build output followed by the image ID. The API supports all the features you would use from the command line, including build arguments, multi-stage builds, cache control, layer squashing, and labels. This makes it possible to integrate Podman image builds into CI/CD systems, web applications, and custom automation tools without shelling out to the command line.
