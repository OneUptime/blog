# How to Use terraform login Command for HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Authentication, Login, CLI

Description: Step-by-step guide to using the terraform login command to authenticate with HCP Terraform and manage your API tokens.

---

The `terraform login` command is the quickest way to authenticate your local Terraform CLI with HCP Terraform. It handles the entire token generation and storage flow in a single command. Despite being simple, there are nuances worth understanding - especially when dealing with Terraform Enterprise, multiple accounts, or automated environments.

## What terraform login Actually Does

When you run `terraform login`, several things happen behind the scenes:

1. Terraform opens your default browser to HCP Terraform
2. You log in (if not already logged in) and are prompted to create an API token
3. You copy the token and paste it back into your terminal
4. Terraform stores the token in `~/.terraform.d/credentials.tfrc.json`
5. All future Terraform commands use this stored token

```bash
# Run the login command
terraform login

# Output:
# Terraform will request an API token for app.terraform.io using your browser.
#
# If login is successful, Terraform will store the token in plain text in
# the following file for use by subsequent commands:
#     /home/user/.terraform.d/credentials.tfrc.json
#
# Do you want to proceed?
#   Only 'yes' will be accepted to confirm.
#
#   Enter a value: yes
```

After typing `yes`, your browser opens to the token creation page.

## Step-by-Step Login Process

Let me walk through the complete flow.

### Step 1: Run the Command

```bash
terraform login
```

### Step 2: Confirm the Prompt

Type `yes` when Terraform asks if you want to proceed. Terraform reminds you that the token will be stored in plain text, which is important to keep in mind.

### Step 3: Generate a Token in the Browser

Your browser opens to `https://app.terraform.io/app/settings/tokens`. If it does not open automatically, Terraform prints the URL for you to visit manually.

On this page, create a new API token. Give it a descriptive name like "CLI - MacBook Pro" or "dev-workstation" so you can identify it later.

### Step 4: Paste the Token

Copy the generated token from the browser and paste it into your terminal:

```bash
# Token for app.terraform.io:
#   Enter a value: <paste your token here>
```

### Step 5: Verify Success

```bash
# If successful, you see:
# Retrieved token for user <your-username>
#
# Success! Terraform has obtained and saved an API token.
```

## Logging into Terraform Enterprise

If you use Terraform Enterprise with a custom hostname, pass the hostname as an argument:

```bash
# Login to a Terraform Enterprise instance
terraform login terraform.internal.mycompany.com

# This opens your browser to:
# https://terraform.internal.mycompany.com/app/settings/tokens
```

The token is stored separately for each hostname, so you can be logged into both HCP Terraform and your Enterprise instance at the same time:

```bash
# Login to HCP Terraform
terraform login

# Also login to Terraform Enterprise
terraform login tfe.mycompany.com

# Both tokens are stored in credentials.tfrc.json
```

## Where Tokens Are Stored

Tokens are saved in `~/.terraform.d/credentials.tfrc.json`. Here is what the file looks like with multiple hosts:

```json
{
  "credentials": {
    "app.terraform.io": {
      "token": "abc123-user-token-for-hcp"
    },
    "tfe.mycompany.com": {
      "token": "xyz789-user-token-for-enterprise"
    }
  }
}
```

This file should be treated like a password file. Set restrictive permissions:

```bash
# Check current permissions
ls -la ~/.terraform.d/credentials.tfrc.json

# Set to owner-only read/write
chmod 600 ~/.terraform.d/credentials.tfrc.json

# Verify
stat -c %a ~/.terraform.d/credentials.tfrc.json
# 600
```

## Logging Out

To remove a stored token, use `terraform logout`:

```bash
# Logout from HCP Terraform
terraform logout

# Logout from a specific host
terraform logout tfe.mycompany.com

# Output:
# Removed the stored credentials for app.terraform.io
```

This deletes the token from the credentials file. The token itself is not revoked on the server - you need to do that manually through the HCP Terraform UI if you want to invalidate it.

```bash
# To fully revoke access:
# 1. terraform logout (removes local token)
# 2. Go to HCP Terraform UI > User Settings > Tokens
# 3. Delete the token to revoke it server-side
```

## Non-Interactive Login

In environments where a browser is not available (SSH sessions, containers, CI/CD), `terraform login` still works but in a non-interactive mode:

```bash
# In a headless environment, terraform login prints the URL
terraform login

# It shows:
# Open the following URL to generate a token:
#     https://app.terraform.io/app/settings/tokens?source=terraform-login
#
# Token for app.terraform.io:
#   Enter a value:
```

You visit the URL on another machine, generate the token, and paste it back. But for automation, there is a better approach - pre-create the credentials file:

```bash
# Create credentials file directly for automation
mkdir -p ~/.terraform.d

cat > ~/.terraform.d/credentials.tfrc.json << EOF
{
  "credentials": {
    "app.terraform.io": {
      "token": "${TF_API_TOKEN}"
    }
  }
}
EOF

chmod 600 ~/.terraform.d/credentials.tfrc.json
```

Or use the environment variable approach, which avoids the file entirely:

```bash
# Set the token via environment variable
export TF_TOKEN_app_terraform_io="your-api-token"

# No credentials file needed - Terraform checks this variable first
terraform init
terraform plan
```

## Token Expiration and Rotation

API tokens created through `terraform login` do not expire by default. This is convenient but also a security consideration. You should periodically rotate your tokens:

```bash
# Step 1: Generate a new token in the HCP Terraform UI
# User Settings > Tokens > Create an API token

# Step 2: Update your local credentials
terraform login
# (paste the new token)

# Step 3: Delete the old token in the HCP Terraform UI
# User Settings > Tokens > Delete the old token
```

For teams, consider setting up a rotation schedule. Some teams rotate tokens monthly, others quarterly. The important thing is having a process.

## Common Issues and Fixes

### Browser Does Not Open

```bash
# If the browser does not open automatically,
# manually visit the URL printed in the terminal
terraform login

# Look for the line:
# Open the following URL to generate a token:
#     https://app.terraform.io/app/settings/tokens?source=terraform-login
```

### Token Not Accepted

```bash
# If pasting the token results in an error,
# check for extra whitespace or newlines
# Copy the token carefully - it is a single line

# Also verify the token works with a direct API call
curl -s \
  --header "Authorization: Bearer YOUR_TOKEN" \
  "https://app.terraform.io/api/v2/account/details" | jq .
```

### Permission Denied on Credentials File

```bash
# If Terraform cannot write the credentials file
# Check directory permissions
ls -la ~/.terraform.d/

# Fix permissions if needed
chmod 700 ~/.terraform.d/
chmod 600 ~/.terraform.d/credentials.tfrc.json
```

### Wrong Account

```bash
# If you logged in with the wrong account
terraform logout
terraform login
# Log in with the correct account in the browser
```

## Using terraform login in Docker

When building Docker images that need HCP Terraform access, avoid baking tokens into the image. Instead, mount the credentials at runtime:

```dockerfile
# Dockerfile
FROM hashicorp/terraform:latest

WORKDIR /workspace
COPY . .

# Do NOT put terraform login in the Dockerfile
# Do NOT copy credentials.tfrc.json into the image
```

```bash
# Mount credentials at runtime
docker run \
  -v ~/.terraform.d/credentials.tfrc.json:/root/.terraform.d/credentials.tfrc.json:ro \
  -v $(pwd):/workspace \
  my-terraform-image \
  terraform plan

# Or use environment variables
docker run \
  -e TF_TOKEN_app_terraform_io="$TF_TOKEN" \
  -v $(pwd):/workspace \
  my-terraform-image \
  terraform plan
```

## Summary

The `terraform login` command is your starting point for HCP Terraform authentication. For daily development work, run it once and your credentials persist across sessions. For CI/CD and automation, use environment variables or pre-created credentials files instead. Always keep your tokens secure, rotate them periodically, and use `terraform logout` when you are done with a machine. The combination of simple local auth and flexible automated auth makes HCP Terraform accessible from any environment.
