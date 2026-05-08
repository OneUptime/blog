# Using Cilium Governance Processes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Governance, Process, Contributing, Open Source

Description: Navigate Cilium governance processes for proposals, decision-making, and conflict resolution within the project.

---

## Introduction

Effective participation in open source projects requires understanding the available resources and processes. Cilium project governance provides essential information and collaboration opportunities for users and contributors alike.

Knowing how to navigate and governance effectively helps you get the most out of the Cilium ecosystem, whether you are troubleshooting an issue, planning a deployment, or contributing code.

This guide covers practical steps for using Cilium project governance in your daily workflow.

## Prerequisites

- Familiarity with the Cilium project and its ecosystem
- A GitHub account for participating in project discussions
- Basic understanding of open source governance models

## Navigating Governance Processes

### Proposing Changes

For feature proposals and design changes:

```bash
# Create a Cilium Feature Proposal (CFP)

# Fork the cilium/design-cfps repository
git clone https://github.com/YOUR-USERNAME/design-cfps.git
cd design-cfps

# Create your proposal from the template after opening a CFP issue
cp cfps/CFP-003-template.md cilium/CFP-XXXX-your-feature.md

# Fill in the template sections:
# - Summary
# - Motivation
# - Goals and Non-Goals
# - Proposal
# - Impacts / Key Questions
# - Future Milestones
```

### Conflict Resolution

When disagreements arise:
1. Discuss in the relevant SIG or PR
2. Bring design topics to the #development Slack channel or community meeting for broader input
3. Ask committers to decide if a dispute cannot be resolved independently
4. If committers cannot decide, the issue is resolved by a committer vote

### Participating in Committer Decisions

When committer access is considered:
- Existing committers nominate candidates based on sustained project contributions
- Committers discuss nominations in the private #committers Slack channel
- Voting follows the documented committer grant policy
- Results are summarized to existing committers, and accepted candidates are invited to become committers

## Verification

Check that governance documents are accessible and current.

## Troubleshooting

- **Cannot find meeting links**: Check the Cilium community documentation, meeting notes, and #development Slack channel.
- **Slack workspace access**: Request an invite through the Cilium website.
- **GitHub permissions**: Ensure your account has the necessary access for the repositories you need.
- **Timezone confusion**: Meeting times may be listed in US/Pacific or UTC depending on the meeting. Use a timezone converter for your local time.

## Conclusion

Project governance provides opportunities to ensuring project health. Active participation strengthens both your own Cilium practice and the broader community.
