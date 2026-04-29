# Validation Summary: MPL 2.0 vs BSL 1.1: Why OpenTofu Exists

## Status
validated

## Post Type
Reference / Explainer (license comparison and decision guidance)

## Technologies Covered
- Mozilla Public License 2.0 (MPL 2.0)
- Business Source License 1.1 (BSL 1.1)
- HashiCorp Terraform
- OpenTofu
- HashiCorp product family (Terraform Cloud, Vault, Consul, Nomad, Boundary, Waypoint)
- Linux Foundation governance

## Sources Consulted
- [OpenTF Manifesto repository](https://github.com/opentofu/manifesto)
- [InfoQ: OpenTF Foundation Released OpenTF Manifesto](https://www.infoq.com/news/2023/08/opentf-manifesto-terraform/)
- [Linux Foundation: Linux Foundation Launches OpenTofu](https://www.linuxfoundation.org/press/announcing-opentofu)
- [TechCrunch: Terraform fork gets renamed OpenTofu, and joins Linux Foundation](https://techcrunch.com/2023/09/20/terraform-fork-gets-a-new-name-opentofu-and-joins-linux-foundation/)
- [OpenTofu v1.6.0-alpha1 GitHub release](https://github.com/opentofu/opentofu/releases/tag/v1.6.0-alpha1)
- [OpenTofu blog: OpenTofu is going GA](https://opentofu.org/blog/opentofu-is-going-ga/)
- [HashiCorp BSL FAQ](https://www.hashicorp.com/license-faq)
- OSI license listings for MPL 2.0 (osi-approved) and absence of BSL 1.1
- Mozilla Public License 2.0 official text

## Issues Found
1. **Tag typo: "MPLS" → "MPL"** — The tag list included "MPLS" (Multi-Protocol Label Switching, an unrelated networking protocol) instead of "MPL" (Mozilla Public License). Corrected to "MPL".
2. **Incorrect date for OpenTF Manifesto** — Post said "Aug 14, 2023"; the OpenTF Manifesto was actually published on August 15, 2023 (per InfoQ and contemporaneous reporting). Fixed.
3. **Incorrect date for OpenTofu 1.6.0 alpha** — Post said "Nov 13, 2023"; OpenTofu v1.6.0-alpha1 was released on October 4, 2023 (per the GitHub release page). Fixed to "Oct 04, 2023".
4. **Incorrect date for OpenTofu 1.6.0 stable** — Post said "Jan 11, 2024"; OpenTofu 1.6.0 GA was released on January 10, 2024 (per the OpenTofu blog and Linux Foundation announcement). Fixed.

## Review Notes
- The MPL 2.0 description (file-level copyleft, OSI-approved, GPL/Apache 2.0 compatibility, source-disclosure scope) matches the official Mozilla Public License 2.0 text and FSF/OSI guidance.
- The BSL 1.1 description (non-OSI, 4-year change date converting to MPL 2.0, "Additional Use Grant" with competitive-product carve-out) accurately reflects HashiCorp's specific BSL terms. The post lists representative HashiCorp products subject to BSL — note that HashiCorp also relicensed Packer and (later) Vagrant under BSL, so the listed product set is non-exhaustive but illustrative; left as-is since the post's framing is about competitive offerings rather than a complete inventory.
- Terraform 1.6.0 was released October 4, 2023; the "~2027" change-date estimate in the post is consistent with the BSL 4-year change date.
- The coalition list (Gruntwork, Spacelift, env0, Massdriver, Harness, Terramate) matches the publicly named founding supporters.
- The Sentinel and Terraform Cloud workspaces references are accurate descriptions of features that remain under HashiCorp's commercial offerings (and were not forked into OpenTofu).
- The post's HashiCorp announcement date (Aug 10, 2023) and Linux Foundation joining date (Sep 20, 2023, announced at Open Source Summit Bilbao) are both correct.
