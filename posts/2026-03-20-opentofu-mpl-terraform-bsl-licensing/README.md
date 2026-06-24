# OpenTofu MPL vs Terraform BSL: Understanding the Licensing Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Licensing, Open Source, BSL, MPLS

Description: Learn the key differences between OpenTofu's Mozilla Public License and HashiCorp Terraform's Business Source License, and what each means for your organization.

## Introduction

In August 2023, HashiCorp changed Terraform's license from the Mozilla Public License (MPL 2.0) to the Business Source License (BSL 1.1). This change prompted the creation of OpenTofu, which maintains the MPL 2.0 license. Understanding these licenses is crucial for organizations deciding between the two tools.

## The Mozilla Public License (MPL 2.0)

OpenTofu uses the Mozilla Public License 2.0, a weak copyleft license that is:

- **Open source** - OSI-approved and recognized by the Free Software Foundation
- **File-level copyleft** - MPL-licensed files must remain MPL-licensed if redistributed
- **Compatible with proprietary software** - MPL code can be combined with proprietary code
- **Patent grant included** - Contributors grant patent rights to users

### What You Can Do Under MPL 2.0

- Use OpenTofu freely for any purpose, commercial or non-commercial
- Build commercial products that use or extend OpenTofu
- Create competing services that use OpenTofu as their core
- Modify and redistribute OpenTofu without making all your code open source
- Incorporate OpenTofu into proprietary tools

### What MPL 2.0 Requires

- Any modifications to the MPL-licensed files themselves must be released under MPL 2.0
- You must preserve copyright notices
- You cannot use the OpenTofu trademark without permission

## The Business Source License (BSL 1.1)

HashiCorp relicensed Terraform under BSL 1.1. BSL is:

- **Source-available, not open source** - Not OSI-approved
- **Time-limited restriction** - After a conversion period (typically 4 years), code converts to a more permissive license (MPL 2.0 for HashiCorp)
- **Production use allowed** with restrictions
- **Competitive use restricted** - The key restriction

### The BSL 1.1 Additional Use Grant

HashiCorp's specific BSL includes an "Additional Use Grant" that permits using Terraform unless:

> "The product or service competes with HashiCorp's products or services."

More specifically, the grant prohibits use in:
- Products that compete with Terraform
- Services that compete with HCP Terraform (formerly Terraform Cloud)
- Consulting services whose primary value is implementing Terraform for a customer

### Practical BSL 1.1 Restrictions

Under BSL 1.1, the following are **restricted**:
- Building a managed Terraform/IaC-as-a-service platform
- Creating a commercial alternative to HCP Terraform
- Building consulting services where Terraform expertise is the core offering

### What BSL 1.1 Allows

- Internal enterprise use of Terraform
- Using Terraform in CI/CD pipelines for your own infrastructure
- Writing Terraform providers and modules
- Using Terraform to deploy your application infrastructure

## Side-by-Side Comparison

| Aspect | OpenTofu (MPL 2.0) | Terraform (BSL 1.1) |
|---|---|---|
| OSI-approved open source | Yes | No |
| Free for commercial use | Yes, unrestricted | Yes, with restrictions |
| Competitive commercial use | Yes | No |
| Modifications must be open source | Only MPL files | No |
| Patent protection | Yes | Yes |
| Trademark use | No (separate policy) | No |
| Converts to a more permissive license | N/A (already open source) | MPL 2.0 after 4 years |

## Why Organizations Chose OpenTofu

Many organizations switched to or adopted OpenTofu because:

1. **Legal clarity**: MPL 2.0 has clear, well-understood terms. BSL 1.1 has gray areas around what "competes" means.

2. **Platform companies**: Spacelift, env0, Scalr, and others could not use BSL Terraform for their managed IaC platforms.

3. **Open source principles**: Many organizations have policies requiring only OSI-approved open source licenses for critical infrastructure tools.

4. **Future-proofing**: BSL means HashiCorp could change the additional use grant in future versions, potentially restricting current use cases.

## The Practical Impact for Your Organization

If you're a company using Terraform for internal infrastructure deployment, the BSL 1.1 most likely does not affect you. The restriction targets companies building competitive commercial services.

However, consider OpenTofu if:
- Your legal team requires OSI-approved licenses for infrastructure tools
- You're building a platform where IaC is a commercial offering
- You want to contribute to a genuinely community-governed project
- You want certainty that the license won't change again

## The Registry Question

HashiCorp's provider and module registry is not affected by the BSL for end users. However, OpenTofu maintains its own registry at `registry.opentofu.org` to avoid dependency on HashiCorp infrastructure.

Most providers published on `registry.terraform.io` are also available on `registry.opentofu.org` under their original open source licenses.

## Best Practices

- Consult your legal team before making a final decision on Terraform vs. OpenTofu for commercial use cases.
- Review the BSL Additional Use Grant at `hashicorp.com/license-faq` for specific use case guidance.
- If migrating from Terraform to OpenTofu, the technical migration is minimal - the syntax is identical.
- Document your license rationale for compliance records.

## Conclusion

The MPL vs. BSL difference comes down to openness and commercial restrictions. OpenTofu's MPL 2.0 license maintains the original open-source spirit of Terraform, while Terraform's BSL 1.1 restricts competitive commercial use. For most internal enterprise users, the choice may be philosophical; for platform companies, the choice is legally significant.
