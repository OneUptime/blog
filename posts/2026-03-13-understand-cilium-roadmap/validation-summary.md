# Validation Summary: How to Understand the Cilium Roadmap

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- GitHub Issues
- GitHub Projects
- GitHub Milestones
- Cilium Feature Proposals
- Cilium community meetings

## Sources Consulted
- Cilium Roadmap documentation: https://docs.cilium.io/en/latest/community/roadmap/
- Cilium Community Meetings documentation: https://docs.cilium.io/en/stable/community/community/
- Cilium contribution guide: https://docs.cilium.io/en/stable/contributing/development/contributing_guide/
- Cilium GitHub issues filtered by roadmap label: https://github.com/cilium/cilium/issues?q=label%3Aroadmap
- Cilium GitHub Projects page: https://github.com/cilium/cilium/projects
- Cilium GitHub Milestones page: https://github.com/cilium/cilium/milestones

## Issues Found
- The post described a single main Cilium GitHub project board with fixed Backlog/In Progress/Done columns. Current public GitHub data shows multiple Cilium project boards, including Release blockers, CI Quarantine, and SIG-specific roadmaps, so the wording was updated to describe multiple boards and more general status/release-relevance organization.
- The weekly meeting notes were described as current sprint priorities. Cilium's official community meeting documentation describes release status, CI state, development items for the next release, and open community topics, so the wording was changed to "release status and next-release development items."
- The post advised submitting an RFC for significant proposals. Cilium's contribution documentation uses Cilium Feature Proposals (CFPs), so the wording was corrected to "Submit a Cilium Feature Proposal (CFP)."

## Review Notes
The post is high-level and does not include executable code or configuration. The GitHub issue URL and issue-number placeholder URL are plausible, and the `roadmap` label exists in the Cilium repository. The roadmap remains community-driven and non-committal according to the official Cilium roadmap documentation.
