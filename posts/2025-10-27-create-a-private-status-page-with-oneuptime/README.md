# Create a Private Status Page with OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Status Page, Incident Management, Reliability, Security

Description: Share real-time health updates with internal or premium audiences using OneUptime private status pages, complete with access control, SSO, and subscriber management.

---

Not every update belongs in public. Private status pages let you brief employees, partners, or VIP customers without broadcasting sensitive details. OneUptime combines access controls, identity integrations, and the same adaptive incident timelines you already rely on for public communication. Here is how to launch one in minutes.

---

## When a private status page makes sense

- Internal users need detailed timelines that would overwhelm public readers.
- You serve enterprise customers who expect premium incident insight under NDA.
- Security or compliance teams require restricted communication channels for audits.
- You are rolling out major changes (migrations, feature flags) and want a controlled audience before going fully public.

---

## Prerequisites

- A OneUptime project with permission to manage status pages and private users.
- A list of people, distribution lists, or identity provider groups who should have access.
- Optional: SSO or SCIM configured in OneUptime so membership stays in sync automatically.

---

## Step 1: Create the private page

1. Go to **Project Settings → Status Pages** and choose **Create Status Page**.
2. Give it a descriptive name such as `Acme Internal Reliability Updates`.
3. Set visibility to **Private**. The page stays hidden from the web until authorized users sign in.
4. Save to generate the page shell.

---

## Step 2: Define the audience

1. Open the new page and navigate to **Private Users**.
2. Add individuals by email, bulk upload a CSV, or sync an identity provider group via SSO/SCIM.
3. Decide whether invitees must log in with OneUptime accounts, an IdP, or a one-time access token.
4. Customize the invitation email so recipients know why they are receiving access and how updates will arrive.

---

## Step 3: Model components and automation

1. Under **Resources**, mirror the services and monitors you show on public pages- or create more granular ones for internal-only signals.
2. Enable automatic publication of incidents, scheduled maintenance, and announcements that are marked as “internal” in OneUptime.
3. Review your incident templates and add any sensitive investigation fields that you would not post publicly.
4. Set ownership so the same responders who manage public communication can also update the private timeline.

---

## Step 4: Configure authentication and SSO (optional)

1. In **Authentication and Security**, connect your identity provider (Okta, Azure AD, Google Workspace) so members authenticate with existing credentials.
2. Map IdP groups to page roles if you want granular control (view-only, update permissions, etc.).
3. Enable SCIM to keep memberships synchronized as people join or leave the company.
4. Test the entire flow with a pilot group before rolling it out broadly.

---

## Step 5: Tailor notifications

1. From **Subscribers**, decide whether private page members receive email, SMS, or workspace notifications.
2. Configure message templates specifically for the private audience- include remediation detail, internal ticket links, or runbook IDs when helpful.
3. If you maintain a private Slack or Microsoft Teams channel, connect Workspace Notification Rules to echo every status page post there.

---

## Step 6: Launch quietly and educate

1. Share the access instructions with your internal audience and remind them the page is confidential.
2. Bookmark the link in incident response runbooks so command staff knows where to post updates first.
3. If you also run a public page, clarify when responders should cross-post versus keep updates private.
4. Monitor the access logs inside OneUptime to ensure the right people are signing in- and remove any stale accounts.

---

## Day-to-day best practices

- **Keep updates specific.** Outline user impact, remediation steps, and next review time in more detail than you would publicly.
- **Leverage announcements.** Share release readiness, feature flags, or vendor maintenance windows that internal teams must monitor.
- **Review access quarterly.** Remove former employees and confirm distribution lists still map to current teams.
- **Pair with retrospectives.** Use the private timeline as the starting point for post-incident reviews.

---

## Troubleshooting

- **Users cannot sign in:** Confirm they were invited to the private page and that the IdP group is synced. Resend the invite if necessary.
- **People forward private updates externally:** Add a confidentiality note to templates and remind teams of contractual obligations; escalate repeated violations to leadership.
- **Incidents show up empty:** Ensure the incident is tagged to resources that are on the private status page.
- **Need to switch to public:** You can clone the private page into a public one by duplicating components or opening access when you are ready.
