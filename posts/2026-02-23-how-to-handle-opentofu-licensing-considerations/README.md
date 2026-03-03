# How to Handle OpenTofu Licensing Considerations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Licensing, Open Source, DevOps

Description: Understanding the licensing landscape around OpenTofu and Terraform, including practical guidance on compliance, migration considerations, and what the MPL 2.0 license means for your organization.

---

The infrastructure-as-code landscape shifted significantly when HashiCorp announced the license change for Terraform from the Mozilla Public License 2.0 (MPL 2.0) to the Business Source License 1.1 (BSL 1.1). This change sparked the creation of OpenTofu, a community fork that remains under the MPL 2.0 license and is governed by the Linux Foundation. If you are evaluating OpenTofu or planning a migration, understanding the licensing implications is essential.

## The Background: What Happened

In August 2023, HashiCorp changed the license for Terraform (and several other products) from MPL 2.0 to BSL 1.1. The BSL is not considered an open source license by the Open Source Initiative (OSI). Under the BSL, you can still view and modify the source code, but there are restrictions on using it for production purposes that compete with HashiCorp's commercial offerings.

The community response was swift. A group of companies and individual contributors formed the OpenTofu initiative, forked the last MPL-licensed version of Terraform, and placed the project under the Linux Foundation's governance. This ensures that OpenTofu remains truly open source under the MPL 2.0 license.

## Understanding MPL 2.0

The Mozilla Public License 2.0 is a weak copyleft license. Here is what that means in practical terms:

**You can use it freely.** There are no restrictions on using MPL 2.0 software for any purpose, including commercial use. You can run OpenTofu in production, use it in your CI/CD pipelines, and build products on top of it without paying license fees.

**File-level copyleft.** If you modify files that are part of the MPL-licensed codebase, you must release those modifications under the MPL 2.0 license. However, you can combine MPL-licensed code with proprietary code, as long as you keep them in separate files.

**No patent retaliation.** The MPL 2.0 includes a patent grant from contributors, which means you get a license to any patents that cover the contributed code.

```text
# Quick summary of what you can do under MPL 2.0:
# - Use commercially: YES
# - Modify: YES (modified MPL files must stay MPL)
# - Distribute: YES
# - Use privately: YES
# - Use patents: YES (with grant from contributors)
# - Sublicense: NO (but you can distribute under compatible terms)
```

## Understanding BSL 1.1 (Terraform's Current License)

The BSL 1.1 that Terraform now uses has an "Additional Use Grant" that defines what is and is not allowed. The key restriction is that you cannot provide a commercial offering that competes with HashiCorp's products. After four years, BSL-licensed code converts to the Apache 2.0 license.

This means:

- Using Terraform internally at your company is generally fine
- Building and selling a Terraform-as-a-service platform is restricted
- Embedding Terraform in a commercial product that competes with HashiCorp may be restricted
- The exact boundaries of "competitive" use can be ambiguous

## When Licensing Matters for Your Organization

For many teams, the licensing change does not immediately affect their day-to-day work. However, there are several scenarios where it matters significantly:

### Managed Service Providers

If you are a managed service provider or consultancy that offers infrastructure management as a service, using Terraform under the BSL could be problematic depending on how your service is structured. OpenTofu under the MPL 2.0 has no such restrictions.

### Platform Engineering Teams Building Internal Tools

If your platform team builds an internal developer platform that wraps Terraform, you are likely fine under the BSL for internal use. But if that platform is ever offered to external customers, you may cross into restricted territory.

### Vendors Building IaC Products

If your company builds products in the infrastructure management space, the BSL restrictions are most relevant. OpenTofu under MPL 2.0 allows you to build and sell products without concern about competitive use restrictions.

## Evaluating the Migration

If licensing concerns motivate you to move from Terraform to OpenTofu, here are the practical considerations:

### Compatibility

OpenTofu forked from Terraform 1.5.x and maintains backward compatibility with Terraform's configuration language (HCL). Most Terraform configurations work with OpenTofu without changes:

```hcl
# This configuration works identically in both Terraform and OpenTofu
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/infrastructure.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "web-server"
  }
}
```

### Provider Registry

OpenTofu uses its own provider registry at `registry.opentofu.org`, but it mirrors providers from the HashiCorp registry. Most community and official providers are available. However, some HashiCorp-developed providers that are BSL-licensed may not be mirrored.

```hcl
# OpenTofu-specific provider source (if needed)
terraform {
  required_providers {
    aws = {
      source  = "registry.opentofu.org/hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

### State File Compatibility

OpenTofu can read Terraform state files. The migration path for state is straightforward:

```bash
# Existing Terraform state works with OpenTofu
# Simply switch the binary
tofu plan

# If you need to migrate state format
tofu state pull > state.json
tofu state push state.json
```

## Compliance Checklist

Here is a practical checklist for handling licensing in your organization:

```markdown
## License Compliance Checklist

### For OpenTofu (MPL 2.0)
- [ ] If modifying OpenTofu source files, modifications are released under MPL 2.0
- [ ] License notice is included in distributed copies
- [ ] Patent grants are understood and documented

### For Terraform (BSL 1.1)
- [ ] Usage does not constitute a competitive commercial offering
- [ ] Legal team has reviewed the Additional Use Grant
- [ ] Internal use vs. external offering boundaries are documented
- [ ] Conversion date to Apache 2.0 is tracked for relevant versions

### General
- [ ] Provider licenses are individually reviewed
- [ ] Third-party modules have compatible licenses
- [ ] License compliance is documented in architecture decision records
```

## Dual-Compatibility Strategy

Some organizations maintain compatibility with both Terraform and OpenTofu during a transition period. This is achievable because the configuration language is largely the same:

```bash
#!/bin/bash
# Script to validate configurations work with both tools

# Define which tool to use based on environment
IaC_TOOL="${IAC_TOOL:-tofu}"

# Validate the configuration
$IaC_TOOL init
$IaC_TOOL validate
$IaC_TOOL plan -out=plan.tfplan

echo "Validation successful with $IaC_TOOL"
```

You can set up CI pipelines that test your configurations against both tools to ensure compatibility during the migration window.

## Module and Provider License Auditing

Beyond the core tool, you should audit the licenses of the modules and providers you use:

```bash
# List all providers in use
tofu providers

# Check module sources in your configuration
grep -r "source" *.tf | grep "module"
```

Most community providers remain under permissive licenses (MPL 2.0 or Apache 2.0). However, it is worth verifying this for each provider in your stack, especially if you are in a regulated industry.

## Working with Legal Teams

When presenting licensing options to your legal team, focus on these key points:

1. **OpenTofu (MPL 2.0)** is an OSI-approved open source license with well-understood terms
2. **Terraform (BSL 1.1)** is a source-available license with usage restrictions
3. The risk profile depends on how your organization uses the tool
4. Both options have active maintenance and security patching

Provide concrete examples of how your team uses IaC tooling, so legal can evaluate the specific terms against your use case rather than making abstract judgments.

## Monitoring Your Infrastructure

Regardless of which IaC tool you choose, monitoring the infrastructure you deploy is critical. [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your services, helping you track uptime and performance across your entire stack.

## Conclusion

Licensing is not the most exciting topic, but getting it right protects your organization and supports the open source ecosystem. OpenTofu under MPL 2.0 offers a clear, permissive path for organizations that need open source certainty. Terraform under BSL 1.1 remains a viable option for most internal use cases but carries restrictions worth understanding.

Take the time to document your licensing decisions, review them periodically, and keep your legal team informed as the landscape evolves. For related reading, see our guides on [contributing to OpenTofu](https://oneuptime.com/blog/post/2026-02-23-how-to-contribute-to-opentofu/view) and [using OpenTofu with Spacelift](https://oneuptime.com/blog/post/2026-02-23-how-to-use-opentofu-with-spacelift/view).
