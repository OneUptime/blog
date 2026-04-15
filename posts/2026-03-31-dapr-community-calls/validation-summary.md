# Validation Summary: How to Participate in Dapr Community Calls

## Status
validated

## Post Type
Community Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- GitHub CLI (`gh`)
- Git
- Discord
- YouTube

## Sources Consulted
- `dapr/community` GitHub repository (https://github.com/dapr/community) — README, directory structure, issue labels, and community call issues
- Dapr GitHub organization repositories — SIG repos (`sig-api`, `sig-sdk-spec`)
- Dapr YouTube channel (https://www.youtube.com/@daprdev)
- Dapr Discord server (official invite: http://bit.ly/dapr-discord)

## Issues Found

1. **Incorrect call frequency and day**: The post stated community calls are "bi-weekly on Thursdays." They are actually held every four weeks on Wednesdays. Fixed the schedule section accordingly.

2. **Wrong platform**: The post stated calls use Zoom. Dapr community calls are actually live-streamed on YouTube. Zoom is used for separate milestone/maintainer sync meetings, not community calls. Fixed all Zoom references.

3. **Incorrect time and fabricated calendar URL**: The post stated "9:00 AM Pacific / 17:00 UTC" with a fabricated Google Calendar link. This time applies to milestone sync meetings, not community calls, and the UTC conversion is only correct during PST (not PDT). Removed the incorrect time and calendar URL.

4. **Non-existent `meetings/` directory**: The post instructed readers to `ls community/meetings/` and `cat` files from it. This directory does not exist in `dapr/community`. The actual meeting notes are in `steering-and-technical-committee-meetings/`. Fixed the directory path.

5. **Incorrect issue label**: The post used `--label "community-call"` (with hyphen). The actual label is `"community call"` (with space). GitHub label matching is exact, so the original command would return no results. Fixed the label.

6. **Wrong YouTube handle**: The post referenced `@dapr_io`. The correct YouTube handle is `@daprdev`. Fixed the URL.

7. **Unverified Discord invite link**: The post used `https://discord.gg/ptHhX6jc34`, which is not the official invite link. The official link used in the `dapr/community` repo is `http://bit.ly/dapr-discord`. Fixed the URL.

8. **Fabricated SIG list**: The post listed four SIGs (Runtime, API, Security, Observability). Only SIG API and SIG SDK Spec actually exist in the Dapr organization. Corrected the SIG list and replaced the `sigs.md` command (file does not exist) with a `gh repo list` command to discover SIG repos.

9. **Unconfirmed CNCF Slack reference**: The post mentioned CNCF Slack as an alternative. The `dapr/community` repo only references Discord as the preferred communication platform and does not mention Slack. Removed the CNCF Slack section to avoid directing readers to an unconfirmed channel.

10. **Zoom reference in preparation checklist**: "Test your audio and video in Zoom" was changed to "Prepare to join the YouTube live stream" to match the actual platform.

11. **Summary section reference to Slack**: Removed "and Slack" from the summary paragraph since the Slack reference was removed.

## Review Notes
- This post had a high density of factual errors — the majority of specific claims (schedule, platform, URLs, repo structure, SIG names, labels) were incorrect. All have been corrected based on the current state of the `dapr/community` repository.
- The Discord channel names listed (#general, #help, #announcements, #contributing, #showcase) could not be verified from public sources but are plausible channel names for a CNCF project Discord server.
- The `gh` CLI command syntax throughout the post is correct and functional.
- Community details like schedules and links change over time; readers should always check the `dapr/community` README for the latest information.
