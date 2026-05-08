# Validation Summary: Understanding Cilium Project Governance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CNCF project governance
- Open source contributor roles
- Cilium SIGs
- Cilium community meetings and Slack

## Sources Consulted
- Cilium Governance documentation: https://docs.cilium.io/en/stable/community/governance/
- Cilium community GOVERNANCE.md: https://github.com/cilium/community/blob/main/GOVERNANCE.md
- Cilium Contributor Ladder: https://github.com/cilium/community/blob/main/CONTRIBUTOR-LADDER.md
- Cilium SIG documentation: https://github.com/cilium/community/blob/main/SIG.md
- Cilium Community Meetings and Slack documentation: https://docs.cilium.io/en/stable/community/community/
- CNCF Code of Conduct: https://github.com/cncf/foundation/blob/main/code-of-conduct.md

## Issues Found
- The post stated that all decisions are made in public. Updated this to note that project work happens publicly where possible, while sensitive matters such as committer nominations and Code of Conduct reports are handled privately.
- The role hierarchy incorrectly placed Committers below Maintainers and SIG Leads. Updated the diagram and role descriptions to match Cilium's contributor ladder: Community Contributors, Organization Members, Reviewers, Sub-Project Committers, and Committers, with SIG Leads as reviewers who coordinate SIG work.
- The post described SIG Leads as having technical direction authority. Updated this to reflect that SIGs coordinate work and drive toward solutions accepted by the Committer community, but do not have additional authority.
- The decision-making section overstated lazy consensus and used "RFC process." Updated this to reflect Cilium's documented voting model, Company Block Vote Limit, editorial lazy consensus, and Cilium Feature Proposal process.
- The path to committer stated approval by a majority of maintainers. Updated this to approval by a majority of existing committers with zero no votes.
- The troubleshooting section referenced a `#community` Slack channel and said all official times are UTC. Updated this to reference meeting notes and the `#development` Slack channel, and clarified that the weekly community meeting is listed in US/Pacific while the APAC meeting is listed in UTC.

## Review Notes
The post is a governance guide rather than an implementation tutorial, but it contains technical community-process claims that were checked against current Cilium and CNCF documentation.
