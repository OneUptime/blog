# Run an Asynchronous Postmortem Across Time Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Incident Response, SRE

Description: Run a postmortem across time zones with clear review windows, evidence threads, recorded decisions, and targeted live discussion when needed.

An asynchronous postmortem lets people contribute without being online together. It should not mean leaving a document open indefinitely, asking for comments, and interpreting silence as agreement.

The difficult part is preserving a real discussion: participants need time to inspect evidence, challenge an explanation, answer questions, and understand how the final decisions were made. A team spread across several time zones needs that process to be explicit.

GitLab's communication guidance treats asynchronous work as a starting point and emphasizes writing down conclusions from offline conversations. The workflow below applies those principles to an incident review. [GitLab communication guidance](https://handbook.gitlab.com/handbook/communication/)

## Choose a facilitator and a maintained record

Assign a facilitator to keep the review moving. Their tasks are to identify required reviewers, maintain the current draft, organize unresolved questions, and record decisions. They should not silently decide every disputed technical point.

Use one incident record with a revision history. Chat can announce a question or link to evidence, but the durable explanation belongs in the record. If an important conclusion appears in a private conversation, bring an appropriate summary back to the shared review.

Keep access suitable for the evidence. “Asynchronous” does not mean public, and distributing the same sensitive log excerpt across multiple chat threads makes review and access control harder.

## Divide the review into stages

A single deadline for everything encourages people to comment on different versions of the explanation. Separate evidence collection, analysis, and decisions.

| Stage | Participants contribute | Facilitator produces |
|---|---|---|
| Evidence collection | Observations, source links, timeline corrections, missing context | A versioned incident packet with explicit unknowns |
| Analysis review | Challenges to claims, alternative explanations, evidence requests | Resolved claims and a short unresolved-question list |
| Action review | Proposed changes, feasibility, tradeoffs, acceptance criteria | Named owners and recorded decisions |
| Final check | Corrections to the actual proposed final revision | Reviewed record and remaining follow-up work |

Publish the expected input for each stage. “Please review” is less useful than “Check whether the recovery time in claim C-4 includes delayed jobs, and link the evidence if it does not.”

Allow corrections throughout the process. The stages organize attention; they should not prevent a late but important observation from changing an unsupported conclusion.

## Give people a real opportunity to respond

Choose review windows around the participants' working schedules, holidays, leave, and on-call recovery time. A nominal 24-hour window may contain very little usable time for someone who is asleep when the document arrives and busy responding to another incident the next morning.

For a fictional review, suppose the analysis window opens on 1 December 2026 at 16:00 UTC and closes on 3 December at 16:00 UTC. That is 48 elapsed hours, not a guarantee that every reviewer has two available workdays. Confirm availability and identify a delegate where necessary.

State the deadline with a date and time zone. Avoid “end of day Thursday,” which means different instants to different people.

## Check the local deadline explicitly

This small Python example converts the proposed closing instant into participants' local times. It uses `zoneinfo`, Python's support for the IANA time-zone database. That database contains named zones and their offset rules, including daylight-saving changes. [Python zoneinfo documentation](https://docs.python.org/3.13/library/zoneinfo.html)

Save it as `review_deadline.py` and run `python3 review_deadline.py`. It requires Python 3.9 or later and an installed IANA database, either supplied by the operating system or the Python `tzdata` package. It was checked with Python 3.9.6 using the system database.

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

closes = datetime(2026, 12, 3, 16, 0, tzinfo=timezone.utc)
zones = (
    "America/Los_Angeles",
    "Europe/London",
    "Asia/Kolkata",
    "Australia/Sydney",
)
for name in zones:
    local = closes.astimezone(ZoneInfo(name))
    print(f"{name}: {local:%Y-%m-%d %H:%M %z}")
```

Expected output for those rules:

```text
America/Los_Angeles: 2026-12-03 08:00 -0800
Europe/London: 2026-12-03 16:00 +0000
Asia/Kolkata: 2026-12-03 21:30 +0530
Australia/Sydney: 2026-12-04 03:00 +1100
```

The Sydney deadline falls overnight. That can be acceptable for a previously agreed multi-day review window, but it is not an appropriate time to expect a last-minute answer. If a material new claim arrives near closing, give affected reviewers another usable response window instead of relying on the original timer.

The script does not inspect calendars, holidays, or availability. If zone data is unavailable, `ZoneInfo` raises an error; fix the environment rather than replacing named zones with guessed permanent offsets.

## Turn comment threads into evidence-based questions

Give significant questions stable identifiers such as Q-7. Record the claim being discussed, the evidence available, the specific disagreement, and who can supply the missing information.

For example:

| Item | Review entry |
|---|---|
| Question Q-7 | Did the restart restore service, or did traffic decline first? |
| Current claim | Restart completed before the customer error rate recovered |
| Competing explanation | Lower traffic may have contributed to recovery |
| Evidence requested | Request rate and error rate over the same time window |
| Owner | On-call analyst |
| Decision state | Open; recovery sequence known, causal contribution unresolved |

This is more useful than a long thread of “I agree” messages. Agreement can confirm that people understand a conclusion, but it does not replace evidence for that conclusion.

Ask reviewers to separate corrections, questions, and proposals. A proposed retry change should not accidentally become part of the factual incident narrative merely because it appears next to the timeline.

## Summarize debate without erasing it

At each handoff, the facilitator should summarize what changed, which evidence was added, and which decisions remain open. Link the underlying discussion so participants can inspect the reasoning.

Do not mark a thread resolved just because its author went offline. Use explicit states such as answered, awaiting evidence, moved to a decision, or unresolved at review closure.

If two interpretations remain plausible, describe both and identify what would distinguish them. The final report can be useful while preserving an unknown. It should not manufacture consensus by removing the less convenient account.

## Use a short live discussion when it helps

Some disagreements are difficult to resolve through serial comments. Escalate to a focused conversation when participants keep talking past each other, an explanation requires interactive exploration, or an emotionally difficult issue needs careful facilitation.

PagerDuty's postmortem guidance values a live discussion for deeper analysis and agreement on actions, even after asynchronous writing. An asynchronous workflow should preserve that option rather than assume every review can be completed entirely in text. [Postmortem discussion goals](https://docs.pagerduty.com/ops-guides/postmortem-best-practices/postmortem-meeting)

Give the conversation a specific question and share the evidence beforehand. Record the conclusion, remaining disagreement, and action proposal afterward. Let absent required reviewers inspect that written result before it becomes the final decision. A recording can supplement the record, but it should not be the only way to discover a decision.

## Record decisions and close deliberately

For each action, capture the decision, rationale, owner, completion evidence, and next review date. An action owner must accept the work; an unanswered mention in a document is not acceptance.

Before closing, confirm that required reviewers have responded or that an authorized delegate has covered their perspective. If someone could not participate, state the gap and the decision about proceeding. Do not record their silence as approval.

Publish the reviewed revision with a short list of changes since the previous draft. Keep action tracking and unresolved investigations linked to it, so the postmortem can be reviewed without pretending every improvement is already complete.

A good asynchronous review makes participation possible across schedules while keeping responsibility visible. The final record should show not only the conclusions, but also how questions were answered, which alternatives remained, and who accepted the resulting work.
