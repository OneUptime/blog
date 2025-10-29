# Organize Your Service Catalog with OneUptime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Catalog, Reliability, Ownership, Dependencies

Description: Learn how to map services, owners, monitors, and dependencies inside OneUptime’s Service Catalog so everyone knows what powers your product.

---

A clear service catalog is the backbone of reliable operations. OneUptime turns scattered spreadsheets into a living source of truth that ties services to the monitors, incidents, and teams that support them. This guide helps you stand up the catalog, link dependencies, and keep ownership visible across the organization.

---

## What OneUptime’s Service Catalog delivers

- **Complete service inventory**: Capture backend services, customer-facing experiences, integrations, and internal tools in one list.
- **Reliable ownership**: Assign primary teams and on-call policies so there’s always a clear owner.
- **Dependency mapping**: Visualize upstream/downstream relationships to assess blast radius before changes or incidents.
- **Connected telemetry**: Link monitors, SLOs, runbooks, and status pages so responders see context instantly.

---

## Before you start

- Gather the latest list of services (or start small with one product area).
- Identify the responsible team for each service and confirm on-call coverage.
- Collect links to existing monitors, runbooks, dashboards, and repos you want to surface alongside the service.
- Decide on standard naming conventions to keep the catalog searchable.

---

## Step 1: Create your first service

1. Head to **Service Catalog → Create Service**.
2. Give the service a descriptive name and summary that explains what it does and who depends on it.
3. Add tags or categories (for example `Customer Facing`, `Billing`, `Internal Tool`) to group similar services.
4. Specify the current lifecycle stage (Beta, Production, Deprecated) so teams know where it stands.

---

## Step 2: Assign ownership and contacts

1. Choose the primary team and any secondary owners responsible for the service.
2. Link on-call policies so incidents automatically page the right people.
3. Add escalation contacts or Slack/Microsoft Teams channels used during outages.
4. Include subject matter experts or product managers if you have a RACI model.

---

## Step 3: Connect monitors, incidents, and runbooks

1. Attach the monitors that track the service’s health—uptime, metrics, logs, traces, and synthetic checks.
2. Link existing incidents so responders can review past outages and remediation work.
3. Add runbooks, dashboards, repositories, or design docs for quick reference.
4. If the service has public or private status page components, connect them so customers see aligned updates.

---

## Step 4: Map dependencies

1. Use **Dependencies** to declare upstream services this service relies on (databases, APIs, third-party platforms).
2. Add downstream consumers to understand who will feel the impact if this service fails.
3. Review the dependency graph before maintenance or large releases to ensure all stakeholders are notified.
4. Keep third-party services in the catalog too—document their SLAs, contacts, and escalation paths.

---

## Step 5: Keep the catalog fresh

1. Schedule periodic reviews (quarterly or after major launches) to update ownership, tags, and lifecycle stages.
2. Integrate catalog checks into change management: no new service ships without an entry.
3. Use automation or CI bots to remind owners when runbook links or monitors go stale.
4. Encourage teams to add post-incident notes directly to the service so context lives with the component.

---

## How teams use the catalog day to day

- **Incident Commanders** open the affected service and instantly see owners, runbooks, and dependencies to accelerate triage.
- **Product Managers** understand which backend services power key features, improving roadmap planning.
- **Compliance and Audit** teams export service ownership reports as evidence for SOC 2 and ISO control checks.
- **Engineering Leadership** tracks risk concentration by spotting services with too many dependencies or single points of failure.

---

## Tips for a high-signal catalog

- Use consistent naming (for example `svc-billing-api`) and add human-friendly descriptions for new team members.
- Prefer fewer, more meaningful tags—think `Customer Facing`, `Revenue Critical`, `Vendor Managed`.
- Link SLOs or error budgets so teams know what “good” looks like for each service.
- Regularly compare the catalog against infrastructure inventories to catch untracked systems.

---

## Extend the value across OneUptime

- Surface catalog data in dashboards for leadership or customer success reviews.
- Tie catalog entries into maintenance planning so dependencies receive advance notice.
- Drive automation: trigger alert routing or incident templates based on service metadata.
- Use the catalog as the foundation for change management, release gating, and cost allocation.

When everyone can find service context in seconds, reliability improves, handoffs get smoother, and customers feel the difference. Keep your OneUptime Service Catalog current, and the rest of the platform works even harder for you.
