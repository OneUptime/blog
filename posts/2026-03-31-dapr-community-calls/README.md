# How to Participate in Dapr Community Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Community, Open Source, Meeting, Collaboration

Description: Join Dapr community calls to follow roadmap updates, present your use case, ask questions of maintainers, and network with other Dapr practitioners worldwide.

---

## What are Dapr Community Calls?

Dapr hosts regular community calls where maintainers present roadmap updates, contributors demo new features, and users ask questions. These calls are open to everyone and are an excellent way to stay current with Dapr development and build connections with the community.

## Call Schedule and Joining

Dapr community calls are held every four weeks on Wednesdays and are live-streamed on YouTube:

```yaml
Frequency: Every four weeks
Day: Wednesday
Platform: YouTube live stream (link in dapr/community repository)
```

```bash
# Find current schedule and stream link
gh api repos/dapr/community/contents/README.md \
  --jq '.content' | base64 -d | grep -A5 "Community Call"
```

## Community Repository

The `dapr/community` repository hosts meeting notes, recordings, and the community calendar:

```bash
# Clone community repo to access meeting notes
git clone https://github.com/dapr/community.git

# Browse past meeting notes
ls community/steering-and-technical-committee-meetings/

# View the latest meeting notes
cat community/steering-and-technical-committee-meetings/$(ls community/steering-and-technical-committee-meetings/ | sort | tail -1)
```

## Proposing an Agenda Item

To present at a community call, add an agenda item to the current call issue:

```bash
# Find the current community call issue
gh issue list \
  --repo dapr/community \
  --label "community call" \
  --state open

# Comment on the issue to add your agenda item
gh issue comment 123 \
  --repo dapr/community \
  --body "**Agenda item:** Demo of using Dapr with Clean Architecture

**Presenter:** @yourusername
**Duration:** 10 minutes
**Summary:** I built a .NET microservice using Dapr state management with the Clean Architecture pattern and would like to share lessons learned."
```

## Watch Past Recordings

All community call recordings are uploaded to YouTube:

```yaml
YouTube Channel: Dapr Dev
https://www.youtube.com/@daprdev
```

```bash
# Search for topics in meeting notes
grep -r "workflow" community/meetings/ | head -20
```

## Discord and Slack Community

Real-time community discussions happen on Discord:

```text
Discord server: http://bit.ly/dapr-discord

Key channels:
#general          - General Dapr discussion
#help             - Get help with Dapr issues
#announcements    - Release announcements
#contributing     - Contributor discussions
#showcase         - Share what you built with Dapr
```

## Participate in SIG (Special Interest Groups)

Dapr has Special Interest Groups for focused areas:

```text
SIG API        - API design and versioning
SIG SDK Spec   - SDK specification and cross-language consistency
```

```bash
# View SIG repositories for meeting schedules
gh repo list dapr --topic sig --json name,description
```

## Prepare for Your First Call

Before joining:

```markdown
## Preparation Checklist
- [ ] Review agenda items posted on the call issue
- [ ] Prepare to join the YouTube live stream
- [ ] Have questions ready for the Q&A section
- [ ] Review the previous call's recording if you missed it
- [ ] Join 5 minutes early for introductions
```

## Summary

Participating in Dapr community calls provides direct access to maintainers, roadmap updates, and the broader Dapr community. You can follow calls passively by watching YouTube recordings, engage actively via Discord, or present your Dapr use case by proposing an agenda item in the `dapr/community` repository. Regular participation helps you stay ahead of breaking changes and discover best practices from other users.
