# Using the Cilium Roadmap for Planning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Roadmap, Planning, Strategy, Kubernetes

Description: Use the Cilium project roadmap to plan deployments, time upgrades, and align your infrastructure strategy with upcoming features.

---

## Introduction

Effective participation in open source projects requires understanding the available resources and processes. The cilium project roadmap provides essential information and collaboration opportunities for users and contributors alike.

Knowing how to navigate and roadmap effectively helps you get the most out of the Cilium ecosystem, whether you are troubleshooting an issue, planning a deployment, or contributing code.

This guide covers practical steps for using the Cilium project roadmap in your daily workflow.

## Prerequisites

- Familiarity with the Cilium project and its ecosystem
- A GitHub account for participating in project discussions
- Understanding of Cilium architecture and features

## Using the Roadmap for Planning

### Aligning Your Deployment

Use the roadmap to plan your Cilium adoption:

```bash
# Check current Cilium version
cilium version

# Compare with latest release
curl -s https://api.github.com/repos/cilium/cilium/releases/latest | \
  jq -r '.tag_name'
```

### Planning Upgrades

Map roadmap features to your needs:
1. Identify features you are waiting for
2. Check which release they target
3. Plan your upgrade cycle accordingly
4. Test beta/RC releases in staging

### Feature Readiness Assessment

Before depending on a roadmap feature:
- Is it committed or just planned?
- Is there an active PR or design document?
- What is the target release version?
- Are there known limitations or prerequisites?

### Communicating Roadmap to Stakeholders

Create internal roadmap summaries:
- Map Cilium features to business requirements
- Highlight features that unblock internal projects
- Note deprecations that require migration planning
- Track security-relevant changes

## Verification

Verify roadmap information is accessible and up to date.

## Troubleshooting

- **Cannot find meeting links**: Check the Cilium community calendar and #community Slack channel.
- **Slack workspace access**: Request an invite through the Cilium website.
- **GitHub permissions**: Ensure your account has the necessary access for the repositories you need.
- **Timezone confusion**: All official times are in UTC. Use a timezone converter for your local time.

## Conclusion

The project roadmap provides opportunities to understanding project direction. Active participation strengthens both your own Cilium practice and the broader community.
