# How to Create Custom Container Images for Google Cloud Workstations with Pre-Installed Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud, Cloud Workstations, Docker, Container Images, Development Tools

Description: Learn how to build custom container images for Google Cloud Workstations that come pre-loaded with your team's specific development tools and configurations.

---

The default Cloud Workstations images are fine for getting started, but any serious development team will want to customize them. Maybe you need specific compiler versions, internal CLI tools, database clients, or language runtimes that are not in the base image. Building a custom container image for Cloud Workstations lets you bake all of that in so every developer gets a ready-to-go environment the moment they start their workstation.

The good news is that Cloud Workstations images are standard Docker images with a few conventions you need to follow. If you have ever written a Dockerfile, you already know 90% of what you need.

## How Cloud Workstation Images Work

Cloud Workstations uses a container image as the base for each workstation. The image runs as a container on a GKE node, and the developer interacts with it through a browser-based IDE or SSH. Google provides several base images that include things like VS Code, JetBrains IDEs, or just a basic Linux environment. Your custom image extends one of these base images.

The key thing to understand is that the `/home` directory is backed by a persistent disk, so anything a developer puts there survives restarts. But everything outside of `/home` comes from the container image, which means your tools and system-level packages need to be baked into the image.

## Step 1: Choose a Base Image

Google provides several base images in Artifact Registry:

```bash
# List available base images
# These are the official Cloud Workstations base images
gcloud artifacts docker images list \
    us-central1-docker.pkg.dev/cloud-workstations-images/predefined
```

The most commonly used base images are:

- `us-central1-docker.pkg.dev/cloud-workstations-images/predefined/code-oss` - VS Code (Code OSS)
- `us-central1-docker.pkg.dev/cloud-workstations-images/predefined/base-image` - Minimal base without an IDE
- `us-central1-docker.pkg.dev/cloud-workstations-images/predefined/intellij-ultimate` - JetBrains IntelliJ

## Step 2: Write Your Dockerfile

Here is a practical Dockerfile for a backend development team that works with Go, Python, and Node.js:

```dockerfile
# Dockerfile
# Custom Cloud Workstation image for backend development
FROM us-central1-docker.pkg.dev/cloud-workstations-images/predefined/code-oss:latest

# Switch to root to install system packages
USER root

# Install system dependencies and common tools
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    jq \
    unzip \
    postgresql-client \
    redis-tools \
    mysql-client \
    htop \
    tmux \
    ripgrep \
    fd-find \
    && rm -rf /var/lib/apt/lists/*

# Install Go 1.22
RUN wget -q https://go.dev/dl/go1.22.0.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz \
    && rm go1.22.0.linux-amd64.tar.gz

# Set Go environment variables globally
ENV PATH="/usr/local/go/bin:${PATH}"
ENV GOPATH="/home/user/go"

# Install Node.js 20 LTS via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.11 and pip
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install common global tools
RUN npm install -g yarn pnpm typescript ts-node

# Install Go development tools
RUN go install golang.org/x/tools/gopls@latest \
    && go install github.com/go-delve/delve/cmd/dlv@latest \
    && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Install Docker CLI (for building images from within the workstation)
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian bookworm stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
    && rm kubectl

# Install Terraform
RUN wget -q https://releases.hashicorp.com/terraform/1.7.0/terraform_1.7.0_linux_amd64.zip \
    && unzip terraform_1.7.0_linux_amd64.zip -d /usr/local/bin \
    && rm terraform_1.7.0_linux_amd64.zip

# Install VS Code extensions that should be pre-installed
# These get installed into the image so they are available immediately
RUN code-oss-cloud-workstations --install-extension golang.go \
    && code-oss-cloud-workstations --install-extension ms-python.python \
    && code-oss-cloud-workstations --install-extension dbaeumer.vscode-eslint \
    && code-oss-cloud-workstations --install-extension esbenp.prettier-vscode \
    && code-oss-cloud-workstations --install-extension hashicorp.terraform

# Copy custom shell configuration
COPY bashrc-additions /etc/bashrc-additions
RUN echo "source /etc/bashrc-additions" >> /etc/bash.bashrc

# Switch back to the default user
USER user
```

Create the accompanying bashrc additions file:

```bash
# bashrc-additions
# Custom shell settings for the development team

# Useful aliases
alias k='kubectl'
alias tf='terraform'
alias g='git'
alias gs='git status'
alias gd='git diff'
alias gl='git log --oneline -20'

# Better prompt with git branch
parse_git_branch() {
    git branch 2>/dev/null | grep '^*' | colrm 1 2
}
export PS1='\[\033[01;32m\]\u@workstation\[\033[00m\]:\[\033[01;34m\]\w\[\033[33m\] ($(parse_git_branch))\[\033[00m\]\$ '

# Set default editor
export EDITOR=vim
```

## Step 3: Build and Push the Image

Build the image and push it to Artifact Registry so Cloud Workstations can pull it.

```bash
# Create an Artifact Registry repository for your workstation images
gcloud artifacts repositories create workstation-images \
    --project=my-project \
    --location=us-central1 \
    --repository-format=docker \
    --description="Custom Cloud Workstation images"

# Configure Docker authentication for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the image
docker build -t us-central1-docker.pkg.dev/my-project/workstation-images/backend-dev:v1.0 .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/workstation-images/backend-dev:v1.0

# Also tag as latest for convenience
docker tag us-central1-docker.pkg.dev/my-project/workstation-images/backend-dev:v1.0 \
    us-central1-docker.pkg.dev/my-project/workstation-images/backend-dev:latest
docker push us-central1-docker.pkg.dev/my-project/workstation-images/backend-dev:latest
```

## Step 4: Update the Workstation Configuration

Point your workstation configuration at the custom image:

```bash
# Update the workstation configuration to use your custom image
gcloud workstations configs update backend-config \
    --project=my-project \
    --region=us-central1 \
    --cluster=dev-cluster \
    --container-custom-image=us-central1-docker.pkg.dev/my-project/workstation-images/backend-dev:latest
```

New workstations created from this configuration will use your custom image. Existing workstations will pick up the new image the next time they are restarted.

## Step 5: Set Up Automated Image Builds

You want your workstation image to stay up to date with the latest security patches and tool versions. Use Cloud Build to automate the build process:

```yaml
# cloudbuild.yaml
# Automated build pipeline for the workstation image
steps:
  # Build the Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/workstation-images/backend-dev:$SHORT_SHA'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/workstation-images/backend-dev:latest'
      - '.'

  # Push both tags
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', 'us-central1-docker.pkg.dev/$PROJECT_ID/workstation-images/backend-dev']

# Build images in the same region as your Artifact Registry
options:
  machineType: 'E2_HIGHCPU_8'  # Faster builds with more CPU
```

Set up a Cloud Build trigger that fires on changes to your Dockerfile repository, and your team always gets the latest tools without anyone manually rebuilding images.

## Tips for Keeping Images Lean

Custom images can get bloated quickly. A few practices to keep them manageable:

Clean up apt caches in the same RUN instruction where you install packages. This prevents cached package lists from inflating the image layers.

Combine related installations into single RUN commands. Each RUN creates a new layer, and layers add up.

Use multi-stage builds if you need to compile tools from source. Compile in a builder stage and copy just the binary to the final image.

Pin specific versions for critical tools. Using "latest" means your image can break unpredictably when upstream tools release breaking changes.

## Summary

Custom container images for Cloud Workstations give your team a consistent, fully loaded development environment without the usual setup friction. Start from a Google-provided base image, add your tools and configurations in a Dockerfile, push to Artifact Registry, and point your workstation configuration at it. Automate the build with Cloud Build and your team always has a current, ready-to-use environment.
