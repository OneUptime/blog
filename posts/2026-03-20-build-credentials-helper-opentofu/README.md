# How to Configure a Credentials Helper in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Credential, Authentication, Registry, Infrastructure as Code, Security

Description: Learn how to configure a credentials helper in OpenTofu to authenticate with private module registries and OCI artifact stores.

---

OpenTofu supports credentials helpers - external executables that supply authentication tokens for private module registries and other OpenTofu-compatible services. This avoids storing credentials directly in configuration files.

---

## Built-in Credentials in .terraformrc / .tofurc

```hcl
# ~/.tofurc

credentials "registry.example.com" {
  token = "my-private-token"
}
```

---

## Configure a Credentials Helper

```hcl
# ~/.tofurc
credentials_helper "vault" {}
```

For this example, OpenTofu looks for an executable named `terraform-credentials-vault` in one of its default plugin search locations.

---

## Example Credentials Helper Script

```bash
#!/bin/bash
# ~/.terraform.d/plugins/terraform-credentials-vault
# Fetches credentials from HashiCorp Vault

ACTION=$1
HOST=$2

case "$ACTION" in
  get)
    TOKEN=$(vault kv get -field=token "secret/tofu/${HOST}") || {
      echo "failed to read token for ${HOST} from Vault" >&2
      exit 1
    }
    jq -n --arg token "$TOKEN" '{token: $token}'
    ;;
  store)
    cat >/dev/null
    echo "terraform-credentials-vault is read-only" >&2
    exit 1
    ;;
  forget)
    # This helper reads directly from Vault and does not keep local state.
    exit 0
    ;;
  *)
    echo "unsupported action: $ACTION" >&2
    exit 1
    ;;
esac
```

Make it executable:
```bash
chmod +x ~/.terraform.d/plugins/terraform-credentials-vault
```

---

## Reference a Private Module Registry

```hcl
module "network" {
  source  = "registry.example.com/myorg/network/aws"
  version = "~> 2.0"
}
```

OpenTofu calls the credentials helper to get the token for `registry.example.com` before fetching the module.

---

## Use AWS Secrets Manager as a Credentials Source

```bash
# Read a token stored as a plaintext secret string
TOKEN=$(aws secretsmanager get-secret-value \
  --secret-id opentofu/registry.example.com/token \
  --query SecretString \
  --output text)

# Write to .tofurc temporarily
cat > ~/.tofurc <<EOF
credentials "registry.example.com" {
  token = "${TOKEN}"
}
EOF
```

---

## Summary

Configure static credentials in `~/.tofurc` with `credentials` blocks, or delegate to an external binary via `credentials_helper`. Helpers must handle `get`, `store`, and `forget`; `get` returns JSON on stdout, and `store` receives JSON on stdin. This pattern enables integration with secret managers like HashiCorp Vault or AWS Secrets Manager. For OCI registries, use `oci_credentials`, Docker-style configuration files, or a configured Docker credentials helper instead.
