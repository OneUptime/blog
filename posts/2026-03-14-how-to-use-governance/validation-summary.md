# Validation Summary: Using Cilium Governance Processes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium governance
- Cilium Feature Proposals (CFPs)
- Cilium community meetings
- Cilium Slack
- Git and GitHub

## Sources Consulted
- Cilium governance documentation: https://docs.cilium.io/en/stable/community/governance/
- Cilium community meetings and Slack documentation: https://docs.cilium.io/en/stable/community/community/
- Cilium roadmap documentation: https://docs.cilium.io/en/latest/community/roadmap/
- Cilium contributing guide: https://docs.cilium.io/en/stable/contributing/development/contributing_guide/
- Cilium community repository governance policy: https://github.com/cilium/community/blob/main/GOVERNANCE.md
- Cilium design CFP repository: https://github.com/cilium/design-cfps
- Cilium CFP template: https://github.com/cilium/design-cfps/blob/main/cfps/CFP-003-template.md

## Issues Found
- The post referred to "Cilium Enhancement Proposal (CEP)", but Cilium's documented term is "Cilium Feature Proposal (CFP)". Updated the text to use CFP.
- The proposal example copied `template.md` into `cfp-XXXX-your-feature.md`, but the official template is `cfps/CFP-003-template.md` and submitted CFPs use project folders such as `cilium/CFP-###-subject.md`. Updated the command and filename pattern.
- The template section list did not match the official CFP template. Updated it to include goals, non-goals, impacts/key questions, and future milestones.
- The conflict-resolution flow implied escalation to SIG leads and final maintainer decisions. Cilium governance documents unresolved disputes as committer decisions, with voting if committers cannot decide. Updated the steps accordingly.
- The elections section implied public governance elections. Cilium's documented governance process covers committer nomination, discussion, and voting by existing committers. Updated the section to describe committer decisions.
- The troubleshooting guidance pointed to `#community` for meeting links and said all official times are UTC. Current Cilium docs list the Zoom link in `#development` and meeting notes, with weekly meetings in US/Pacific and APAC meetings in UTC. Updated both items.

## Review Notes
The guide is intentionally high level. Future improvements could link directly to the Cilium governance repository, CFP repository, and community meeting page so readers can follow the current process without relying on summarized steps.
