# Validation Summary: OpenTofu MPL vs Terraform BSL: Understanding the Licensing Differences

## Status
validated

## Post Type
Guide / Reference (software licensing comparison)

## Technologies Covered
- OpenTofu
- HashiCorp Terraform
- Mozilla Public License 2.0 (MPL 2.0)
- Business Source License 1.1 (BSL 1.1)
- HCP Terraform (formerly Terraform Cloud)
- OpenTofu Registry
- Terraform Registry

## Sources Consulted
- HashiCorp BSL announcement and FAQ: https://www.hashicorp.com/license-faq
- HashiCorp Terraform LICENSE file (BSL 1.1) on GitHub: https://github.com/hashicorp/terraform/blob/main/LICENSE
- Business Source License 1.1 specification: https://mariadb.com/bsl11/
- Mozilla Public License 2.0: https://www.mozilla.org/en-US/MPL/2.0/
- Open Source Initiative (OSI) approved licenses: https://opensource.org/licenses
- OpenTofu announcement and FAQ: https://opentofu.org/
- OpenTofu Registry: https://registry.opentofu.org
- HCP Terraform rebrand (formerly Terraform Cloud): https://www.hashicorp.com/blog/hashicorp-cloud-platform-terraform-rebrands-to-hcp-terraform

## Issues Found
1. **Incorrect "Change License" for BSL conversion**: The post originally stated that HashiCorp's BSL converts to "Apache 2.0" after the 4-year change date. This is wrong — HashiCorp's BSL Change License for Terraform (and other HashiCorp products) is **MPL 2.0**, as specified in the LICENSE file in HashiCorp's Terraform repo and HashiCorp's BSL FAQ. Fixed in two places:
   - Bullet under "The Business Source License (BSL 1.1)": "Apache 2.0 for HashiCorp" → "MPL 2.0 for HashiCorp".
   - Side-by-side comparison table: "Apache 2.0 after 4 years" → "MPL 2.0 after 4 years". Also reworded the row label/header from "Converts to permissive license" / "N/A (already permissive)" to "Converts to a more permissive license" / "N/A (already open source)" since MPL 2.0 is technically a weak-copyleft (not strictly permissive) license.

2. **Tag typo "MPLS"**: The tag list included "MPLS", which is the acronym for Multiprotocol Label Switching — an unrelated networking technology. Corrected to "MPL".

## Review Notes
- The quoted "Additional Use Grant" sentence is a paraphrase, not the verbatim text from HashiCorp's BSL LICENSE file (the actual grant references "competitive offering ... hosted or embedded basis"). The post's framing is accurate in substance, so left as-is.
- The Spacelift / env0 / Scalr examples are accurate — these are real third-party Terraform-compatible IaC platforms that publicly cited the BSL change as a reason to adopt OpenTofu.
- The `hashicorp.com/license-faq` reference resolves to HashiCorp's BSL FAQ page; left as-is.
- General statement that "BSL means HashiCorp could change the additional use grant in future versions" is accurate for *future* releases — past releases remain governed by their published terms. The post's wording is acceptable.
- MPL 2.0 file-level copyleft characterization is correct.
