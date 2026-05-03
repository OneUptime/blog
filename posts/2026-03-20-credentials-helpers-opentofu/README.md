# How to Use Credentials Helpers in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Credentials Helpers, Authentication, Security, Infrastructure as Code, Provider

Description: Learn how to configure OpenTofu credentials helpers to authenticate with private registries and module sources without embedding tokens in configuration files.

## Introduction

OpenTofu credentials helpers are external programs that supply authentication tokens for registry.opentofu.org, private module registries, or private provider mirrors. They prevent tokens from appearing in `.terraformrc`, environment variables, or CI logs.

## The credentials Block in .terraformrc

The simplest approach is a static credentials block in `~/.terraformrc`:

```hcl
# ~/.terraformrc

credentials "registry.opentofu.org" {
  token = "ot1.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}

credentials "my-private-registry.example.com" {
  token = "private-token-here"
}
```

This is fine for local development but unsuitable for CI/CD where the token must stay out of config files.

## Using a Credentials Helper Program

A credentials helper is any executable invoked as `terraform-credentials-<NAME> [args...] <verb> <hostname>`, where `<verb>` is `get`, `store`, or `forget`. For the `get` verb, the helper prints a JSON object containing `token` to stdout:

```bash
#!/bin/bash
# /usr/local/bin/tofu-cred-helper
# Invoked as: terraform-credentials-<NAME> [args...] <verb> <hostname>

VERB="$1"
HOSTNAME="$2"

# Only the "get" verb returns credentials; ignore "store" and "forget".
if [ "$VERB" != "get" ]; then
  exit 0
fi

case "$HOSTNAME" in
  "registry.opentofu.org")
    # Fetch token from a secrets manager
    TOKEN=$(aws secretsmanager get-secret-value \
      --secret-id "opentofu/registry-token" \
      --query SecretString --output text)
    echo "{\"token\": \"$TOKEN\"}"
    ;;
  "my-private-registry.example.com")
    TOKEN=$(vault kv get -field=token secret/opentofu/private-registry)
    echo "{\"token\": \"$TOKEN\"}"
    ;;
  *)
    echo "{}"
    ;;
esac
```

```bash
chmod +x /usr/local/bin/tofu-cred-helper
```

## Configuring OpenTofu to Use the Helper

Reference the helper in `.terraformrc`:

```hcl
# ~/.terraformrc
credentials_helper "my-helper" {
  args = []
}
```

The helper binary must be named `terraform-credentials-my-helper` and be on the `PATH`:

```bash
# Rename or symlink your helper
sudo ln -s /usr/local/bin/tofu-cred-helper /usr/local/bin/terraform-credentials-my-helper
```

## Built-In GCR / ECR Authentication

For providers that pull from container registries, use cloud-native credential helpers:

```bash
# AWS ECR credential helper (for providers that use Docker images)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

## OpenTofu CLI Configuration for CI

In CI environments, use `TF_CLI_CONFIG_FILE` to point to a temporary config file:

```bash
# Create a temporary CLI config
cat > /tmp/tofu-cli.rc <<EOF
credentials "my-private-registry.example.com" {
  token = "${REGISTRY_TOKEN}"
}
EOF
export TF_CLI_CONFIG_FILE=/tmp/tofu-cli.rc

tofu init
tofu apply

# Clean up
rm /tmp/tofu-cli.rc
```

## Git-Based Module Authentication

For modules sourced from private GitHub/GitLab, configure git credentials instead:

```bash
# Configure git to use HTTPS with a token for a specific host
git config --global url."https://oauth2:${GITLAB_TOKEN}@gitlab.com".insteadOf "https://gitlab.com"

# OpenTofu will use this git config when fetching modules
tofu init
```

## Conclusion

Credentials helpers decouple authentication from configuration, keeping tokens out of files committed to version control and out of CI/CD logs. For teams running OpenTofu at scale, combining a credentials helper that fetches tokens from a secrets manager at runtime is the most secure approach.
