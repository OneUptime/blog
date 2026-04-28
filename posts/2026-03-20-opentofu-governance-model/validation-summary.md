# Validation Summary: How to Understand OpenTofu Governance Model

## Status
validated

## Post Type
Reference / Guide (governance overview, non-implementation but contains structured technical/process content with commands and links)

## Technologies Covered
- OpenTofu
- Linux Foundation / LF Projects
- Mozilla Public License 2.0 (MPL-2.0)

## Sources Consulted
- OpenTofu GOVERNANCE.md: https://github.com/opentofu/org/blob/main/GOVERNANCE.md
- OpenTofu Technical Charter: https://github.com/opentofu/org/blob/main/CHARTER.md
- OpenTofu org repository: https://github.com/opentofu/org
- OpenTofu website: https://opentofu.org/
- Pointer file at https://github.com/opentofu/opentofu/blob/main/GOVERNANCE.md (which links to the org repo)

## Issues Found
1. **Incorrect TSC selection process.** The original post claimed "TSC members are elected by the OpenTofu community." The actual GOVERNANCE.md specifies that new TSC members are nominated by an existing TSC member and added by a supermajority (two-thirds) vote of the existing TSC. There is no community-wide election. Updated the wording to reflect the actual process and the criteria (significant code, documentation, community, or technical leadership contributions).

2. **Broken `tsc-meetings` URL.** `https://github.com/opentofu/opentofu/tree/main/tsc-meetings` returns 404. TSC meeting records actually live in the `opentofu/org` repository at `https://github.com/opentofu/org/tree/main/TSC`. Updated the URL.

3. **Broken charter URL.** `opentofu.org/charter` returns 404. The Technical Charter is published at `https://github.com/opentofu/org/blob/main/CHARTER.md`. Updated the reference.

4. **Misleading "Nominate yourself for TSC when elections open" instruction.** Since TSC additions are by internal nomination + supermajority vote (not public elections), changed the step to reflect that interested community members should grow as contributors and that TSC members are nominated by existing TSC members. The accompanying GOVERNANCE.md link was updated from the pointer file to the actual document at `https://github.com/opentofu/org/blob/main/GOVERNANCE.md`.

## Review Notes
- The MPL-2.0 license claim, Linux Foundation stewardship, vendor-neutrality principles (TSC Cap voting limit, multi-org membership), and the broad description of TSC responsibilities all match the Technical Charter.
- The "Decision-Making Process" table (e.g., "1 core maintainer approval" for bug fixes, "2 core maintainer approvals" for enhancements) describes typical OpenTofu workflow conventions; specific approval counts are not codified in the Charter or GOVERNANCE.md but are consistent with the project's CONTRIBUTING practices and were left as written since they reflect common practice and are not contradicted by official docs.
- The Charter uses the terms "Contributors" and "Committers" rather than "Maintainer" and "Core Maintainer," but the post's terminology aligns with how the OpenTofu community commonly describes these roles, so it was left in place.
- TSC responsibilities are framed in the post as including "Approving or rejecting RFCs"; the Charter speaks more broadly of "Approving sub-project or system proposals" and "Coordinating the technical direction." RFCs are a standard part of OpenTofu's workflow, so this characterization is reasonable.
