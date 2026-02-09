# How to Build Devcontainers with Kubernetes CLI Tools and Cluster Access Pre-Configured

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevEx, Development

Description: Learn how to create development containers with pre-configured Kubernetes CLI tools, cluster access, and development dependencies for consistent, reproducible development environments.

---

Setting up a Kubernetes development environment requires installing multiple CLI tools, configuring cluster access, managing credentials, and ensuring everyone on the team has compatible tool versions. This manual setup is error-prone, time-consuming, and leads to the classic "works on my machine" problems. Development containers solve this by packaging the entire development environment into a container that runs identically across machines.

With properly configured devcontainers, developers can start coding within minutes with all Kubernetes tools pre-installed, cluster authentication configured, and development dependencies ready. In this guide, you'll learn how to build comprehensive devcontainers for Kubernetes development.

## Understanding Devcontainer Architecture

Devcontainers are Docker containers specifically configured for development, integrated with VS Code or other IDEs. They package not just your application but the entire development toolchain including CLI tools, SDKs, editors, debuggers, and configurations.

For Kubernetes development, this means including kubectl, helm, kustomize, and other essential tools, mounting your local kubeconfig for cluster access, providing authentication helpers and credential management, and pre-configuring development workflows and scripts.

The devcontainer specification uses a devcontainer.json file that defines the container configuration, VS Code extensions, environment variables, and post-create commands.

## Creating a Basic Kubernetes Devcontainer

Start with a Dockerfile that includes essential Kubernetes tools:

```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# Avoid prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    vim \
    jq \
    bash-completion \
    && rm -rf /var/lib/apt/lists/*

# Install kubectl
RUN curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.28/deb/Release.key | \
    gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg && \
    echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.28/deb/ /' | \
    tee /etc/apt/sources.list.d/kubernetes.list && \
    apt-get update && \
    apt-get install -y kubectl && \
    rm -rf /var/lib/apt/lists/*

# Install Helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install kustomize
RUN curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash && \
    mv kustomize /usr/local/bin/

# Install k9s for cluster management
RUN curl -sS https://webi.sh/k9s | sh && \
    mv ~/.local/bin/k9s /usr/local/bin/

# Install kubectx and kubens
RUN git clone https://github.com/ahmetb/kubectx /opt/kubectx && \
    ln -s /opt/kubectx/kubectx /usr/local/bin/kubectx && \
    ln -s /opt/kubectx/kubens /usr/local/bin/kubens

# Install stern for log streaming
RUN curl -L https://github.com/stern/stern/releases/download/v1.28.0/stern_1.28.0_linux_amd64.tar.gz | \
    tar xz && mv stern /usr/local/bin/

# Install yq for YAML processing
RUN wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/local/bin/yq && \
    chmod +x /usr/local/bin/yq

# Install kind for local clusters
RUN curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 && \
    chmod +x ./kind && \
    mv ./kind /usr/local/bin/kind

# Install additional useful tools
RUN apt-get update && apt-get install -y \
    httpie \
    iproute2 \
    iputils-ping \
    netcat \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Enable bash completion for kubectl
RUN kubectl completion bash > /etc/bash_completion.d/kubectl

# Set up non-root user
ARG USERNAME=vscode
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Create user with sudo access
RUN groupadd --gid $USER_GID $USERNAME \
    && useradd --uid $USER_UID --gid $USER_GID -m $USERNAME \
    && apt-get update \
    && apt-get install -y sudo \
    && echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME \
    && chmod 0440 /etc/sudoers.d/$USERNAME \
    && rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER $USERNAME

# Set working directory
WORKDIR /workspace

# Configure shell
RUN echo 'source /etc/bash_completion' >> ~/.bashrc && \
    echo 'alias k=kubectl' >> ~/.bashrc && \
    echo 'complete -F __start_kubectl k' >> ~/.bashrc && \
    echo 'export PS1="\[\e[36m\]k8s-dev\[\e[m\] \[\e[33m\]\w\[\e[m\] > "' >> ~/.bashrc
```

Create the devcontainer configuration:

```json
{
  "name": "Kubernetes Development",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "USERNAME": "vscode"
    }
  },

  "mounts": [
    "source=${localEnv:HOME}/.kube,target=/home/vscode/.kube,type=bind,consistency=cached",
    "source=${localEnv:HOME}/.aws,target=/home/vscode/.aws,type=bind,consistency=cached",
    "source=${localEnv:HOME}/.config/gcloud,target=/home/vscode/.config/gcloud,type=bind,consistency=cached"
  ],

  "remoteEnv": {
    "KUBECONFIG": "/home/vscode/.kube/config"
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-kubernetes-tools.vscode-kubernetes-tools",
        "redhat.vscode-yaml",
        "ms-azuretools.vscode-docker",
        "hashicorp.terraform",
        "golang.go",
        "ms-python.python",
        "eamodio.gitlens",
        "github.copilot"
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "bash",
        "yaml.schemas": {
          "kubernetes": "*.yaml"
        },
        "yaml.customTags": [
          "!And",
          "!Base64",
          "!Cidr",
          "!FindInMap sequence",
          "!GetAtt",
          "!GetAZs",
          "!If",
          "!ImportValue",
          "!Join sequence",
          "!Not",
          "!Or",
          "!Ref",
          "!Select sequence",
          "!Split sequence",
          "!Sub"
        ]
      }
    }
  },

  "forwardPorts": [8080, 9090, 3000],

  "postCreateCommand": "bash .devcontainer/post-create.sh",

  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  }
}
```

## Creating Setup and Initialization Scripts

Create a post-create script to set up the environment:

```bash
#!/bin/bash
# .devcontainer/post-create.sh

set -e

echo "=========================================="
echo "Configuring Kubernetes Development Environment"
echo "=========================================="

# Check if kubectl is configured
if [ -f ~/.kube/config ]; then
    echo "✓ Kubeconfig found"

    # Test cluster connectivity
    if kubectl cluster-info &> /dev/null; then
        echo "✓ Cluster connectivity verified"
        kubectl version --short 2>/dev/null || kubectl version
    else
        echo "⚠ Warning: Cannot connect to cluster. Check your kubeconfig."
    fi
else
    echo "⚠ No kubeconfig found. You'll need to configure cluster access."
fi

# Install additional development tools
echo "Installing development dependencies..."

# Install language-specific tools if needed
if [ -f "go.mod" ]; then
    echo "Go project detected, installing Go dependencies..."
    go mod download
fi

if [ -f "package.json" ]; then
    echo "Node.js project detected, installing npm dependencies..."
    npm install
fi

if [ -f "requirements.txt" ]; then
    echo "Python project detected, installing pip dependencies..."
    pip install -r requirements.txt
fi

# Set up useful aliases
cat >> ~/.bashrc << 'EOF'

# Kubernetes aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get services'
alias kgd='kubectl get deployments'
alias kga='kubectl get all'
alias kaf='kubectl apply -f'
alias kdel='kubectl delete'
alias kdes='kubectl describe'
alias klogs='kubectl logs'
alias kexec='kubectl exec -it'

# Helm aliases
alias h='helm'
alias hls='helm list'
alias hin='helm install'
alias hup='helm upgrade'
alias hdel='helm delete'

# Namespace switching
alias kns='kubens'
alias kctx='kubectx'

# Quick namespace switch function
function kn() {
    if [ -z "$1" ]; then
        kubectl config view --minify --output 'jsonpath={..namespace}'
        echo ""
    else
        kubectl config set-context --current --namespace=$1
    fi
}

# Get pod logs with automatic selection
function klf() {
    kubectl logs -f $(kubectl get pods -o name | fzf | sed 's/pod\///')
}

# Port forward with easy selection
function kpf() {
    local pod=$(kubectl get pods -o name | fzf | sed 's/pod\///')
    local port=${1:-8080}
    kubectl port-forward $pod $port:$port
}

EOF

# Install fzf for interactive selection
git clone --depth 1 https://github.com/junegunn/fzf.git ~/.fzf
~/.fzf/install --all --no-update-rc

# Configure kubectl plugins directory
mkdir -p ~/.kube/plugins

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Available commands:"
echo "  kubectl (k)   - Kubernetes CLI"
echo "  helm (h)      - Package manager"
echo "  k9s           - Terminal UI"
echo "  kubectx       - Context switcher"
echo "  kubens (kns)  - Namespace switcher"
echo "  stern         - Multi-pod log viewer"
echo ""
echo "Run 'kubectl get nodes' to verify cluster access"
echo ""
```

## Creating Development Helper Scripts

Add helper scripts for common tasks:

```bash
#!/bin/bash
# .devcontainer/scripts/dev-helpers.sh

# Create a new namespace with common resources
create_dev_namespace() {
    local namespace=$1
    if [ -z "$namespace" ]; then
        echo "Usage: create_dev_namespace <namespace-name>"
        return 1
    fi

    echo "Creating namespace: $namespace"
    kubectl create namespace $namespace

    # Set as default namespace
    kubectl config set-context --current --namespace=$namespace

    # Create default service account with necessary permissions
    kubectl create serviceaccount developer -n $namespace

    # Create role for development
    kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: $namespace
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developer-binding
  namespace: $namespace
subjects:
- kind: ServiceAccount
  name: developer
  namespace: $namespace
roleRef:
  kind: Role
  name: developer
  apiGroup: rbac.authorization.k8s.io
EOF

    echo "Namespace $namespace created and configured"
}

# Quick deploy from current directory
quick_deploy() {
    local name=${1:-app}
    local image=${2:-nginx:latest}
    local port=${3:-8080}

    kubectl create deployment $name --image=$image
    kubectl expose deployment $name --port=$port --target-port=$port
    kubectl wait --for=condition=available --timeout=60s deployment/$name

    echo "Deployment $name created and exposed on port $port"
}

# Watch pod status with details
watch_pods() {
    local namespace=${1:-$(kubectl config view --minify --output 'jsonpath={..namespace}')}
    watch -n 2 "kubectl get pods -n $namespace -o wide"
}

# Get all resources in namespace
get_all_resources() {
    local namespace=${1:-$(kubectl config view --minify --output 'jsonpath={..namespace}')}
    kubectl api-resources --verbs=list --namespaced -o name | \
        xargs -n 1 kubectl get --show-kind --ignore-not-found -n $namespace
}

# Debug pod issues
debug_pod() {
    local pod=$1
    if [ -z "$pod" ]; then
        echo "Usage: debug_pod <pod-name>"
        return 1
    fi

    echo "=== Pod Description ==="
    kubectl describe pod $pod

    echo ""
    echo "=== Pod Logs ==="
    kubectl logs $pod --tail=50

    echo ""
    echo "=== Pod Events ==="
    kubectl get events --field-selector involvedObject.name=$pod
}

# Export these functions
export -f create_dev_namespace
export -f quick_deploy
export -f watch_pods
export -f get_all_resources
export -f debug_pod
```

## Advanced Devcontainer with Multiple Clusters

Create a devcontainer that supports multiple Kubernetes clusters:

```json
{
  "name": "Multi-Cluster Kubernetes Dev",
  "build": {
    "dockerfile": "Dockerfile"
  },

  "mounts": [
    "source=${localEnv:HOME}/.kube,target=/home/vscode/.kube,type=bind,consistency=cached",
    "source=${localEnv:HOME}/.aws,target=/home/vscode/.aws,type=bind,consistency=cached",
    "source=${localEnv:HOME}/.config/gcloud,target=/home/vscode/.config/gcloud,type=bind,consistency=cached",
    "source=${localEnv:HOME}/.azure,target=/home/vscode/.azure,type=bind,consistency=cached"
  ],

  "remoteEnv": {
    "KUBECONFIG": "/home/vscode/.kube/config",
    "AWS_PROFILE": "${localEnv:AWS_PROFILE}",
    "GOOGLE_APPLICATION_CREDENTIALS": "/home/vscode/.config/gcloud/application_default_credentials.json"
  },

  "postCreateCommand": "bash -c 'source .devcontainer/post-create.sh && source .devcontainer/scripts/dev-helpers.sh'",

  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/aws-cli:1": {},
    "ghcr.io/devcontainers/features/azure-cli:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {},
    "ghcr.io/devcontainers/features/terraform:1": {}
  },

  "customizations": {
    "vscode": {
      "extensions": [
        "ms-kubernetes-tools.vscode-kubernetes-tools",
        "ms-vscode.makefile-tools",
        "redhat.vscode-yaml",
        "ms-azuretools.vscode-docker"
      ]
    }
  }
}
```

## Creating Cluster-Specific Profiles

Add support for different cluster configurations:

```bash
#!/bin/bash
# .devcontainer/scripts/cluster-profiles.sh

# Load cluster profile
load_cluster_profile() {
    local profile=$1

    case $profile in
        "local")
            export KUBECONFIG=~/.kube/config-kind
            export KUBE_CONTEXT=kind-local
            echo "Loaded local (kind) cluster profile"
            ;;
        "dev")
            export KUBECONFIG=~/.kube/config-dev
            export KUBE_CONTEXT=dev-cluster
            export AWS_PROFILE=development
            echo "Loaded development cluster profile"
            ;;
        "staging")
            export KUBECONFIG=~/.kube/config-staging
            export KUBE_CONTEXT=staging-cluster
            export AWS_PROFILE=staging
            echo "Loaded staging cluster profile"
            ;;
        "prod")
            export KUBECONFIG=~/.kube/config-prod
            export KUBE_CONTEXT=prod-cluster
            export AWS_PROFILE=production
            echo "⚠️  WARNING: Production cluster profile loaded"
            ;;
        *)
            echo "Unknown profile: $profile"
            echo "Available profiles: local, dev, staging, prod"
            return 1
            ;;
    esac

    kubectl config use-context $KUBE_CONTEXT
    kubectl cluster-info
}

# Quick profile switcher alias
alias kprofile='load_cluster_profile'

export -f load_cluster_profile
```

## Adding Pre-Commit Hooks and Validation

Include validation tools in the devcontainer:

```bash
#!/bin/bash
# .devcontainer/scripts/setup-validation.sh

# Install pre-commit
pip install pre-commit

# Install kubeval for manifest validation
wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
tar xf kubeval-linux-amd64.tar.gz
sudo mv kubeval /usr/local/bin/
rm kubeval-linux-amd64.tar.gz

# Install yamllint
pip install yamllint

# Install hadolint for Dockerfile linting
wget -O /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64
chmod +x /usr/local/bin/hadolint

# Set up pre-commit hooks
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/adrienverge/yamllint
    rev: v1.32.0
    hooks:
      - id: yamllint

  - repo: local
    hooks:
      - id: kubeval
        name: Validate Kubernetes manifests
        entry: kubeval
        language: system
        files: ^k8s/.*\.yaml$
EOF

pre-commit install
```

Development containers with pre-configured Kubernetes tools provide consistent, reproducible development environments that eliminate setup time and configuration drift. By packaging CLI tools, cluster access, and development workflows into a container, teams can onboard new developers quickly and ensure everyone works with the same tools and configurations regardless of their local machine setup.
