# How to Manage .env Files Securely on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, DevOps, Secret, Environment Variable

Description: Practical techniques for managing .env files securely on Ubuntu, covering file permissions, encryption, Git protection, and production deployment patterns.

---

The `.env` file pattern is nearly universal in application development. It is simple, well-understood, and supported by every framework. It is also where many teams make security mistakes - committing secrets to Git, leaving files world-readable, or copying them between environments without rotation.

This guide covers the practical techniques for handling `.env` files securely on Ubuntu throughout the development and deployment lifecycle.

## The Core Problems with .env Files

Before fixing things, it helps to be clear about what goes wrong:

1. **Accidental Git commits** - the most common issue; secrets end up in version history
2. **Overly permissive file permissions** - any local user can read the file
3. **Sharing via insecure channels** - Slack messages, emails with plaintext secrets
4. **No rotation** - the same credentials live forever across all environments
5. **Missing .gitignore entries** - relying on developers to remember

## File Permission Basics

When a `.env` file contains secrets, restrict who can read it:

```bash
# Create a .env file
touch .env

# Set permissions: owner read/write only (600)
chmod 600 .env

# Verify
ls -la .env
# -rw------- 1 youruser yourgroup 0 Mar  2 10:00 .env
```

For service accounts running applications:

```bash
# Application runs as 'appuser', deployed to /opt/myapp
sudo chown appuser:appuser /opt/myapp/.env
sudo chmod 600 /opt/myapp/.env

# Verify appuser can read it
sudo -u appuser cat /opt/myapp/.env
```

Prevent other users from even listing the directory:

```bash
# Remove world execute bit from the app directory
sudo chmod 750 /opt/myapp

# This prevents other users from accessing files in the directory
# even if they know the exact path
```

## Protecting .env Files from Git

The most reliable protection is a project-level `.gitignore` and a global gitignore:

```bash
# In your project .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore  # allow example/template files
```

Set up a global gitignore as a safety net:

```bash
# Create global gitignore
cat >> ~/.gitignore_global << 'EOF'
.env
.env.local
.env.*.local
*.env
.secret
*.pem
*.key
EOF

# Register it with Git
git config --global core.excludesfile ~/.gitignore_global
```

Add a pre-commit hook to catch secrets before they leave the machine:

```bash
# Install git-secrets (prevents committing common secret patterns)
sudo apt install git-secrets -y

# Initialize for the repository
cd /your/project
git secrets --install

# Register common patterns
git secrets --register-aws

# Add custom patterns for your stack
git secrets --add 'password\s*=\s*.+'
git secrets --add 'api_key\s*=\s*.+'
git secrets --add 'secret\s*=\s*.+'
```

## Generating the .env Template File

Maintain a `.env.example` file with placeholder values committed to Git. This documents what variables are needed without exposing values:

```bash
# .env.example - commit this
DATABASE_URL=postgres://user:password@localhost/dbname
API_KEY=your_api_key_here
SECRET_KEY=at_least_32_characters
REDIS_URL=redis://localhost:6379
DEBUG=false
```

A setup script that checks for required variables:

```bash
#!/bin/bash
# check-env.sh - run before starting the application

required_vars=(
    "DATABASE_URL"
    "API_KEY"
    "SECRET_KEY"
)

missing=0
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: Required environment variable $var is not set"
        missing=1
    fi
done

if [ "$missing" -eq 1 ]; then
    echo "Copy .env.example to .env and fill in the values"
    exit 1
fi

echo "All required environment variables are set"
```

## Loading .env Files Safely

Avoid `source .env` or `eval $(cat .env)` for loading variables - these execute the file content, which is a code injection risk if the file is ever tampered with.

Use a safer approach that only exports simple KEY=VALUE pairs:

```bash
# Load .env file safely, handling comments and quoted values
function load_env() {
    local file="${1:-.env}"
    if [ ! -f "$file" ]; then
        echo "No $file file found"
        return 1
    fi
    # Read only simple KEY=VALUE lines, ignore comments and empty lines
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue
        # Only export valid variable assignments
        if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
            export "$line"
        fi
    done < "$file"
}
```

Or use a dedicated tool:

```bash
# Install dotenv CLI
sudo npm install -g dotenv-cli

# Run a command with .env loaded
dotenv -- node server.js
dotenv -e .env.production -- python manage.py migrate
```

## Encrypting .env Files at Rest

For environments where encrypted storage is required:

```bash
# Encrypt using OpenSSL with a passphrase
openssl enc -aes-256-cbc -pbkdf2 -in .env -out .env.enc

# Decrypt when needed
openssl enc -aes-256-cbc -pbkdf2 -d -in .env.enc -out .env

# Delete the plaintext after verifying the encryption works
shred -u .env  # secure delete (multiple overwrite passes)
```

For a more automated workflow, use SOPS:

```bash
# Install age for key management
sudo apt install age -y
age-keygen -o ~/.config/sops/age/keys.txt

# Encrypt the .env file
sops --age $(grep public ~/.config/sops/age/keys.txt | awk '{print $3}') \
  -e .env > .env.enc

# Decrypt
sops -d .env.enc > .env
```

## Storing .env Files for Production Servers

For servers, avoid copying `.env` files manually. Instead:

**Option 1 - Environment variables via systemd:**

```ini
# /etc/systemd/system/myapp.service
[Service]
# Specify an env file - systemd reads this at startup
EnvironmentFile=/etc/myapp/env
ExecStart=/opt/myapp/server
```

```bash
# /etc/myapp/env - managed separately from code
DATABASE_URL=postgres://user:pass@prod-db/myapp
API_KEY=sk-prod-abc123

# Secure the file
sudo chmod 600 /etc/myapp/env
sudo chown root:root /etc/myapp/env
```

**Option 2 - Ansible vault for deployment:**

```yaml
# vars/secrets.yml (encrypted with ansible-vault encrypt)
database_password: "{{ vault_database_password }}"
api_key: "{{ vault_api_key }}"
```

```yaml
# deploy.yml - render .env from vault variables
- name: Deploy environment file
  template:
    src: env.j2
    dest: /opt/myapp/.env
    owner: appuser
    group: appuser
    mode: '0600'
```

## Scanning for Accidentally Committed Secrets

If you suspect secrets may have been committed in the past:

```bash
# Install truffleHog for historical scanning
pip install trufflehog

# Scan the entire Git history
trufflehog git file://. --json 2>/dev/null | python3 -m json.tool

# Or use gitleaks
curl -sSfL https://github.com/gitleaks/gitleaks/releases/latest/download/gitleaks_8.18.2_linux_x64.tar.gz | tar xz
./gitleaks detect --source . -v
```

If secrets are found in Git history, rotate them immediately (assume they are compromised), then clean the history:

```bash
# Use git-filter-repo to remove a file from all history
# (safer than git filter-branch)
pip install git-filter-repo
git filter-repo --path .env --invert-paths
```

After rewriting history, all collaborators must re-clone the repository.

## Rotating Secrets

Treat secret rotation as a regular operational task, not an emergency procedure:

```bash
#!/bin/bash
# rotate-secret.sh - example rotation workflow

OLD_SECRET=$(grep API_KEY .env | cut -d'=' -f2)

# Generate new secret
NEW_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Update the secret in your secret management system first
# Then update the .env file
sed -i "s/^API_KEY=.*/API_KEY=${NEW_SECRET}/" .env

echo "Secret rotated. Old secret: ${OLD_SECRET:0:4}..."
echo "New secret set. Restart the application to pick up the change."
```

## Auditing Secret Access

On Linux, use `auditd` to log who reads `.env` files:

```bash
sudo apt install auditd -y

# Watch the .env file for read access
sudo auditctl -w /opt/myapp/.env -p r -k secret-access

# View the audit log
sudo ausearch -k secret-access | aureport --file

# Make the rule persistent
echo '-w /opt/myapp/.env -p r -k secret-access' | sudo tee -a /etc/audit/rules.d/secrets.rules
sudo systemctl restart auditd
```

The audit log will record every `open()` system call on the file, including the user and the process.

Managing `.env` files securely is less about any single tool and more about consistent habits: restrictive permissions from the start, `.gitignore` entries that cannot be forgotten, and regular rotation. The tools above add layers on top of that foundation.
