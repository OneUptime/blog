# How to Use direnv for Per-Project Environment Variables on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, direnv, Development, Shell, Environment

Description: Learn how to install and configure direnv on Ubuntu to automatically load and unload project-specific environment variables when you change directories.

---

Managing environment variables across multiple projects is a friction point in day-to-day development. You need different database URLs, API keys, and configuration flags depending on which project you're working in. Manually exporting variables or sourcing scripts is error-prone and easy to forget. `direnv` solves this cleanly by automatically loading environment variables from a `.envrc` file when you enter a directory and unloading them when you leave.

## Installing direnv

The version in Ubuntu's default repositories is usually adequate:

```bash
# Install from apt
sudo apt update
sudo apt install -y direnv

# Check the installed version
direnv version
```

For a newer version, you can install from the official releases:

```bash
# Get the latest release
DIRENV_VERSION=$(curl -s https://api.github.com/repos/direnv/direnv/releases/latest \
    | grep tag_name | cut -d '"' -f 4)

# Download and install
wget -O direnv "https://github.com/direnv/direnv/releases/download/${DIRENV_VERSION}/direnv.linux-amd64"
chmod +x direnv
sudo mv direnv /usr/local/bin/direnv

direnv version
```

## Shell Integration

direnv needs a hook in your shell's configuration file to intercept directory changes. Without this hook, direnv does nothing.

### Bash

```bash
# Add to ~/.bashrc
echo 'eval "$(direnv hook bash)"' >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```bash
# Add to ~/.zshrc
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc
source ~/.zshrc
```

### Fish

```fish
# Add to ~/.config/fish/config.fish
echo 'direnv hook fish | source' >> ~/.config/fish/config.fish
```

After adding the hook, open a new terminal or source the config file for the changes to take effect.

## Basic Usage

Create a `.envrc` file in your project directory:

```bash
cd ~/projects/my-api-project

# Create an .envrc file
cat > .envrc << 'EOF'
export DATABASE_URL="postgres://localhost:5432/mydb_dev"
export API_KEY="dev-api-key-12345"
export LOG_LEVEL="debug"
export APP_PORT="3000"
EOF
```

When you first create or modify an `.envrc` file, direnv blocks it for security until you explicitly allow it:

```bash
# Allow the .envrc file in the current directory
direnv allow

# The variables are now exported
echo $DATABASE_URL
# postgres://localhost:5432/mydb_dev
```

When you leave the directory, the variables are unset:

```bash
cd ~
echo $DATABASE_URL
# (empty - variable unloaded)

cd ~/projects/my-api-project
echo $DATABASE_URL
# postgres://localhost:5432/mydb_dev (reloaded automatically)
```

## Security Model

direnv's allow/deny system prevents malicious `.envrc` files from running automatically. Each time you modify an `.envrc`, direnv blocks it again until you re-run `direnv allow`.

```bash
# Allow the current directory
direnv allow

# Allow a specific path
direnv allow /path/to/project

# Deny a previously allowed directory
direnv deny

# Revoke all permissions
direnv revoke /path/to/project
```

The permissions are stored in `~/.local/share/direnv/allow/`.

## Using .envrc with Existing .env Files

Many projects already have a `.env` file. direnv can source it:

```bash
# .envrc
# Load variables from .env file
dotenv

# Or load from a custom path
dotenv .env.local
```

The `dotenv` function is a direnv stdlib function that parses a dotenv-format file and exports the variables. Unlike `source .env`, it handles quoting correctly and doesn't execute arbitrary shell code.

If you use both `.envrc` and `.env`, add `.envrc` to `.gitignore` for secrets and keep `.env.example` in the repository:

```bash
# .gitignore
.env
.envrc.local
```

## direnv Standard Library

direnv ships with a set of helper functions available in `.envrc` files:

```bash
# .envrc - using stdlib functions

# Add ./bin to PATH (relative to the project root)
PATH_add bin
PATH_add node_modules/.bin

# Load variables from a file
dotenv .env.local

# Set a variable only if not already set
export_function() {
    local name=$1
    shift
    export "$name"="${!name:-$*}"
}

# Source another shell file
source_env .envrc.shared

# Use a specific Python virtualenv
layout python3

# Use a specific Node.js version (with nvm)
use nvm 20

# Use a specific Ruby version (with rvm or rbenv)
use ruby 3.2
```

## Integrating with Language Version Managers

direnv works well with common version managers, letting you switch language versions per project automatically.

### With nvm (Node Version Manager)

```bash
# .envrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
use nvm 20.10.0
```

Create a `.nvmrc` file in the project root and direnv picks it up:

```bash
# .nvmrc
20.10.0

# .envrc
use nvm
```

### With pyenv (Python Version Manager)

```bash
# .envrc
use python 3.11.6

# Or activate a virtualenv
layout python3
```

### With rbenv (Ruby Version Manager)

```bash
# .envrc
use ruby 3.2.0
```

## Project-Specific PATH Extensions

Adding project-specific executables to PATH is a common use case:

```bash
# .envrc

# Add local bin directories to PATH
PATH_add bin
PATH_add scripts
PATH_add .local/bin

# Add a compiled binary directory
PATH_add build/bin

# Export project root for use in scripts
export PROJECT_ROOT="$(pwd)"
export SCRIPTS_DIR="$PROJECT_ROOT/scripts"
```

## Sharing Common Configuration

For teams, you often want shared base configuration with local overrides:

```bash
# .envrc.shared (committed to git)
export APP_NAME="myapp"
export LOG_FORMAT="json"
export DATABASE_HOST="localhost"

# .envrc (gitignored, per-developer)
source_env .envrc.shared

# Developer-specific overrides
export DATABASE_PASSWORD="my-local-password"
export API_KEY="my-personal-dev-key"
```

## Nested Directories

direnv handles nested projects correctly. Each `.envrc` in a parent directory loads when you enter any subdirectory. Child `.envrc` files extend the parent's environment:

```text
~/projects/
  myapp/
    .envrc          # DATABASE_URL, APP_PORT
    frontend/
      .envrc        # REACT_APP_API_URL (inherits parent vars too)
    backend/
      .envrc        # BACKEND_PORT (inherits parent vars too)
```

The child `.envrc` can explicitly inherit the parent:

```bash
# frontend/.envrc

# Include parent directory's .envrc
source_up

# Frontend-specific vars
export REACT_APP_API_URL="http://localhost:3000"
```

## Debugging direnv

When variables aren't loading as expected:

```bash
# Show what direnv would export
direnv status

# Watch direnv operations in real time
export DIRENV_LOG_FORMAT="direnv: %s"

# Manually reload the current .envrc
direnv reload

# Show the current .envrc content
cat .envrc

# Check if direnv allowed this directory
direnv status | grep allowed
```

## Keeping Secrets Out of Repositories

Never commit actual secrets to `.envrc`. Use a pattern where `.envrc` is gitignored for files with secrets, or use a secrets manager:

```bash
# .envrc - pull secrets from a vault or secrets manager
export AWS_ACCESS_KEY_ID=$(aws ssm get-parameter \
    --name "/myapp/dev/aws-key" \
    --with-decryption \
    --query Parameter.Value \
    --output text)

export DATABASE_PASSWORD=$(vault kv get \
    -field=password \
    secret/myapp/dev/database)
```

This approach keeps secrets out of files entirely while still making them available automatically when you enter the project directory.

direnv is a small tool that significantly reduces the mental overhead of working across multiple projects with different configurations. Once you've set up the shell hook and a few `.envrc` files, the environment context switches happen invisibly as you move between projects.
