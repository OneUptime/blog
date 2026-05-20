# Validation Summary: How to Join ArgoCD Community Slack and Meetings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Argo Project
- CNCF Slack
- GitHub Discussions
- GitHub CLI
- Kubernetes
- YAML

## Sources Consulted
- Argo Project Slack page: https://argoproj.github.io/community/join-slack/
- Argo CD README community section: https://github.com/argoproj/argo-cd
- Argo Project README project resources: https://github.com/argoproj/argoproj
- Argo Project governance document: https://github.com/argoproj/argoproj/blob/main/community/GOVERNANCE.md
- Argo SIG Security README: https://github.com/argoproj/argoproj/blob/main/sigs/sig-security/README.md
- Argo SIG Scalability README: https://github.com/argoproj/argoproj/blob/main/sigs/sig-scalability/README.md
- Argo CD Security Policy: https://github.com/argoproj/argo-cd/blob/master/SECURITY.md
- GitHub Discussions for argoproj/argo-cd: https://github.com/argoproj/argo-cd/discussions
- GitHub CLI help output for `gh browse`, `gh release list`, and `gh api`

## Issues Found
- The post described the main Argo CD community meeting as bi-weekly. The Argo CD README lists the user community meeting as the first Wednesday of the month, so the heading and cadence were corrected to monthly.
- The Slack channel list included `#argo-cd-dev`, which is not listed on the official Argo Slack page. It was replaced with official/current channels for UI and scalability discussion.
- Two fenced code blocks were malformed: the help-request example nested a YAML fence inside an open text fence, and the meeting-outline block was opened as `bash` but closed as `text`. The fences were corrected.
- The GitHub Discussions example used `gh browse --repo argoproj/argo-cd -- discussions`, which opens a repository tree path rather than the Discussions tab. It was replaced with the official Discussions URL.
- The security-vulnerability row pointed to a generic private mailing list. The current Argo CD security policy directs reporters to create a draft GitHub Security Advisory, so the table was corrected.
- The SIG section described UI/UX as an Argo CD SIG. The Argo Project repository currently lists Security, Scalability, and Marketing SIGs; UI is represented by the `#argo-sig-ui` Slack channel. The wording was adjusted accordingly.

## Review Notes
The GitHub CLI release and milestones commands were verified against local `gh --help` output and successfully executed. Some participation details such as Slack message volume and presentation length are community-observation claims rather than API-level facts, so they were left unchanged.
