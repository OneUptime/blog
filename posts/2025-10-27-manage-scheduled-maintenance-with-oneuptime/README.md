# Plan Scheduled Maintenance with OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Scheduled Maintenance, Status Page, Incident Management, Customer Experience

Description: A no-surprises guide to planning, approving, and communicating scheduled maintenance in OneUptime so customers and internal teams stay aligned.

---

Scheduled maintenance should feel routine- not chaotic. OneUptime centralizes planning, approvals, notifications, and customer updates so every maintenance window is documented and predictable. This playbook walks through the workflow from drafting a plan to closing with a clear post-maintenance summary.

---

## Why run maintenance through OneUptime?

- Keep the entire timeline- announcement, reminders, execution, and wrap-up- in one place.
- Notify customers and internal teams across channels (status page, email, SMS, Slack, Microsoft Teams) without duplicating effort.
- Coordinate owners, runbooks, and dependencies up front to cut downtime and surprises.
- Capture history to prove compliance and show how often maintenance happens.

---

## Before you start

- Confirm your OneUptime project has monitors tied to the services being updated.
- Decide who approves maintenance windows and who writes customer-facing messages.
- Draft a lightweight runbook outlining steps, rollback plan, and success checks.
- If you run a public or private status page, verify branding and subscriber settings are current.

---

## Step-by-step maintenance workflow

1. **Create the event**
   - Go to **Scheduled Maintenance → Create Maintenance**.
   - Name the window, set start and end times (including timezone), and choose the affected monitors or service components.
   - Attach related runbooks or documentation so on-call teams know exactly what to follow.

2. **Assign ownership**
   - Add the primary owner, escalation teams, or individual engineers responsible for executing the plan.
   - Include stakeholders (support, customer success) so they receive internal notifications.

3. **Craft the communication plan**
   - Write customer-friendly templates for the three major milestones: announcement, maintenance start, and completion.
   - Customize internal notes if you need extra technical detail separate from the public message.

4. **Schedule notifications**
   - Enable automated reminders: for example one week before, 24 hours before, and 15 minutes before the window begins.
   - Choose channels: status page, email/SMS subscribers, Workspace Connections (Slack, Microsoft Teams), and internal notification rules.

5. **Review and approve**
   - Use the approval workflow so leadership or change advisory boards sign off before the window locks in.
   - Once approved, the event appears on your status page (if configured) with a clear timeline.

6. **Execute the plan**
   - When maintenance starts, OneUptime flips the status page component state automatically (or prompts the owner to confirm).
   - Responders can post live updates, mark checkpoints, or log issues encountered during the window.

7. **Close with a summary**
   - As soon as maintenance completes, publish the final update and confirm all services are operational.
   - Document any deviations, unexpected impact, or follow-up tasks.
   - OneUptime archives the event for reporting, so you can revisit details later.

---

## Tips for smooth maintenance windows

- **Align time zones**: Always display the maintenance window in both your internal timezone and the customer’s primary region.
- **Limit scope creep**: Freeze changes the day before; any new work becomes a separate event.
- **Automate verification**: Tie monitors or synthetic checks to the plan so you know instantly when systems are ready to go live again.
- **Practice the rollback**: If a step fails, you should know the exact triggers that send the plan into rollback mode.

---

## How communication flows across channels

- **Status Page**: Public or private pages show the maintenance banner with live updates.
- **Subscribers**: Email and SMS followers receive every update you publish, keeping them informed without manual blasts.
- **Workspace Connections**: Slack or Microsoft Teams channels receive adaptive cards so internal responders and stakeholders can react in real time.
- **Incident Automation**: If monitors detect unexpected downtime, OneUptime can raise an incident linked to the maintenance window for faster triage.

---

## Reporting and follow-up

- Review the maintenance history to track frequency, duration, and customer communication scores.
- Export transcripts for compliance reviews or share them with partners who require change management logs.
- Use the history to inform status page subscribers about recurring maintenance windows and build trust through predictability.

---

## Keep improving the process

- Run a quick retro after each window: what worked, what did not, and what scripts should be updated.
- Update notification templates with clearer impact statements based on customer feedback.
- Link maintenance events to your Service Catalog so owners see dependencies before making changes.
- Share the calendar internally so product and support teams align other launches around your maintenance timeline.

Planned downtime is still downtime- but with OneUptime, it becomes a well-orchestrated event that keeps customers confident and teams calm.
