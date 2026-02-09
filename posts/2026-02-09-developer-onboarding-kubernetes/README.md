# How to Build Developer Onboarding Scripts That Auto-Configure Kubernetes Access and Tooling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, DevOps, Onboarding, Automation, Developer Experience

Description: Build automated onboarding scripts that configure Kubernetes access, install required tools, set up authentication, and create development environments to get new developers productive in minutes.

---

Onboarding new developers to Kubernetes environments often takes days. Manual setup involves installing tools, configuring cluster access, setting up authentication, understanding namespace conventions, and learning deployment procedures. Each step is error-prone and time-consuming.

Automated onboarding scripts eliminate this friction by configuring everything in one command. New team members can start contributing on day one instead of day five. This guide shows you how to build comprehensive onboarding automation.

## Understanding Onboarding Requirements

A complete onboarding script handles:

- Installing required CLI tools (kubectl, helm, etc.)
- Configuring cluster access and contexts
- Setting up authentication with identity providers
- Creating developer namespaces and RBAC permissions
- Installing development tools and plugins
- Cloning repositories and setting up projects
- Generating documentation and quickstart guides

The script should be idempotent, resumable, and platform-aware.

## Building the Master Onboarding Script

Create a comprehensive setup script:

```bash
#!/bin/bash
# onboard-developer.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DEVELOPER_EMAIL=$1
DEVELOPER_NAME=$2
TEAM=${3:-"platform"}

if [ -z "$DEVELOPER_EMAIL" ] || [ -z "$DEVELOPER_NAME" ]; then
    echo "Usage: $0 <email> <name> [team]"
    exit 1
fi

# Sanitize developer name for namespace
DEV_USERNAME=$(echo "$DEVELOPER_EMAIL" | cut -d@ -f1 | tr '[:upper:]' '[:lower:]' | tr '.' '-')

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        log_success "$1 already installed"
        return 0
    fi
    return 1
}

# Main onboarding flow
main() {
    log_info "Starting onboarding for $DEVELOPER_NAME ($DEVELOPER_EMAIL)"

    install_prerequisites
    configure_kubectl
    setup_cluster_access
    create_development_namespace
    install_kube_tools
    setup_ide_integration
    clone_repositories
    generate_documentation

    log_success "Onboarding complete!"
    show_next_steps
}

install_prerequisites() {
    log_info "Installing prerequisites..."

    # Detect OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        install_macos_tools
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        install_linux_tools
    else
        log_error "Unsupported operating system"
        exit 1
    fi
}

install_macos_tools() {
    # Install Homebrew if not present
    if ! check_command brew; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        log_success "Homebrew installed"
    fi

    # Install kubectl
    if ! check_command kubectl; then
        log_info "Installing kubectl..."
        brew install kubectl
        log_success "kubectl installed"
    fi

    # Install helm
    if ! check_command helm; then
        log_info "Installing Helm..."
        brew install helm
        log_success "Helm installed"
    fi

    # Install additional tools
    local tools=("kubectx" "k9s" "stern" "jq" "yq")
    for tool in "${tools[@]}"; do
        if ! check_command "$tool"; then
            log_info "Installing $tool..."
            brew install "$tool"
            log_success "$tool installed"
        fi
    done
}

install_linux_tools() {
    # Update package list
    sudo apt-get update -qq

    # Install kubectl
    if ! check_command kubectl; then
        log_info "Installing kubectl..."
        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
        sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
        rm kubectl
        log_success "kubectl installed"
    fi

    # Install helm
    if ! check_command helm; then
        log_info "Installing Helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
        log_success "Helm installed"
    fi

    # Install kubectx and kubens
    if ! check_command kubectx; then
        log_info "Installing kubectx and kubens..."
        sudo apt-get install -y kubectx
        log_success "kubectx and kubens installed"
    fi

    # Install k9s
    if ! check_command k9s; then
        log_info "Installing k9s..."
        curl -sS https://webinstall.dev/k9s | bash
        log_success "k9s installed"
    fi
}

configure_kubectl() {
    log_info "Configuring kubectl..."

    # Create kubeconfig directory
    mkdir -p ~/.kube

    # Backup existing kubeconfig
    if [ -f ~/.kube/config ]; then
        log_info "Backing up existing kubeconfig..."
        cp ~/.kube/config ~/.kube/config.backup.$(date +%Y%m%d-%H%M%S)
    fi

    log_success "kubectl configured"
}

setup_cluster_access() {
    log_info "Setting up cluster access..."

    # Fetch cluster configuration from central server
    CLUSTER_API="https://onboarding.company.com/api"

    # Get kubeconfig
    log_info "Fetching kubeconfig..."
    curl -sSL "$CLUSTER_API/kubeconfig?email=$DEVELOPER_EMAIL" \
        -H "Authorization: Bearer $ONBOARDING_TOKEN" \
        -o ~/.kube/company-config

    # Merge with existing kubeconfig
    if [ -f ~/.kube/config ]; then
        KUBECONFIG=~/.kube/config:~/.kube/company-config kubectl config view --flatten > ~/.kube/merged-config
        mv ~/.kube/merged-config ~/.kube/config
        rm ~/.kube/company-config
    else
        mv ~/.kube/company-config ~/.kube/config
    fi

    # Set default context
    kubectl config use-context dev-cluster

    # Test connection
    if kubectl cluster-info &> /dev/null; then
        log_success "Cluster access configured"
    else
        log_error "Failed to connect to cluster"
        exit 1
    fi
}

create_development_namespace() {
    log_info "Creating development namespace..."

    NAMESPACE="dev-$DEV_USERNAME"

    # Create namespace
    kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

    # Label namespace
    kubectl label namespace "$NAMESPACE" \
        owner="$DEVELOPER_EMAIL" \
        team="$TEAM" \
        environment="development" \
        --overwrite

    # Create resource quota
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: $NAMESPACE
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    persistentvolumeclaims: "10"
EOF

    # Create RBAC
    kubectl create rolebinding "$DEV_USERNAME-admin" \
        --clusterrole=admin \
        --user="$DEVELOPER_EMAIL" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    # Set as default namespace
    kubectl config set-context --current --namespace="$NAMESPACE"

    log_success "Development namespace created: $NAMESPACE"
}

install_kube_tools() {
    log_info "Installing Kubernetes tools..."

    # Install krew (kubectl plugin manager)
    if ! kubectl krew version &> /dev/null; then
        log_info "Installing krew..."
        (
          set -x; cd "$(mktemp -d)" &&
          OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
          ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" &&
          KREW="krew-${OS}_${ARCH}" &&
          curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
          tar zxvf "${KREW}.tar.gz" &&
          ./"${KREW}" install krew
        )
        export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"
        log_success "krew installed"
    fi

    # Install useful kubectl plugins
    local plugins=("ctx" "ns" "tree" "tail" "debug")
    for plugin in "${plugins[@]}"; do
        if ! kubectl krew list | grep -q "$plugin"; then
            log_info "Installing kubectl plugin: $plugin"
            kubectl krew install "$plugin"
        fi
    done

    log_success "Kubernetes tools installed"
}

setup_ide_integration() {
    log_info "Setting up IDE integration..."

    # VS Code extensions
    if check_command code; then
        log_info "Installing VS Code extensions..."
        code --install-extension ms-kubernetes-tools.vscode-kubernetes-tools
        code --install-extension redhat.vscode-yaml
        log_success "VS Code extensions installed"
    fi

    # Create workspace settings
    mkdir -p ~/workspace/.vscode
    cat > ~/workspace/.vscode/settings.json <<EOF
{
  "kubernetes.namespace": "$NAMESPACE",
  "kubernetes.defaultContext": "dev-cluster",
  "yaml.schemas": {
    "kubernetes": "*.yaml"
  }
}
EOF

    log_success "IDE integration configured"
}

clone_repositories() {
    log_info "Cloning repositories..."

    mkdir -p ~/workspace
    cd ~/workspace

    # Fetch repository list for team
    REPOS=$(curl -sSL "https://onboarding.company.com/api/repos?team=$TEAM" \
        -H "Authorization: Bearer $ONBOARDING_TOKEN")

    echo "$REPOS" | jq -r '.[]' | while read -r repo; do
        repo_name=$(basename "$repo" .git)
        if [ ! -d "$repo_name" ]; then
            log_info "Cloning $repo_name..."
            git clone "$repo"
        fi
    done

    log_success "Repositories cloned to ~/workspace"
}

generate_documentation() {
    log_info "Generating documentation..."

    cat > ~/workspace/QUICKSTART.md <<EOF
# Developer Quickstart Guide

## Your Environment

- **Email**: $DEVELOPER_EMAIL
- **Name**: $DEVELOPER_NAME
- **Team**: $TEAM
- **Namespace**: dev-$DEV_USERNAME
- **Cluster**: dev-cluster

## Quick Commands

\`\`\`bash
# View your pods
kubectl get pods

# View all resources
kubectl get all

# Switch to production context (read-only)
kubectx production-cluster

# Switch back to dev
kubectx dev-cluster

# View logs
kubectl logs <pod-name>

# Describe resources
kubectl describe pod <pod-name>
\`\`\`

## Common Tasks

### Deploy an application
\`\`\`bash
cd ~/workspace/myapp
kubectl apply -f k8s/
\`\`\`

### Access cluster services
\`\`\`bash
# Port forward to a service
kubectl port-forward svc/myapp 8080:80
\`\`\`

### View cluster dashboard
\`\`\`bash
k9s
\`\`\`

## Resources

- Team Wiki: https://wiki.company.com/teams/$TEAM
- Runbooks: https://wiki.company.com/runbooks
- Support: #engineering-support on Slack
EOF

    log_success "Documentation generated: ~/workspace/QUICKSTART.md"
}

show_next_steps() {
    cat <<EOF

╔════════════════════════════════════════════════════════════════╗
║                    Onboarding Complete!                        ║
╚════════════════════════════════════════════════════════════════╝

Your development environment is ready. Here are your next steps:

1. Review the quickstart guide:
   cat ~/workspace/QUICKSTART.md

2. Test your cluster access:
   kubectl get pods

3. Launch the Kubernetes dashboard:
   k9s

4. Check out your team's repositories:
   cd ~/workspace

5. Join the team Slack channel:
   #team-$TEAM

6. Read the team documentation:
   https://wiki.company.com/teams/$TEAM

Your namespace: dev-$DEV_USERNAME
Your cluster: dev-cluster

Questions? Ask in #engineering-support on Slack

Happy coding!
EOF
}

# Run main function
main
```

Make it executable:

```bash
chmod +x onboard-developer.sh
```

## Creating Team-Specific Onboarding

Build custom onboarding for different teams:

```bash
#!/bin/bash
# onboard-frontend-developer.sh

source ./onboard-developer.sh

install_frontend_tools() {
    log_info "Installing frontend-specific tools..."

    # Install Node.js
    if ! check_command node; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install node@18
        else
            curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        log_success "Node.js installed"
    fi

    # Install global npm packages
    npm install -g \
        typescript \
        @vue/cli \
        create-react-app \
        eslint

    log_success "Frontend tools installed"
}

setup_frontend_environment() {
    log_info "Setting up frontend environment..."

    # Clone frontend repositories
    cd ~/workspace
    git clone https://github.com/company/frontend-monorepo.git

    # Install dependencies
    cd frontend-monorepo
    npm install

    log_success "Frontend environment ready"
}

# Override main to add frontend-specific steps
main() {
    onboard-developer.sh::main
    install_frontend_tools
    setup_frontend_environment
}

main
```

## Building a Web-Based Onboarding Portal

Create a self-service web interface:

```javascript
// onboarding-server.js
const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/onboard', async (req, res) => {
  const { email, name, team } = req.body;

  // Validate input
  if (!email || !name || !team) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Run onboarding script
  const scriptPath = path.join(__dirname, 'onboard-developer.sh');
  const command = `${scriptPath} "${email}" "${name}" "${team}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return res.status(500).json({ error: 'Onboarding failed', details: stderr });
    }

    res.json({
      success: true,
      message: 'Onboarding complete',
      output: stdout
    });
  });
});

app.listen(3000, () => {
  console.log('Onboarding portal running on port 3000');
});
```

Automated onboarding scripts transform new developer setup from a multi-day process into a single command. Invest time building comprehensive automation, and your team gains velocity with every new hire.
