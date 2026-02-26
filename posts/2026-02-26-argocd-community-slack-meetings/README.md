# How to Join ArgoCD Community Slack and Meetings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Community, CNCF

Description: A complete guide to joining and participating in the ArgoCD community through Slack channels, community meetings, SIG groups, and other engagement opportunities.

---

The ArgoCD community is one of the most active in the CNCF ecosystem. Whether you are a beginner just getting started with GitOps or an experienced platform engineer running ArgoCD at scale, engaging with the community gives you access to real-world knowledge, faster problem solving, and influence over the project's direction. This guide covers all the ways to participate and get the most out of the ArgoCD community.

## Joining the CNCF Slack

ArgoCD's primary real-time communication happens on the CNCF Slack workspace. This is where you will find maintainers, contributors, and thousands of users.

### Getting Access

The CNCF Slack workspace is open to everyone. Here is how to join:

1. Visit `https://communityinviter.com/apps/cloud-native/cncf` or `https://slack.cncf.io`
2. Enter your email address to receive an invitation
3. Accept the invitation and create your account
4. Once logged in, search for and join the ArgoCD channels

### Key ArgoCD Channels

```
#argo-cd              - Main channel for ArgoCD questions and discussion
#argo-cd-contributors - For people contributing code or docs to ArgoCD
#argo-cd-dev          - Development discussions and PR reviews
#argo-rollouts        - Argo Rollouts progressive delivery discussions
#argo-workflows       - Argo Workflows discussions
#argo-events          - Argo Events discussions
#gitops               - General GitOps discussions across all tools
```

The `#argo-cd` channel is the most active, with hundreds of messages per day. This is where you should ask usage questions, share configurations, and report issues you are experiencing.

### Slack Etiquette

To get the most helpful responses from the community, follow these practices:

**Ask in threads.** Keep discussions organized by replying in threads rather than the main channel.

**Provide context upfront.** When asking for help, include your ArgoCD version, Kubernetes version, and relevant configuration.

```
Question: My application is stuck in "Progressing" state after sync.

ArgoCD version: v2.10.2
Kubernetes: v1.28 on EKS
Application type: Helm chart
What I've tried: Hard refresh, manual sync with --force

Here's the app status:
```yaml
status:
  health:
    status: Progressing
    message: "Waiting for rollout to finish: 0 of 3 updated replicas are available"
```
```

**Search before asking.** The channel has years of history. Many common questions have been answered multiple times. Use Slack's search functionality first.

**Be patient.** Community members are volunteers. If you do not get an immediate response, wait at least a few hours before re-posting. Avoid using @channel or @here.

**Share solutions.** If you solve your own problem, post the solution in the thread. Future searchers will thank you.

## ArgoCD Community Meetings

The ArgoCD project holds regular community meetings where users and contributors can discuss features, bugs, roadmap items, and share use cases.

### Bi-Weekly Community Meeting

The main ArgoCD community meeting happens every other week. Here is how to participate:

1. **Find the schedule.** Check the ArgoCD community calendar at `https://calendar.google.com/calendar/embed?src=argoproj@gmail.com`
2. **Join the call.** Meeting links are posted in the `#argo-cd` Slack channel before each meeting and are available on the calendar invite
3. **Review the agenda.** The meeting agenda is a shared Google Doc where anyone can add topics. Find the link in the calendar invite or pinned in the Slack channel
4. **Add your topics.** If you have something to discuss, add it to the agenda before the meeting

### What Happens in Community Meetings

A typical community meeting follows this structure:

```
1. Welcome and introductions (5 minutes)
2. Project updates from maintainers (10 minutes)
   - Recent releases
   - Upcoming features
   - CI/CD status
3. Community agenda items (30 minutes)
   - Feature proposals
   - Bug reports needing attention
   - User presentations
4. Open discussion (15 minutes)
```

### Presenting at a Community Meeting

Community meetings are an excellent venue for sharing your ArgoCD experiences. Types of presentations that are well received:

- **Use case presentations** - How your organization uses ArgoCD
- **Feature demos** - Demonstrating new features you have built or contributed
- **Architecture reviews** - Sharing your ArgoCD architecture for large-scale deployments
- **Integration showcases** - How you integrated ArgoCD with other tools
- **Problem-solving stories** - How you debugged and resolved complex ArgoCD issues

To present, add your topic to the meeting agenda with a brief description and time estimate. Presentations typically run 5 to 15 minutes.

## Special Interest Groups (SIGs)

ArgoCD has several SIGs that focus on specific areas of the project.

### Security SIG

Focuses on security hardening, vulnerability management, and security-related features. Relevant for anyone running ArgoCD in regulated environments.

### Scalability SIG

Discusses performance optimization, large-scale deployment patterns, and resource management for ArgoCD installations with hundreds or thousands of applications.

### UI/UX SIG

Focuses on the ArgoCD web interface, discussing new features, usability improvements, and design patterns.

To join a SIG, look for their dedicated Slack channels or meeting schedules in the `#argo-cd-contributors` channel.

## GitHub Discussions

ArgoCD uses GitHub Discussions for longer-form conversations that do not fit into Slack or bug reports.

```bash
# Browse discussions
gh browse --repo argoproj/argo-cd -- discussions

# Common discussion categories:
# - Q&A: Questions about ArgoCD usage
# - Ideas: Feature ideas and brainstorming
# - Show and Tell: Share your ArgoCD setup
# - General: Everything else
```

GitHub Discussions are better than Slack for complex questions because they are searchable, support Markdown formatting, and do not disappear after the Slack free tier message limit.

## Contributing to Community Events

### KubeCon and ArgoCon

The Argo project hosts ArgoCon as a co-located event at KubeCon. This is the premier in-person event for the Argo community. You can:

- Submit talk proposals through the CNCF CFP process
- Attend sessions on ArgoCD best practices and new features
- Network with maintainers and other power users
- Participate in contributor workshops

### Local Meetups

Many cities have Kubernetes or CNCF meetups where ArgoCD presentations are welcome. If there is not one in your area, consider starting one.

### Writing Blog Posts

The Argo project blog and third-party blogs are great places to share your ArgoCD knowledge. Maintainers often share community blog posts in the Slack channel and at community meetings.

## Staying Informed

### Release Notifications

Stay up to date with ArgoCD releases.

```bash
# Watch the repository on GitHub for releases
# Go to https://github.com/argoproj/argo-cd and click "Watch" > "Custom" > "Releases"

# Or use the GitHub CLI
gh release list --repo argoproj/argo-cd --limit 5
```

### Following the Roadmap

The ArgoCD roadmap is maintained on GitHub. Check the project board for planned features and their status.

```bash
# View the project milestones
gh api repos/argoproj/argo-cd/milestones --jq '.[].title'
```

### Social Media

Follow key accounts for ArgoCD updates:

- **Twitter/X:** @argaborj
- **LinkedIn:** Argo Project page
- **YouTube:** Argo Project channel for recorded community meetings and talks

## Getting Help Effectively

When you need help with ArgoCD, choose the right channel based on urgency and complexity:

| Need | Channel |
|------|---------|
| Quick question | Slack #argo-cd |
| Bug report | GitHub Issue |
| Feature request | GitHub Issue or Discussion |
| Architecture discussion | Community Meeting or GitHub Discussion |
| Security vulnerability | Email to security mailing list (private) |

The ArgoCD community is welcoming to newcomers and experienced users alike. Your participation - whether asking questions, answering them, or sharing your experiences - strengthens the project for everyone. For monitoring your ArgoCD deployment and catching issues early, integrate with [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-report-bugs-effectively/view) for real-time alerting and observability.
