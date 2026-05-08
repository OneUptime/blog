# Validation Summary: Using Slack Channels in the Cilium Project

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium & eBPF Slack
- GitHub Issues
- Hubble

## Sources Consulted
- Cilium Community Meetings and Slack documentation: https://docs.cilium.io/en/stable/community/community/
- Cilium Getting Help documentation: https://docs.cilium.io/en/stable/gettingstarted/gettinghelp/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- The prerequisite listed the workspace as `cilium.slack.com`; the official docs direct users to join through `slack.cilium.io`. Updated the prerequisite to use the official join URL.
- The key channel list included undocumented channels `#troubleshooting`, `#announcements`, and `#community` while omitting officially documented channels such as `#kubernetes`, `#networkpolicy`, `#release`, `#service-mesh`, and `#tetragon`. Updated the list to match the Cilium documentation.
- The post told readers to check `#announcements`; Cilium documents `#release` as the release announcements channel. Updated the reference to `#release`.
- The help-routing diagram pointed installation/configuration questions to `#troubleshooting` and community questions to `#community`, neither of which is listed in the official channel table. Updated the diagram to route general help to `#general` and Kubernetes questions to `#kubernetes`.
- The troubleshooting section said meeting links are in `#community`; the official community page says the Zoom link is available in `#development` and in the meeting notes. Updated that guidance.
- The post claimed all official times are in UTC, but the official page lists the weekly community meeting in US/Pacific and the monthly APAC meeting in UTC. Updated the wording to tell readers to check each meeting's listed timezone.

## Review Notes
No code examples, commands, or configuration snippets required syntax validation. The post remains a community guide with technical resource references.
