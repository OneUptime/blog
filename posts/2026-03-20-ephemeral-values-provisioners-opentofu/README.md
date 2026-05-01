# How to Use Ephemeral Values in Provisioners in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ephemeral Values, Provisioner, Security, Infrastructure as Code, DevOps

Description: A guide to using ephemeral values in OpenTofu provisioners to pass secrets and credentials to provisioner scripts without persisting them in state.

## Introduction

In OpenTofu v1.11 and later, provisioners can reference ephemeral values from provider-supported ephemeral resources. This ensures that passwords, API keys, SSH keys, and other credentials used during provisioning are never written to the state file, even though they are available to the provisioner during execution.

## Basic Ephemeral Value in local-exec Provisioner

```hcl
ephemeral "aws_secretsmanager_secret_version" "deploy_token" {
  secret_id = "myapp/deploy-token"
}

resource "terraform_data" "deploy" {
  triggers_replace = var.app_version

  provisioner "local-exec" {
    # Ephemeral value available during provisioner execution
    # Never stored in state
    command = "curl -X POST -H 'Authorization: Bearer ${ephemeral.aws_secretsmanager_secret_version.deploy_token.secret_string}' https://api.example.com/deploy"
  }
}
```

## Database Migration with Ephemeral Credentials

```hcl
ephemeral "aws_secretsmanager_secret_version" "db_creds" {
  secret_id = "${var.environment}/database/credentials"
}

locals {
  db_config = jsondecode(
    ephemeral.aws_secretsmanager_secret_version.db_creds.secret_string
  )
}

resource "terraform_data" "run_migrations" {
  triggers_replace = {
    db_endpoint  = aws_db_instance.main.endpoint
    schema_hash  = filesha256("${path.module}/schema.sql")
  }

  provisioner "local-exec" {
    # Credentials are ephemeral - not stored anywhere
    command = <<-EOT
      PGPASSWORD="${local.db_config.password}" psql \
        --host=${aws_db_instance.main.address} \
        --port=${aws_db_instance.main.port} \
        --username=${local.db_config.username} \
        --dbname=${var.db_name} \
        -f ${path.module}/schema.sql
    EOT
  }
}
```

## Kubernetes Deployment with Ephemeral Token

```hcl
ephemeral "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

resource "terraform_data" "k8s_setup" {
  triggers_replace = {
    cluster_version = aws_eks_cluster.main.version
    manifest_hash   = sha256(file("${path.module}/manifests/setup.yaml"))
  }

  provisioner "local-exec" {
    environment = {
      # Ephemeral token used in environment variable
      KUBE_TOKEN = ephemeral.aws_eks_cluster_auth.main.token
      KUBE_HOST  = aws_eks_cluster.main.endpoint
      KUBE_CA    = aws_eks_cluster.main.certificate_authority[0].data
    }

    command = <<-EOT
      kubeconfig="$(mktemp)"
      trap 'rm -f "$kubeconfig"' EXIT

      printf '%s\n' \
        'apiVersion: v1' \
        'kind: Config' \
        'clusters:' \
        '- name: target' \
        '  cluster:' \
        "    server: $KUBE_HOST" \
        "    certificate-authority-data: $KUBE_CA" \
        'users:' \
        '- name: deploy' \
        '  user:' \
        "    token: $KUBE_TOKEN" \
        'contexts:' \
        '- name: deploy' \
        '  context:' \
        '    cluster: target' \
        '    user: deploy' \
        'current-context: deploy' \
        > "$kubeconfig"

      kubectl --kubeconfig="$kubeconfig" apply -f ${path.module}/manifests/setup.yaml
    EOT
  }
}
```

## Vault-Based Deployment

```hcl
ephemeral "vault_kv_secret_v2" "deploy_creds" {
  mount = "secret"
  name  = "platform/${var.environment}/deploy-credentials"
}

locals {
  deploy_creds = jsondecode(
    ephemeral.vault_kv_secret_v2.deploy_creds.data_json
  )
}

resource "terraform_data" "deploy_app" {
  triggers_replace = var.app_version

  provisioner "local-exec" {
    environment = {
      # All credentials are ephemeral
      REGISTRY_PASSWORD = local.deploy_creds.registry_password
      DEPLOY_API_KEY    = local.deploy_creds.api_key
    }

    command = <<-EOT
      echo "$REGISTRY_PASSWORD" | docker login registry.company.com -u deploy --password-stdin
      docker pull registry.company.com/myapp:${var.app_version}
      curl -X POST -H "X-Api-Key: $DEPLOY_API_KEY" \
        https://deploy.company.com/api/v1/deploy/${var.app_version}
    EOT
  }
}
```

## Remote Provisioner with Ephemeral SSH Key

```hcl
ephemeral "vault_kv_secret_v2" "ssh_key" {
  mount = "secret"
  name  = "platform/provisioner-ssh-key"
}

resource "aws_instance" "configured" {
  ami           = var.ami_id
  instance_type = "t3.micro"
  key_name      = var.existing_key_name

  provisioner "remote-exec" {
    connection {
      type        = "ssh"
      user        = "ubuntu"
      # Ephemeral SSH key - not stored in state
      private_key = ephemeral.vault_kv_secret_v2.ssh_key.data["private_key"]
      host        = self.public_ip
    }

    inline = [
      "sudo apt-get update -y",
      "sudo apt-get install -y myapp",
    ]
  }
}
```

## Handling Secrets in Script Environment

```hcl
ephemeral "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = "myapp/application-secrets"
}

locals {
  app_secrets = jsondecode(
    ephemeral.aws_secretsmanager_secret_version.app_secrets.secret_string
  )
}

resource "terraform_data" "configure_app" {
  # Use a non-secret trigger because ephemeral values can't be used here
  triggers_replace = filesha256("${path.module}/scripts/configure.sh")

  provisioner "local-exec" {
    # Pass secrets as environment variables rather than command args
    # Environment variables are less likely to be logged
    environment = {
      API_KEY     = local.app_secrets.api_key
      DB_PASSWORD = local.app_secrets.db_password
      JWT_SECRET  = local.app_secrets.jwt_secret
    }

    command = "${path.module}/scripts/configure.sh"
  }
}
```

## Security Best Practices

```hcl
# DO: Use ephemeral values for secrets in provisioners

ephemeral "aws_secretsmanager_secret_version" "secret" {
  secret_id = "myapp/secret"
}

resource "terraform_data" "good_practice" {
  provisioner "local-exec" {
    environment = {
      SECRET = ephemeral.aws_secretsmanager_secret_version.secret.secret_string
    }
    command = "echo using secret from env var"
  }
}

# DON'T: Embed secrets directly in commands (may appear in logs)
# resource "terraform_data" "bad_practice" {
#   provisioner "local-exec" {
#     command = "deploy.sh --password=${var.db_password}"  # Visible in logs!
#   }
# }
```

## Conclusion

Using ephemeral values in provisioners ensures that secrets like passwords, API keys, and SSH keys are available when needed but never written to OpenTofu's state file. Pass sensitive values through environment variables in provisioners rather than embedding them directly in commands, as environment variables are less likely to be captured in logs. Combine ephemeral resources with `locals` for clean, readable provisioner configurations that maintain strong security guarantees.
