# Connect OneUptime to Microsoft Teams with Workspace Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Incident Management, Integrations, Microsoft Teams, On-call, Workspace Connections

Description: Use OneUptime Workspace Connections to deliver interactive incident, alert, and maintenance updates directly into Microsoft Teams.

---

Microsoft Teams is where responders already coordinate. OneUptime’s native Workspace Connection keeps that conversation in one place: admin consent, bot install, and channel routing all happen inside the product, and every notification arrives as an adaptive card your team can act on immediately.

---

## What you get with the native integration

- Interactive cards for incidents, alerts, on-call escalations, and maintenance updates- acknowledge, resolve, add notes, or trigger on-call from Teams.
- Tenant-aware delivery: OneUptime refreshes Microsoft Graph tokens and keeps your available teams and channels current.
- Bot-powered updates: adaptive cards post directly into Teams channels and respond instantly when someone takes action.
- One workspace to manage routing rules across engineering, support, and leadership channels.

---

## Before you start

- A OneUptime project role that can manage workspace connections and notification rules.
- A Microsoft 365 admin account that can grant tenant-wide consent for the OneUptime app.
- Microsoft Teams desktop or web app access to upload the OneUptime bot to the teams you will target.
- (Self-hosted only) Ensure the global Microsoft Teams app registration is configured- see the checklist below.

---

## Step 1: Grant tenant-wide admin consent

1. In OneUptime, open **Project Settings → Workspace Connections → Microsoft Teams**.
2. Select **Grant Admin Consent**. You will be redirected to Microsoft Entra to review the permissions OneUptime needs (read basic team/channel info and send messages as the app).
3. Sign in with a Teams or Entra admin account and approve the prompts. Successful consent stores your tenant ID and app access token in OneUptime so the integration can list and message teams securely.
4. Back in OneUptime, the connection card shows that admin consent is complete.

---

## Step 2: Install the OneUptime Teams app

1. On the same connection page, download the Teams app package (or locate OneUptime in the Teams store if your tenant already has it published).
2. In Microsoft Teams, go to **Apps → Manage your apps → Upload an app** and upload the package. Choose **Upload for me or my teams**.
3. Add the app to each team or channel that should receive notifications. This makes sure the OneUptime bot can post adaptive cards and respond to actions.

---

## Step 3: Connect your OneUptime user account

1. Still on the Microsoft Teams connection card, click **Connect with Microsoft Teams**.
2. Sign in with your Teams account. The delegated permissions let OneUptime identify you, map Teams users to OneUptime users, and surface the teams you have access to.
3. After the redirect, the card confirms your user is connected. Encourage other responders to connect their accounts so they can execute actions from Teams cards.

---

## Step 4: Choose Teams and wire up notifications

1. Use **View Available Teams** to verify which teams OneUptime can address. If you recently added a team, use **Refresh** to pull the latest list from Microsoft Graph.
2. Open the functional area you want to automate (for example **Incidents → Workspace Connections → Microsoft Teams**).
3. Create workspace notification rules for each event type- incidents, alerts, monitors, on-call rotations, or scheduled maintenance. Pick the team and channel, set filters (severity, labels, affected monitors), and save.
4. Each rule delivers an adaptive card with quick actions such as *View Incident*, *Execute On-Call Policy*, *Acknowledge Alert*, *Resolve*, and *Add Note*. Responders can stay in Teams while keeping OneUptime updated.

---

## Try a test notification

- From a workspace notification rule, select **Test Rule** to send a sample adaptive card to the configured channel.
- Confirm that actions such as *Acknowledge Incident* or *Add Note* succeed; the card will confirm inside Teams when OneUptime processes the request.

---

## Everyday ways teams use it

- Spin up an incident bridge channel and let OneUptime post every timeline change, including ownership and state transitions.
- Stream critical alerts into an operations channel; responders can acknowledge, resolve, or run an on-call escalation directly from the card.
- Keep customer-facing teams informed with scheduled maintenance reminders and status page updates in dedicated Teams channels.
- Let leadership subscribe to a digest channel that only fires for high-severity incidents or SLA-breaching alerts.

---


## Next steps

- Expand your automation with targeted notification rules for monitors, scheduled maintenance, and on-call policy escalations.
- Invite other teams- support, success, leadership- to connect their user accounts so they can take action from the same cards.
- Periodically review the Workspace Notification Log in OneUptime to confirm delivery health and fine-tune rule filters.

With Workspace Connections, OneUptime and Microsoft Teams stay in lockstep- your responders see every change in context and act without leaving the conversation.
