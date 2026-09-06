# How to Configure OneUptime On-Call Rotations and Escalations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OneUptime, On-Call, Alerting, Incident Management, Automation

Description: Build OneUptime schedules, temporary overrides, and timed escalation rules that always resolve to a tested human responder.

---

An on-call configuration is a routing program. A schedule determines who is responsible at a moment, an override temporarily changes that person, and an escalation policy decides whom to notify and when. Each layer should be tested before production alerts depend on it.

The feature behavior below is based on OneUptime 12.0.33.

## Start with people and notification methods

Add responders to the project and the appropriate teams. Each person should configure and verify the channels they are expected to answer, such as email, SMS, voice call, or push. A user row in a schedule cannot compensate for an unreachable notification method.

Agree on:

- the schedule time zone
- shift boundary and rotation length
- primary and secondary responders
- expected acknowledgement time
- who owns overrides and handoffs
- the final fallback if nobody acknowledges

Use one explicit time zone and inspect daylight-saving transitions in the schedule preview.

## Build the schedule in layers

Create an on-call policy and separate primary and secondary schedules, then add layers within each schedule for the rotations your organization actually uses. Attach each schedule to the appropriate escalation rule. A primary weekly rotation and a separate secondary rotation are clearer than a single complicated sequence. Add users in the intended order and check several future weeks in the preview.

Layers model recurring responsibility. Do not edit the base rotation for one vacation or sick day; that changes future rotations and makes the exception hard to audit.

## Add a bounded override

Create a user override with:

- the person whose shift is being replaced
- the substitute responder
- an exact start and end timestamp
- the relevant on-call policy

OneUptime applies overrides within their time windows and policy scope. Schedule previews include global overrides and, when exactly one policy uses the schedule, that policy's overrides. For schedules shared by multiple policies, verify policy-specific substitutions through the relevant policy's routing; the shared preview shows only global overrides. Check the preview at both boundaries and ask the substitute to confirm the assignment. Avoid an open-ended informal handoff outside the tool.

Calendar feeds include schedule information and overrides, but subscribed calendar clients cache them. OneUptime documents that Google Calendar may refresh only every 8 to 24 hours. For a late override, rely on OneUptime's reassignment notices and shift reminders, not the external calendar becoming current immediately.

## Design escalation rules

Add escalation rules in the order they should execute. A simple policy might be:

| Approximate elapsed time from first rule | Target | Purpose |
| --- | --- | --- |
| 0 minutes | Primary schedule | Wake the current primary immediately |
| 5 minutes | Secondary schedule | Add an independent responder |
| 10 minutes | Incident commander team | Establish coordination and ownership |

OneUptime rules can target users, teams, or on-call schedules. The `escalateAfterInMinutes` field is the wait after the current rule before executing the next one. For the timing above, set it to 5 on both the primary and secondary rules; the final rule's wait controls when the policy can complete or repeat. The escalation worker checks pending executions once per minute, and notification delivery adds latency, so these are approximate timings. Choose the waits from incident severity and human response time, not from a convenient round number.

Configure the policy's repeat behavior only if repeated paging is intentional. The UI exposes `repeatPolicyIfNoOneAcknowledges` and the additional-repeat count `repeatPolicyIfNoOneAcknowledgesNoOfTimes`. In 12.0.33, the execution worker uses the numeric count to decide whether to repeat after the final rule's wait, so set that count to 0 when disabling repeats through the API. Acknowledgement stops further escalation; notifications already dispatched may still arrive. Always provide a final human or team fallback before relying on repeats.

## Attach the policy to real alert sources

An on-call policy does nothing until an incident, alert, monitor workflow, or other supported source routes to it. Attach the policy to the incident or alert, or configure a matching on-call rule for the relevant resources and severity; selecting a severity alone does not page anyone. Check for duplicate paths that page the same person through both a direct user target and a schedule.

Keep owner/member informational email separate from paging. OneUptime's email rollup does not delay on-call pages, so inbox batching should not be used as an escalation control.

## Run a controlled drill

Use OneUptime's test action where available, then run a scheduled end-to-end drill:

1. Trigger a low-risk test alert.
2. Confirm the current schedule resolves to the expected primary.
3. Let the first step expire and confirm the secondary is notified.
4. Acknowledge from the supported interface and confirm later rules and repeats stop.
5. Add a short override and repeat the test.
6. Review execution logs and delivery timestamps.

Never assume an email receipt proves voice, SMS, and push routing. Test every channel used by the policy and remove the test incident afterward.

## Audit regularly

Review the next 30 to 60 days for empty shifts, former employees, expired phone numbers, and overlapping overrides. Repeat a drill after schedule, provider, notification, or major OneUptime changes. Track time to acknowledge as feedback on the design.

## Conclusion

Reliable on-call routing comes from simple schedule layers, time-bounded overrides, explicit escalation delays, and a real acknowledgement drill. External calendars help with planning, but OneUptime's live schedule and execution logs should remain the routing authority.

## Official Documentation

- [OneUptime on-call calendar feeds and overrides](https://oneuptime.com/docs/en/on-call/calendar-feeds)
- [OneUptime On-Call Policy API](https://oneuptime.com/reference/en/on-call-duty-policy)
- [OneUptime On-Call Policy Schedule API](https://oneuptime.com/reference/en/on-call-duty-policy-schedule)
- [OneUptime On-Call Schedule Layer API](https://oneuptime.com/reference/en/on-call-duty-policy-schedule-layer)
- [OneUptime On-Call Duty Policy User Override API](https://oneuptime.com/reference/en/on-call-duty-policy-user-override)
- [OneUptime On-Call Duty Policy Escalation Rule API](https://oneuptime.com/reference/en/on-call-duty-policy-escalation-rule)
- [OneUptime incident management](https://oneuptime.com/docs/en/incidents/index)
