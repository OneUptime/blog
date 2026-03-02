# How to Install and Configure direnv on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, direnv, Development, Shell, Environment Variable

Description: Set up direnv on Ubuntu to automatically load and unload environment variables when entering and leaving project directories, keeping secrets out of your shell profile.

---

direnv is a shell extension that loads and unloads environment variables based on which directory you are in. When you `cd` into a directory that has a `.envrc` file, direnv automatically sets the variables defined there. When you leave the directory, those variables are unloaded. This means you can keep per-project credentials, PATH additions, and configuration in a `.envrc` file without cluttering your shell profile or accidentally using the wrong credentials in the wrong project.

## Prerequisites

- Ubuntu 22.04 or newer
- bash or zsh shell
- Root or sudo access

## Installation

### Method 1: Ubuntu Package Repository

```bash
# Install from Ubuntu repositories
sudo apt update
sudo apt install -y direnv

# Verify installation
direnv --version
```

### Method 2: Binary Release (Latest Version)

```bash
# Download the latest direnv binary
DIRENV_VERSION=$(curl -s https://api.github.com/repos/direnv/direnv/releases/latest \
  | grep '"tag_name":' | sed 's/.*"v\([^"]*\)".*/\1/')

wget "https://github.com/direnv/direnv/releases/download/v${DIRENV_VERSION}/direnv.linux-amd64" \
  -O /tmp/direnv

sudo install /tmp/direnv /usr/local/bin/direnv
direnv --version
```

## Shell Hook Setup

direnv needs to be hooked into your shell so it can intercept directory changes. Add the hook to your shell's configuration file.

### For bash

```bash
# Add the direnv hook to ~/.bashrc
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc

# Reload the shell configuration
source ~/.bashrc
```

### For zsh

```bash
# Add the direnv hook to ~/.zshrc
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# Reload
source ~/.zshrc
```

### For fish

```bash
# For fish shell, add to ~/.config/fish/config.fish
echo 'direnv hook fish | source' >> ~/.config/fish/config.fish
```

## Basic Usage

### Creating Your First .envrc

```bash
# Create a test directory
mkdir ~/test-project
cd ~/test-project

# Create a .envrc file
cat > .envrc <<'EOF'
# Project-specific environment variables
export DATABASE_URL="postgresql://user:pass@localhost/myapp_dev"
export API_KEY="dev-key-abc123"
export DEBUG=true

# Add project-specific binaries to PATH
export PATH="$PWD/bin:$PATH"

# Set project name
export APP_NAME="myapp"
EOF

# Allow direnv to load this .envrc
# You MUST run this explicitly - direnv never loads an unapproved file
direnv allow

# You should see output like:
# direnv: loading ~/test-project/.envrc
# direnv: export +API_KEY +APP_NAME +DATABASE_URL +DEBUG ~PATH
```

### Verifying Variables Are Loaded

```bash
# Check that the variables are set
echo $DATABASE_URL
echo $API_KEY

# Navigate away and verify they are unloaded
cd ~
echo $DATABASE_URL
# Empty - the variable is gone

# Go back and they reload automatically
cd ~/test-project
echo $DATABASE_URL
# postgresql://user:pass@localhost/myapp_dev
```

### Blocking a .envrc from Loading

```bash
# If a .envrc changes or you want to temporarily block it
direnv deny

# You will see: direnv: error ~/test-project/.envrc is blocked
# Re-allow when ready:
direnv allow
```

## Common .envrc Patterns

### Loading Different Configs per Environment

```bash
cat > .envrc <<'EOF'
# Load environment-specific config
ENV=${ENV:-development}

case "$ENV" in
  development)
    export DATABASE_URL="postgresql://localhost/myapp_dev"
    export LOG_LEVEL="debug"
    ;;
  staging)
    export DATABASE_URL="postgresql://staging-db/myapp_staging"
    export LOG_LEVEL="info"
    ;;
  *)
    echo "Unknown ENV: $ENV"
    exit 1
    ;;
esac

export APP_ENV="$ENV"
EOF

direnv allow

# Load staging config
ENV=staging direnv reload
# Or set ENV before entering the directory:
export ENV=staging
cd ~/test-project
```

### Using a .env File with direnv

Many projects already have a `.env` file (used by Docker Compose, Python dotenv, etc.). Load it with direnv:

```bash
cat > .envrc <<'EOF'
# Load variables from .env file if it exists
if [ -f .env ]; then
  dotenv
fi
EOF

# Create a .env file
cat > .env <<'EOF'
DATABASE_URL=postgresql://localhost/myapp
SECRET_KEY=my-secret-key
EOF

direnv allow
# direnv will now load .env automatically
```

### Python Virtual Environments

direnv can activate Python virtual environments automatically:

```bash
cat > .envrc <<'EOF'
# Create virtual environment if it doesn't exist
if [ ! -d .venv ]; then
  echo "Creating Python virtual environment..."
  python3 -m venv .venv
fi

# Activate the virtual environment
source .venv/bin/activate
EOF

direnv allow

# Now when you cd into the project, the venv activates automatically
# When you leave, it deactivates
python --version  # Uses the project's Python
```

### Node.js / nvm Version Management

```bash
cat > .envrc <<'EOF'
# Load the Node version specified in .nvmrc
use_nvm() {
  local node_version
  node_version=$(cat .nvmrc 2>/dev/null || echo "default")

  if ! nvm_is_alias "$node_version" &>/dev/null; then
    nvm install "$node_version"
  fi

  nvm use "$node_version"
}

# Or simpler: just load the correct NVM version
source $HOME/.nvm/nvm.sh
nvm use   # Uses version from .nvmrc
EOF

echo "18.0.0" > .nvmrc
direnv allow
```

### Adding Project Binaries to PATH

```bash
cat > .envrc <<'EOF'
# Add ./bin to PATH for project-specific scripts
PATH_add bin

# Add ./node_modules/.bin to PATH
PATH_add node_modules/.bin

# Add multiple directories
PATH_add scripts
PATH_add vendor/bin
EOF
```

`PATH_add` is a direnv built-in that prepends the directory to PATH using the absolute path.

## Using direnv with Version Managers

### Go

```bash
cat > .envrc <<'EOF'
# Use direnv's built-in go module support
export GOPATH="$PWD/.gopath"
PATH_add .gopath/bin

# Or use a specific Go version via goenv
# use goenv 1.21.0
EOF
```

### Ruby via rbenv/asdf

```bash
cat > .envrc <<'EOF'
# Use asdf to manage Ruby version from .tool-versions
use asdf
EOF

echo "ruby 3.2.0" > .tool-versions
direnv allow
```

## Configuring direnv

The global direnv configuration lives at `~/.config/direnv/direnvrc`:

```bash
mkdir -p ~/.config/direnv

cat > ~/.config/direnv/direnvrc <<'EOF'
# Global helper functions available in all .envrc files

# Function to load secrets from a GPG-encrypted file
load_encrypted_secrets() {
  local secrets_file="${1:-.env.encrypted}"
  if [ -f "$secrets_file" ]; then
    eval "$(gpg --quiet --decrypt "$secrets_file" 2>/dev/null)"
  fi
}

# Function to require specific environment variables
require_env() {
  for var in "$@"; do
    if [ -z "${!var}" ]; then
      echo "Error: Required environment variable $var is not set"
      return 1
    fi
  done
}

# Add ~/go/bin to PATH globally
PATH_add ~/go/bin

# Add ~/.local/bin globally
PATH_add ~/.local/bin
EOF
```

## Security Practices

### Never Commit .envrc Files with Secrets

```bash
# Add .envrc to .gitignore for projects with real secrets
echo ".envrc" >> .gitignore
echo ".env" >> .gitignore

# Instead, commit a .envrc.example that shows required variables
cat > .envrc.example <<'EOF'
export DATABASE_URL=""       # Required: PostgreSQL connection string
export API_KEY=""            # Required: Third-party API key
export DEBUG=false           # Optional: Enable debug mode
EOF

git add .envrc.example
git commit -m "Add .envrc.example template"
```

### For Secrets, Use a Secret Manager

Rather than storing secrets in `.envrc`, fetch them at runtime:

```bash
cat > .envrc <<'EOF'
# Fetch secrets from AWS Secrets Manager
export DATABASE_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id myapp/database \
  --query 'SecretString' \
  --output text | jq -r '.password' 2>/dev/null || echo "")

# Fetch from HashiCorp Vault
export API_KEY=$(vault kv get -field=api_key secret/myapp 2>/dev/null || echo "")
EOF
```

## Troubleshooting

### direnv Not Loading on cd

```bash
# Verify the hook is installed in your shell config
grep direnv ~/.bashrc

# Manually test the hook
eval "$(direnv hook bash)"
cd ~/test-project
```

### "not allowed" Error

```bash
# If you see "direnv: error .envrc is blocked"
# Run direnv allow in the project directory
cd ~/test-project
direnv allow
```

### Variables Not Unloading When Leaving Directory

```bash
# Check that the hook is correctly placed at the end of your shell config
# The hook must be the last thing added to ensure it wraps the cd command
tail -5 ~/.bashrc
```

direnv is a small tool with a big quality-of-life impact for anyone working across multiple projects. Removing the need to manually `source` environment files or switch AWS profiles reduces context-switching friction and eliminates a whole category of "wrong credentials in wrong project" mistakes.
