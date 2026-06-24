# MPL 2.0 vs BSL 1.1: Why OpenTofu Exists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Licensing, MPLS, BSL, Open Source

Description: Understand the license change that triggered the OpenTofu fork - the difference between Mozilla Public License 2.0 and Business Source License 1.1 - and what it means for infrastructure teams...

## Introduction

In August 2023, HashiCorp changed Terraform's license from the Mozilla Public License 2.0 (MPL 2.0) to the Business Source License 1.1 (BSL 1.1). This triggered the creation of OpenTofu as a community-maintained fork under MPL 2.0. Understanding the license difference helps you evaluate which tool fits your organization's needs.

## Mozilla Public License 2.0 (MPL 2.0)

MPL 2.0 is an OSI-approved open source license:

```text
Key permissions:
- Commercial use: YES, unrestricted
- Distribution: YES
- Modification: YES
- Patent use: YES
- Private use: YES

Key conditions:
- Source disclosure: Only for MPL-licensed files you distribute
- Copyleft scope: File-level (not project-level)
- License compatibility: Compatible with GPL, Apache 2.0

Key limitations:
- Liability: No warranty
- Trademark: Cannot use contributor trademarks
```

Practical meaning: You can use OpenTofu in commercial products, build services on top of it, and include it in proprietary software. You only need to share modifications to the MPL-licensed files themselves.

## Business Source License 1.1 (BSL 1.1)

BSL is NOT an OSI-approved open source license:

```text
Key permissions:
- Internal use: YES
- Non-production use: YES
- Modification: YES (with restrictions)

Key restrictions:
- "Additional Use Grant": HashiCorp's specific restriction:
  Cannot be used if your product competes with HashiCorp offerings
  (Terraform Cloud, Vault, Consul, Nomad, Boundary, Waypoint)

Change Date:
- After 4 years, converts to Mozilla Public License 2.0
- Terraform 1.6.0 (BSL) converts to MPL 2.0 in ~2027

Ambiguity:
- "Competing product" is subjective and not legally defined
```

## What the License Change Means

| Scenario | MPL 2.0 (OpenTofu) | BSL 1.1 (Terraform) |
|----------|-------------------|---------------------|
| Internal use | ✅ Permitted | ✅ Permitted |
| Building custom CI/CD with Terraform | ✅ Permitted | ⚠️ Potentially restricted |
| Commercial product that provisions infra | ✅ Permitted | ⚠️ Ambiguous |
| Managed service competing with TF Cloud | ✅ Permitted | ❌ Prohibited |
| Open-source tooling (Atlantis, Spacelift) | ✅ Permitted | ⚠️ Ambiguous |
| Enterprise with procurement/legal review | ✅ Clean | ⚠️ Requires legal review |

## Who Was Affected

The BSL change primarily affects:
- Companies building products on top of Terraform (Spacelift, env0, Atlantis authors)
- Managed service providers offering Terraform-as-a-service
- Organizations with open-source licensing requirements (government, academic, some enterprises)

Regular users provisioning their own infrastructure are generally unaffected in practice.

## The OpenTofu Response

The OpenTofu fork was initiated by a coalition of companies (Gruntwork, Spacelift, env0, Massdriver, Harness, Terramate, and others) through the Linux Foundation:

```hcl
Timeline:
Aug 10, 2023  - HashiCorp announces BSL license change
Aug 15, 2023  - OpenTF Manifesto published, calls for MPL restoration
Sep 20, 2023  - OpenTofu joins Linux Foundation
Oct 04, 2023  - OpenTofu 1.6.0 alpha released
Jan 10, 2024  - OpenTofu 1.6.0 stable released
Ongoing       - OpenTofu adds features not available in Terraform
```

## Practical Decision Guidance

```hcl
Are you building a product or service on top of Terraform/OpenTofu?
→ YES: Use OpenTofu (MPL 2.0, no competitive restrictions)

Does your organization have open-source licensing requirements?
→ YES: Use OpenTofu (OSI-approved MPL 2.0)

Do you need Terraform Enterprise features (Sentinel, TFC workspaces)?
→ YES: Terraform Enterprise is still a valid choice, with BSL implications

Are you a regular enterprise user provisioning your own infra?
→ EITHER: Both tools work; OpenTofu has no licensing ambiguity
```

## OpenTofu's License Commitment

OpenTofu is committed to remaining under MPL 2.0 via the Linux Foundation:

```hcl
"OpenTofu will always be open source under the MPL 2.0 license.
The OpenTofu Steering Committee controls the project and is
committed to keeping it free and open source."
- OpenTofu Charter, Linux Foundation
```

## Conclusion

The MPL 2.0 vs BSL 1.1 distinction matters most for companies building products on top of IaC tooling. For regular infrastructure users, both licenses permit normal infrastructure provisioning use cases. OpenTofu chose MPL 2.0 to maintain clear, unambiguous open-source status. If your organization has licensing procurement requirements, prefers OSI-certified licenses, or builds products leveraging IaC tooling, OpenTofu's MPL 2.0 license is the safer choice.
