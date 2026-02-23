# How to Create Cloudflare Access Policies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cloudflare Access, Zero Trust, Security, Infrastructure as Code

Description: Learn how to create Cloudflare Access policies with Terraform for zero trust security, application authentication, identity-based access control, and secure internal tooling.

---

Cloudflare Access is a zero trust security solution that protects internal applications without requiring a VPN. It authenticates users through identity providers like Google, Okta, or Azure AD before allowing access to your applications. Managing Access policies with Terraform ensures your security rules are version-controlled, auditable, and consistently applied.

In this guide, we will create Cloudflare Access applications and policies with Terraform for protecting internal tools, APIs, and development environments.

## Provider Setup

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "account_id" {
  type = string
}

variable "zone_id" {
  type = string
}

variable "domain" {
  type    = string
  default = "example.com"
}
```

## Creating an Access Application

```hcl
# access-app.tf - Define a protected application
resource "cloudflare_access_application" "admin_panel" {
  zone_id          = var.zone_id
  name             = "Admin Panel"
  domain           = "admin.${var.domain}"
  type             = "self_hosted"
  session_duration = "24h"

  # Automatically redirect to identity provider
  auto_redirect_to_identity = true
}

resource "cloudflare_access_application" "grafana" {
  zone_id          = var.zone_id
  name             = "Grafana Monitoring"
  domain           = "grafana.${var.domain}"
  type             = "self_hosted"
  session_duration = "12h"
}

resource "cloudflare_access_application" "staging" {
  zone_id          = var.zone_id
  name             = "Staging Environment"
  domain           = "staging.${var.domain}"
  type             = "self_hosted"
  session_duration = "8h"
}
```

## Creating Access Policies

```hcl
# access-policies.tf - Define who can access each application
# Admin panel: only specific email domain
resource "cloudflare_access_policy" "admin_email_domain" {
  application_id = cloudflare_access_application.admin_panel.id
  zone_id        = var.zone_id
  name           = "Allow company emails"
  precedence     = 1
  decision       = "allow"

  include {
    email_domain = [var.company_domain]
  }
}

variable "company_domain" {
  type    = string
  default = "example.com"
}

# Admin panel: require specific group membership
resource "cloudflare_access_policy" "admin_group" {
  application_id = cloudflare_access_application.admin_panel.id
  zone_id        = var.zone_id
  name           = "Require admin group"
  precedence     = 2
  decision       = "allow"

  include {
    group = [cloudflare_access_group.admins.id]
  }
}

# Grafana: allow engineering team
resource "cloudflare_access_policy" "grafana_engineering" {
  application_id = cloudflare_access_application.grafana.id
  zone_id        = var.zone_id
  name           = "Allow engineering team"
  precedence     = 1
  decision       = "allow"

  include {
    email_domain = [var.company_domain]
  }

  require {
    group = [cloudflare_access_group.engineering.id]
  }
}

# Staging: allow all company employees
resource "cloudflare_access_policy" "staging_all" {
  application_id = cloudflare_access_application.staging.id
  zone_id        = var.zone_id
  name           = "Allow all employees"
  precedence     = 1
  decision       = "allow"

  include {
    email_domain = [var.company_domain]
  }
}
```

## Creating Access Groups

```hcl
# access-groups.tf - Define reusable access groups
resource "cloudflare_access_group" "admins" {
  account_id = var.account_id
  name       = "Administrators"

  include {
    email = var.admin_emails
  }
}

resource "cloudflare_access_group" "engineering" {
  account_id = var.account_id
  name       = "Engineering Team"

  include {
    email_domain = [var.company_domain]
  }

  require {
    group = [var.idp_engineering_group_id]
  }
}

resource "cloudflare_access_group" "on_call" {
  account_id = var.account_id
  name       = "On-Call Engineers"

  include {
    email = var.oncall_emails
  }
}

variable "admin_emails" {
  type    = list(string)
  default = ["admin@example.com", "cto@example.com"]
}

variable "oncall_emails" {
  type    = list(string)
  default = ["oncall1@example.com", "oncall2@example.com"]
}

variable "idp_engineering_group_id" {
  type    = string
  default = "group-id-placeholder"
}
```

## Service Token Access for APIs

```hcl
# service-tokens.tf - Machine-to-machine access
resource "cloudflare_access_service_token" "ci_cd" {
  account_id = var.account_id
  name       = "CI/CD Pipeline"
}

resource "cloudflare_access_policy" "api_service_token" {
  application_id = cloudflare_access_application.staging.id
  zone_id        = var.zone_id
  name           = "Allow CI/CD access"
  precedence     = 2
  decision       = "non_identity"

  include {
    service_token = [cloudflare_access_service_token.ci_cd.id]
  }
}

output "service_token_id" {
  value     = cloudflare_access_service_token.ci_cd.client_id
  sensitive = true
}
```

## IP-Based Access Restrictions

```hcl
# ip-restrictions.tf - Allow access from specific IPs
resource "cloudflare_access_policy" "office_ip" {
  application_id = cloudflare_access_application.admin_panel.id
  zone_id        = var.zone_id
  name           = "Office IP requirement"
  precedence     = 3
  decision       = "allow"

  include {
    ip = var.office_ips
  }
}

variable "office_ips" {
  type    = list(string)
  default = ["203.0.113.0/24", "198.51.100.0/24"]
}
```

## Multiple Applications from Variables

```hcl
# dynamic-apps.tf - Generate applications from a map
variable "protected_apps" {
  type = map(object({
    subdomain        = string
    session_duration = string
    allowed_groups   = list(string)
  }))
  default = {
    "jenkins" = {
      subdomain        = "jenkins"
      session_duration = "8h"
      allowed_groups   = ["engineering"]
    }
    "argocd" = {
      subdomain        = "argocd"
      session_duration = "12h"
      allowed_groups   = ["engineering"]
    }
    "vault" = {
      subdomain        = "vault"
      session_duration = "4h"
      allowed_groups   = ["admins"]
    }
  }
}

resource "cloudflare_access_application" "dynamic" {
  for_each = var.protected_apps

  zone_id          = var.zone_id
  name             = title(each.key)
  domain           = "${each.value.subdomain}.${var.domain}"
  type             = "self_hosted"
  session_duration = each.value.session_duration
}
```

## Outputs

```hcl
output "access_applications" {
  value = {
    admin   = cloudflare_access_application.admin_panel.domain
    grafana = cloudflare_access_application.grafana.domain
    staging = cloudflare_access_application.staging.domain
  }
}
```

## Conclusion

Cloudflare Access policies managed with Terraform provide zero trust security for your internal applications without the complexity of a VPN. By defining access rules as code, you can review security changes in pull requests and maintain an audit trail of who has access to what. For the complete Cloudflare infrastructure setup, see our guides on [DNS records](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-dns-records-with-terraform/view) and [Workers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-cloudflare-workers-with-terraform/view).
