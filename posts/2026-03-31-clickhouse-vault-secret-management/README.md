# How to Set Up ClickHouse with Vault for Secret Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Vault, Secret Management, Security, HashiCorp

Description: Integrate ClickHouse with HashiCorp Vault to manage database credentials and S3 access keys securely, eliminating hardcoded secrets from configuration files.

---

Hardcoding passwords and access keys in ClickHouse configuration files is a common security risk. HashiCorp Vault provides a centralized secrets management solution that stores credentials securely and can rotate them automatically. This guide shows how to pull secrets from Vault into ClickHouse configuration.

## Architecture Overview

The typical integration uses one of two approaches:
1. Agent-based: Vault Agent runs alongside ClickHouse and writes rendered config files to disk
2. Template-based: Use Consul Template or envconsul to render secrets into config files at startup

## Setting Up Vault Secrets

First, store ClickHouse-related secrets in Vault:

```bash
# Store ClickHouse admin password
vault kv put secret/clickhouse/admin password="StrongAdminPass!123"

# Store S3 credentials for ClickHouse external storage
vault kv put secret/clickhouse/s3 \
    access_key_id="AKIAIOSFODNN7EXAMPLE" \
    secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

## Vault Agent Configuration

Create a Vault Agent config file at `/etc/vault-agent/clickhouse.hcl`:

```hcl
vault {
  address = "https://vault.example.com:8200"
}

auto_auth {
  method "approle" {
    mount_path = "auth/approle"
    config = {
      role_id_file_path   = "/etc/vault-agent/role-id"
      secret_id_file_path = "/etc/vault-agent/secret-id"
    }
  }
}

template {
  source      = "/etc/vault-agent/templates/users.xml.tmpl"
  destination = "/etc/clickhouse-server/users.xml"
  perms       = "0640"
  command     = "systemctl reload clickhouse-server"
}

template {
  source      = "/etc/vault-agent/templates/config-s3.xml.tmpl"
  destination = "/etc/clickhouse-server/config.d/s3.xml"
  perms       = "0640"
  command     = "systemctl reload clickhouse-server"
}
```

## Template for users.xml

Create `/etc/vault-agent/templates/users.xml.tmpl`:

```text
{{- with secret "secret/data/clickhouse/admin" -}}
<clickhouse>
  <users>
    <admin>
      <password>{{ .Data.data.password }}</password>
      <access_management>1</access_management>
    </admin>
  </users>
</clickhouse>
{{- end -}}
```

## Template for S3 Configuration

Create `/etc/vault-agent/templates/config-s3.xml.tmpl`:

```text
{{- with secret "secret/data/clickhouse/s3" -}}
<clickhouse>
  <storage_configuration>
    <disks>
      <s3_disk>
        <type>s3</type>
        <endpoint>https://s3.amazonaws.com/my-clickhouse-bucket/</endpoint>
        <access_key_id>{{ .Data.data.access_key_id }}</access_key_id>
        <secret_access_key>{{ .Data.data.secret_access_key }}</secret_access_key>
      </s3_disk>
    </disks>
  </storage_configuration>
</clickhouse>
{{- end -}}
```

## Starting Vault Agent

```bash
vault agent -config=/etc/vault-agent/clickhouse.hcl -log-level=info
```

Vault Agent will render the templates, write the config files, and reload ClickHouse. When secrets are rotated in Vault, Agent detects the change and re-renders the files automatically.

## Verifying Secret Delivery

```bash
# Check that the config file was rendered (but not its contents)
stat /etc/clickhouse-server/users.xml

# Test ClickHouse authentication with the Vault-managed password
clickhouse-client -u admin --password "$(vault kv get -field=password secret/clickhouse/admin)" \
    --query "SELECT currentUser()"
```

## Using AWS IAM Instead of Static Keys

For deployments on AWS, use IAM roles to eliminate static S3 credentials entirely:

```xml
<s3_disk>
  <type>s3</type>
  <endpoint>https://s3.amazonaws.com/my-bucket/</endpoint>
  <!-- No access_key_id or secret_access_key - uses IAM role -->
  <use_environment_credentials>true</use_environment_credentials>
</s3_disk>
```

## Summary

Integrating ClickHouse with HashiCorp Vault eliminates hardcoded secrets from configuration files by using Vault Agent to render credentials into config files dynamically. Configure AppRole authentication for the agent, create templates for your sensitive config sections, and leverage automatic secret rotation to keep credentials fresh without manual intervention.
