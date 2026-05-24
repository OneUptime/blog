# Validation Summary: How to Handle OpenTofu Licensing Considerations

## Status
validated

## Post Type
Guide / Reference (covers licensing considerations and includes practical CLI/HCL examples)

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform
- HashiCorp Configuration Language (HCL)
- Mozilla Public License 2.0 (MPL 2.0)
- Business Source License 1.1 (BSL / BUSL 1.1)
- Apache 2.0 (referenced)
- AWS provider (used in example HCL)
- S3 backend (Terraform state backend)

## Sources Consulted
- HashiCorp BSL announcement (August 10, 2023): https://www.hashicorp.com/blog/hashicorp-adopts-business-source-license
- HashiCorp Terraform LICENSE file (BUSL-1.1) on GitHub: https://github.com/hashicorp/terraform/blob/main/LICENSE — confirms Change License is MPL 2.0
- BSL 1.1 reference text: https://mariadb.com/bsl11/
- Mozilla Public License 2.0 official text: https://www.mozilla.org/en-US/MPL/2.0/ (including Section 5.2 on patent termination)
- OpenTofu official documentation: https://opentofu.org/docs/
- OpenTofu provider registry: https://registry.opentofu.org
- OpenTofu CLI command reference (`tofu state pull`, `tofu state push`, `tofu providers`, `tofu plan`, `tofu init`, `tofu validate`)
- OpenTofu announcement / Linux Foundation governance: https://www.linuxfoundation.org/press/announcing-opentofu
- Open Source Initiative license list: https://opensource.org/licenses

## Issues Found
1. **Incorrect Change License for HashiCorp's BSL** — The post originally stated "After four years, BSL-licensed code converts to the Apache 2.0 license." HashiCorp's BSL 1.1 LICENSE file explicitly specifies MPL 2.0 as the Change License, not Apache 2.0. Updated both the body paragraph under "Understanding BSL 1.1" and the corresponding bullet in the Compliance Checklist to say MPL 2.0.

2. **"No patent retaliation" heading was incorrect** — MPL 2.0 Section 5.2 contains a patent termination/retaliation clause: filing a patent infringement claim against a contributor over the covered software terminates your rights. The heading "No patent retaliation" was wrong and inconsistent with the body text (which actually describes the patent grant). Changed the heading to "Patent grant" and added a clarifying sentence about the patent termination clause so readers do not get the wrong impression.

## Review Notes
- The MPL 2.0 "Sublicense: NO" line in the summary code block is technically correct; MPL 2.0 does not permit sublicensing — recipients receive their license directly from the original licensor.
- OpenTofu was indeed forked from the Terraform 1.5.x line, with OpenTofu 1.6.0 being its first stable release in January 2024. The `required_version = ">= 1.6.0"` example is reasonable.
- The example AMI `ami-0c55b159cbfafe1f0` is an Amazon Linux 2 AMI for `us-east-1` commonly used in tutorials. Since this is illustrative and not a deployment recipe, no change was made, but readers should always look up a current AMI for production use.
- BSL boundary statements ("competitive commercial offering") are intentionally hedged in the post, which is appropriate given the legal ambiguity HashiCorp themselves have acknowledged.
- The post's claim that OpenTofu's registry mirrors most providers from the HashiCorp registry is accurate; OpenTofu maintains a registry that proxies/mirrors community and official providers.
