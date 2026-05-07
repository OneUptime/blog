# How to Use Podman for Ephemeral Development Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Development Environment, DevOps, Ephemeral

Description: Learn how to use Podman to create lightweight, ephemeral development environments that spin up instantly and leave no trace when destroyed.

---

> Ephemeral development environments built with Podman give every developer a clean, reproducible workspace that can be created in seconds and destroyed without consequence.

Setting up a consistent development environment across a team has always been one of the most frustrating challenges in software engineering. Different operating systems, conflicting library versions, and subtle configuration differences lead to the classic "works on my machine" problem. Podman offers an elegant solution by letting you create ephemeral development environments that are identical every time, require no persistent state, and can be torn down the moment you are done.

Unlike Docker, Podman runs containers without a daemon process and supports rootless containers out of the box, making it a natural fit for development workflows where security and simplicity matter.

---

## Why Ephemeral Environments Matter

Traditional development setups accumulate cruft over time. Dependencies get installed globally, configuration files drift, and the gap between your local environment and production widens. Ephemeral environments solve this by treating your workspace as disposable infrastructure. Every session starts clean, and nothing persists unless you explicitly choose to save it.

This approach offers several advantages. You can experiment freely without worrying about breaking your setup. Onboarding new developers becomes trivial since the environment definition is version-controlled. And you eliminate an entire class of bugs that stem from environmental differences.

## Installing Podman

Before creating ephemeral environments, make sure Podman is installed on your system.

On Fedora:

```bash
sudo dnf -y install podman
```

On Debian 11+ or Ubuntu 20.10+:

```bash
sudo apt-get update
sudo apt-get -y install podman
```

On macOS:

```bash
brew install podman
podman machine init
podman machine start
```

Verify the installation:

```bash
podman info
```

## Creating a Basic Ephemeral Environment

The simplest ephemeral environment is a container you run interactively and remove when you exit. Here is an example for a Node.js development environment:

```bash
podman run --rm -it \
  -v $(pwd):/workspace:Z \
  -w /workspace \
  -p 3000:3000 \
  node:20-bookworm \
  bash
```

The `--rm` flag is the key to ephemeral behavior. It tells Podman to automatically remove the container when it exits. The `-v` flag mounts your current directory into the container so your code is accessible, while `-w` sets the working directory inside the container.

Once inside, you can install dependencies, run your application, and do all your development work. When you exit the shell, the container vanishes along with any globally installed packages or system-level changes.

## Building a Custom Development Image

For a more tailored experience, create a Containerfile that includes all the tools your project needs:

```dockerfile
FROM fedora:40

RUN dnf install -y \
    nodejs \
    npm \
    git \
    vim \
    ripgrep \
    fd-find \
    jq \
    && dnf clean all

RUN npm install -g typescript ts-node eslint prettier

WORKDIR /workspace

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["bash"]
```

Create the entrypoint script that sets up the environment on each launch:

```bash
#!/bin/bash
# entrypoint.sh

# Install project dependencies if package.json exists

if [ -f "package.json" ]; then
    echo "Installing project dependencies..."
    npm install --silent
fi

# Execute the command passed to the container
exec "$@"
```

Build the image:

```bash
podman build -t dev-env:latest .
```

Now launch your ephemeral environment with a single command:

```bash
podman run --rm -it \
  -v $(pwd):/workspace:Z \
  -p 3000:3000 \
  dev-env:latest
```

## Using Podman Compose for Multi-Service Environments

Real applications often depend on databases, caches, and other services. Podman's `podman compose` command is a thin wrapper around an external Compose provider such as `docker-compose` or `podman-compose`. You can define a complete ephemeral stack using a compose file:

```yaml
# compose.yaml
services:
  dev:
    build: .
    volumes:
      - .:/workspace:Z
    ports:
      - "3000:3000"
    depends_on:
      - db
      - redis
    stdin_open: true
    tty: true

  db:
    image: postgres:16
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: myapp_dev
    tmpfs:
      - /var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    tmpfs:
      - /data
```

Notice the `tmpfs` mounts on the database and Redis services. This stores their data in memory rather than on disk, reinforcing the ephemeral nature of the environment. When you bring the stack down, all data disappears.

```bash
podman compose up -d
podman compose exec dev bash
# Do your work...
podman compose down
```

## Environment Variables

Ephemeral environments often need configuration without baking development-only values into images. Use environment files:

```bash
# dev.env
DATABASE_URL=postgresql://dev:devpass@db:5432/myapp_dev
REDIS_URL=redis://redis:6379
API_KEY=dev-only-key
NODE_ENV=development
```

Pass the file when launching your container:

```bash
podman run --rm -it \
  --env-file dev.env \
  -v $(pwd):/workspace:Z \
  dev-env:latest
```

## Shell Aliases for Quick Access

Create shell aliases to make launching environments effortless:

```bash
# Add to ~/.bashrc or ~/.zshrc

alias devenv='podman run --rm -it -v $(pwd):/workspace:Z -p 3000:3000 dev-env:latest'
alias pyenv='podman run --rm -it -v $(pwd):/workspace:Z python:3.12 bash'
alias goenv='podman run --rm -it -v $(pwd):/workspace:Z golang:1.22 bash'
alias rustenv='podman run --rm -it -v $(pwd):/workspace:Z rust:latest bash'
```

Now starting a development environment is as simple as typing `devenv` in your terminal.

## Persisting Only What Matters

While ephemeral environments are disposable by design, you often want to persist certain things between sessions. Named volumes let you cache dependencies without polluting the container:

```bash
podman volume create node_modules_cache

podman run --rm -it \
  -v $(pwd):/workspace:Z \
  -v node_modules_cache:/workspace/node_modules \
  -p 3000:3000 \
  dev-env:latest
```

This mounts a persistent volume for `node_modules` so you do not have to reinstall dependencies every time you start a new container. The rest of the environment remains ephemeral.

## Cleanup and Maintenance

Even with ephemeral containers, images and volumes can accumulate. Periodically clean up unused resources:

```bash
# Remove all stopped containers
podman container prune -f

# Remove unused images
podman image prune -f

# Remove unused volumes
podman volume prune -f

# Nuclear option: remove everything
podman system prune -af --volumes
```

## Conclusion

Podman makes ephemeral development environments practical and straightforward. By treating your development workspace as disposable infrastructure, you gain reproducibility, eliminate environmental drift, and free yourself to experiment without fear. The rootless, daemonless architecture of Podman adds a layer of security that makes this approach even more appealing for teams that care about their development workflow. Start with a simple `podman run --rm -it` command and build from there as your needs grow.
