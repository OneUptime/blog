# How to Run Terraform in a Docker Container

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, Containers, DevOps, Infrastructure as Code, CI/CD

Description: Learn how to run Terraform inside Docker containers for consistent environments, CI/CD pipelines, and isolated execution without installing Terraform locally.

---

Running Terraform inside a Docker container gives you a clean, reproducible environment without installing anything on your host machine. This is particularly useful for CI/CD pipelines, team environments where everyone needs the same Terraform version, and situations where you want complete isolation between projects.

In this guide, I will cover using the official HashiCorp Terraform Docker image, building custom images, and handling real-world concerns like credentials and state management.

## Using the Official Terraform Docker Image

HashiCorp publishes official Terraform images on Docker Hub. Each version gets its own tag:

```bash
# Pull a specific Terraform version
docker pull hashicorp/terraform:1.7.5

# Pull the latest version
docker pull hashicorp/terraform:latest

# Check available tags at: https://hub.docker.com/r/hashicorp/terraform/tags
```

### Running a Simple Command

```bash
# Check the Terraform version inside the container
docker run --rm hashicorp/terraform:1.7.5 version
```

The `--rm` flag removes the container after it exits, keeping things clean.

### Running Terraform Against Your Configuration

Mount your project directory into the container:

```bash
# Navigate to your Terraform project
cd ~/projects/my-infrastructure

# Run terraform init
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 init

# Run terraform plan
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 plan

# Run terraform apply
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 apply -auto-approve
```

Breaking down the flags:
- `-v $(pwd):/workspace` mounts the current directory into the container at `/workspace`
- `-w /workspace` sets the working directory inside the container
- `--rm` cleans up the container when done

## Passing Cloud Credentials

Terraform needs access to your cloud provider credentials. There are several ways to pass them into the container.

### Method 1 - Environment Variables

```bash
# Pass AWS credentials as environment variables
docker run --rm \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 plan
```

When you use `-e AWS_ACCESS_KEY_ID` without a value, Docker passes through the variable from your host environment.

### Method 2 - Mount Credential Files

```bash
# Mount the AWS credentials file
docker run --rm \
  -v $(pwd):/workspace \
  -v ~/.aws:/root/.aws:ro \
  -w /workspace \
  hashicorp/terraform:1.7.5 plan
```

The `:ro` flag mounts the directory as read-only, preventing the container from modifying your credentials.

For Azure:

```bash
# Mount Azure CLI credentials
docker run --rm \
  -v $(pwd):/workspace \
  -v ~/.azure:/root/.azure:ro \
  -w /workspace \
  hashicorp/terraform:1.7.5 plan
```

For GCP:

```bash
# Mount GCP service account key
docker run --rm \
  -v $(pwd):/workspace \
  -v /path/to/service-account.json:/credentials/sa.json:ro \
  -e GOOGLE_APPLICATION_CREDENTIALS=/credentials/sa.json \
  -w /workspace \
  hashicorp/terraform:1.7.5 plan
```

### Method 3 - Environment File

Create a file with your environment variables:

```bash
# Create an env file (do NOT commit this to Git)
cat > .env.terraform <<EOF
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
EOF

# Pass the env file to Docker
docker run --rm \
  --env-file .env.terraform \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 plan
```

Add `.env.terraform` to your `.gitignore` immediately.

## Creating Shell Aliases

Typing the full Docker command every time is tedious. Create aliases:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias terraform='docker run --rm \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION \
  -e AWS_SESSION_TOKEN \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5'
```

Now you can use `terraform` as if it were installed locally:

```bash
terraform init
terraform plan
terraform apply
```

## Building a Custom Terraform Docker Image

The official image is minimal. If you need additional tools (like `aws` CLI, `jq`, `curl`, or custom scripts), build a custom image:

```dockerfile
# Dockerfile
FROM hashicorp/terraform:1.7.5

# Install additional tools
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    python3 \
    py3-pip \
    git

# Install AWS CLI
RUN pip3 install awscli --break-system-packages

# Install Azure CLI (if needed)
# RUN pip3 install azure-cli --break-system-packages

# Set working directory
WORKDIR /workspace

# Default entrypoint is already terraform
```

Build and use it:

```bash
# Build the custom image
docker build -t terraform-custom:1.7.5 .

# Use it like the official image
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  terraform-custom:1.7.5 plan
```

## Using Docker Compose

For projects that use Terraform regularly, a `docker-compose.yml` simplifies the setup:

```yaml
# docker-compose.yml
version: '3.8'

services:
  terraform:
    image: hashicorp/terraform:1.7.5
    working_dir: /workspace
    volumes:
      - .:/workspace
      - ~/.aws:/root/.aws:ro
    environment:
      - AWS_DEFAULT_REGION=us-east-1
      - TF_LOG=${TF_LOG:-}
    entrypoint: [""]
    command: ["terraform", "plan"]
```

Run commands:

```bash
# Run terraform plan
docker compose run --rm terraform terraform plan

# Run terraform apply
docker compose run --rm terraform terraform apply

# Run terraform init
docker compose run --rm terraform terraform init
```

## Handling State Files

When running Terraform in Docker, state file management requires attention.

### Local State

If you use local state files, they are written to the mounted volume and persist on your host filesystem. This works fine:

```bash
# State file is written to your project directory on the host
ls -la terraform.tfstate
```

### Remote State

Remote backends (S3, Azure Storage, GCS) work seamlessly because the container has network access. Just make sure credentials for the backend are passed to the container:

```bash
# Remote state works as long as credentials are available
docker run --rm \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 init
```

## Plugin Caching with Docker

Provider downloads inside Docker containers are ephemeral - they disappear when the container is removed. To avoid re-downloading providers every time, mount a cache volume:

```bash
# Create a persistent provider cache
docker volume create terraform-plugin-cache

# Use the cache volume
docker run --rm \
  -v $(pwd):/workspace \
  -v terraform-plugin-cache:/root/.terraform.d/plugin-cache \
  -e TF_PLUGIN_CACHE_DIR=/root/.terraform.d/plugin-cache \
  -w /workspace \
  hashicorp/terraform:1.7.5 init
```

## CI/CD Pipeline Integration

Docker-based Terraform is natural in CI/CD pipelines. Here are examples for popular platforms.

### GitHub Actions

```yaml
name: Terraform Plan
on: [pull_request]

jobs:
  plan:
    runs-on: ubuntu-latest
    container:
      image: hashicorp/terraform:1.7.5
    steps:
      - uses: actions/checkout@v4
      - name: Terraform Init
        run: terraform init
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      - name: Terraform Plan
        run: terraform plan
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### GitLab CI

```yaml
stages:
  - plan
  - apply

terraform_plan:
  stage: plan
  image: hashicorp/terraform:1.7.5
  script:
    - terraform init
    - terraform plan -out=plan.tfplan
  artifacts:
    paths:
      - plan.tfplan

terraform_apply:
  stage: apply
  image: hashicorp/terraform:1.7.5
  script:
    - terraform init
    - terraform apply plan.tfplan
  when: manual
  only:
    - main
```

## Troubleshooting

### Permission Denied Errors

If you get permission errors on the mounted volume:

```bash
# Run as your user ID to avoid permission issues
docker run --rm \
  -u $(id -u):$(id -g) \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 init
```

### Network Issues

If Terraform cannot reach provider registries from inside the container:

```bash
# Check DNS resolution inside the container
docker run --rm hashicorp/terraform:1.7.5 sh -c "nslookup registry.terraform.io"

# Use host networking if needed
docker run --rm \
  --network host \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 init
```

### Interactive Commands

Some Terraform commands expect interactive input. Use the `-it` flag:

```bash
# Run terraform console interactively
docker run --rm -it \
  -v $(pwd):/workspace \
  -w /workspace \
  hashicorp/terraform:1.7.5 console
```

## Conclusion

Running Terraform in Docker containers provides consistency, isolation, and portability. You get exact version pinning without installing anything on your host, the same environment across development and CI/CD, and easy version switching by changing a tag. The main tradeoff is the extra complexity of passing credentials and managing volumes, but once you set up the aliases or Docker Compose configuration, it becomes second nature.
