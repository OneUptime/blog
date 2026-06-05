# Validation Summary: PagerDuty vs OneUptime: Open Source On-Call Management That Won't Break the Bank

## Status
validated

## Post Type
Product comparison

## Technologies Covered
- PagerDuty incident management, on-call scheduling, escalation policies, AIOps, and Status Pages
- OneUptime monitoring, on-call management, incident management, status pages, logs, traces, and AI Agent
- Slack and Microsoft Teams incident-response integrations
- SMS and phone-call alerting

## Sources Consulted
- PagerDuty Incident Management Pricing: https://www.pagerduty.com/pricing/incident-management/
- PagerDuty AIOps Pricing: https://www.pagerduty.com/pricing/aiops/
- PagerDuty Status Pages Overview: https://support.pagerduty.com/main/docs/status-pages-overview
- PagerDuty Pricing Tiers documentation: https://support.pagerduty.com/main/docs/pricing-tiers
- OneUptime Pricing: https://oneuptime.com/pricing
- OneUptime AI Agents documentation: https://oneuptime.com/docs/en/ai/ai-agent
- OneUptime GitHub repository: https://github.com/OneUptime/oneuptime
- OneUptime On-Call product page: https://oneuptime.com/on-call
- OneUptime Getting Started documentation: https://oneuptime.com/docs

## Issues Found
- The introduction described PagerDuty as a separate "$35/user/month" tool, but current PagerDuty pricing lists Professional at $21/user/month billed annually and Business at $41/user/month billed annually. Updated the wording to "$21-$41/user/month" for incident response.
- The quick comparison said PagerDuty does not provide status pages. Current PagerDuty documentation describes Internal, External, and Private Status Pages, with availability depending on plan and add-ons. Updated the table to "plan/add-on dependent."
- The post described PagerDuty as "only on-call" and implied status page updates always require a separate manual tool. PagerDuty now provides broader incident response features and status page products, so this was narrowed to say PagerDuty is not a full observability stack and that status page workflows can happen in PagerDuty or another tool.
- The workflow comparison said PagerDuty requires separate tools for status page steps. Updated this to reflect that those workflows depend on plan, add-ons, or separate tools.
- The OneUptime pricing example omitted the Growth plan line item shown on OneUptime's pricing page and understated the monthly total. Added the Growth plan cost, changed the estimate from ~$80/month to ~$102/month, and adjusted the savings claim from 80% to about 75% versus PagerDuty Business incident management.

## Review Notes
No code examples, terminal commands, or configuration snippets were present. The review focused on product feature and pricing claims because these are technical/vendor-specific and can change over time.
