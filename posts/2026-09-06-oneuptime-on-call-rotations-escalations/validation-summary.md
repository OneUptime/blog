# Validation Summary: How to Configure OneUptime On-Call Rotations and Escalations

## Status
validated

## Post Type
Technical configuration guide. Although there are no executable examples, the schedule, override, escalation, and routing instructions contain technical implementation details requiring review.

## Technologies Covered
- OneUptime 12.0.33 on-call policies, schedules, and schedule layers
- User overrides and policy-scoped routing
- Escalation delays, repeats, and acknowledgement
- Email, SMS, voice, and push notification delivery
- iCalendar subscription feeds and Google Calendar caching
- Incident and alert routing, notification email rollups

## Sources Consulted
- [Official calendar feeds and overrides documentation](https://oneuptime.com/docs/en/on-call/calendar-feeds)
- [Official On-Call Policy API reference](https://oneuptime.com/reference/en/on-call-duty-policy)
- [Official Schedule API reference](https://oneuptime.com/reference/en/on-call-duty-policy-schedule)
- [Official Schedule Layer API reference](https://oneuptime.com/reference/en/on-call-duty-policy-schedule-layer)
- [Official User Override API reference](https://oneuptime.com/reference/en/on-call-duty-policy-user-override)
- [Official Escalation Rule API reference](https://oneuptime.com/reference/en/on-call-duty-policy-escalation-rule)
- [Official incident management documentation](https://oneuptime.com/docs/en/incidents/index)
- [OneUptime 12.0.33: Schedule-layer data model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/OnCallDutyPolicyScheduleLayer.ts)
- [OneUptime 12.0.33: Override data model](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Models/DatabaseModels/OnCallDutyPolicyUserOverride.ts)
- [OneUptime 12.0.33: Schedule preview override scope](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Dashboard/src/Components/OnCallPolicy/OnCallScheduleLayer/ScheduleOverrides.ts)
- [OneUptime 12.0.33: Schedule routing and calendar resolution](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/OnCallDutyPolicyScheduleService.ts)
- [OneUptime 12.0.33: Escalation execution and wait assignment](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/OnCallDutyPolicyEscalationRuleService.ts)
- [OneUptime 12.0.33: Escalation worker, repeats, and acknowledgement](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Workers/Jobs/OnCallDutyPolicyExecutionLog/ExecutePendingExecutions.ts)
- [OneUptime 12.0.33: Repeat configuration UI](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Dashboard/src/Components/OnCallPolicy/RepeatPolicy.tsx)
- [OneUptime 12.0.33: Notification rollup exclusions](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Types/NotificationSetting/NotificationEmailRollupPolicy.ts)
- [OneUptime 12.0.33: Shift reminder and reassignment notification settings](https://github.com/OneUptime/oneuptime/blob/12.0.33/Common/Server/Services/UserNotificationSettingService.ts)
- [OneUptime 12.0.33: Version-pinned incident documentation](https://github.com/OneUptime/oneuptime/blob/12.0.33/App/FeatureSet/Docs/Content/en/incidents/index.md)

## Issues Found
1. **Schedule hierarchy was incomplete.** The original instruction implied adding schedule layers directly to a policy. Clarified that layers belong to schedules and schedules are attached to policy escalation rules. Specified separate primary and secondary schedules so the targets in the escalation example can be selected independently.
2. **Override visibility was overstated.** The original statement implied all applicable overrides appear in every schedule preview. Version 12.0.33 resolves previews using global overrides plus policy-specific overrides only when exactly one distinct policy uses the schedule. Shared schedules remain policy-agnostic, while actual routing uses the executing policy's context. Added this qualification and the need to verify policy-specific routing for shared schedules.
3. **Delay semantics were ambiguous.** The table's 0/5/10 values could be mistaken for values to enter into successive escalation rules. Renamed the column to approximate elapsed time and explained that `escalateAfterInMinutes` waits after the current rule. Five-minute waits on the first two rules produce the intended approximate timeline; the last rule's wait also precedes completion or repetition.
4. **Escalation timing was presented too strongly.** Replaced the claim that the delay is an operational promise with the actual once-per-minute worker cadence and notification delivery latency. The table expresses an intended timeline, not exact delivery guarantees.
5. **Repeat configuration needed a version-specific qualification.** The original description attributed execution directly to the boolean `repeatPolicyIfNoOneAcknowledges`. The 12.0.33 worker checks `repeatPolicyIfNoOneAcknowledgesNoOfTimes`, with the initial pass counted separately from additional repeats. Named both fields and specified a zero numeric count when disabling repeats through the API. Clarified that acknowledgement stops further escalation but cannot retract already dispatched notifications.
6. **Severity routing was underspecified.** Clarified direct policy attachment versus matching on-call rules. The official incident documentation states that selecting a severity alone does not trigger paging.

## Review Notes
- Opened all seven product documentation/reference links; each resolved to the intended official resource. The author link is a plausible GitHub profile URL and is not a technical source.
- Verified version-dependent behavior against the locally available `12.0.33` Git tag in the official OneUptime repository, whose origin is `https://github.com/OneUptime/oneuptime.git`. Live documentation is not version-pinned, so the tagged source was used to resolve implementation details. This review does not claim 12.0.33 is the latest release.
- Confirmed that overrides carry the replaced user, substitute user, start/end dates, and an optional policy scope. Leaving policy scope unset represents a global override within the project; the guide intentionally recommends an explicit policy.
- Confirmed the documented Google Calendar refresh range of 8–24 hours; the documentation also allows longer delays. Calendar subscriptions are planning aids, not a reliable last-minute paging mechanism.
- Confirmed informational email rollups do not delay escalation pages: the tagged rollup policy documents that paging uses the notification-rule delivery path directly. Shift reminders and reassignment notifications are also excluded from rollups.
- The advice on verified contact channels, daylight-saving previews, fallback responders, controlled drills, and periodic audits is operational guidance, not a guarantee of coverage or delivery.
- No code blocks, CLI commands, or configuration files required execution. Review was based on documentation and source inspection; no live OneUptime instance was configured and no real pages or end-to-end drills were sent. The post appropriately calls for those deployment-specific tests.
- Preserved the existing sections, tone, and scope; README changes address technical correctness only.
