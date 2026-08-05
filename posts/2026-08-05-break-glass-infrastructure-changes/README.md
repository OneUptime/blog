# Break-Glass Infrastructure Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Automation, Terraform, Incident Response, Break Glass, Security, Audit

Description: Make emergency infrastructure changes traceable, time-bound, and reconcilable so incident exceptions do not become permanent hidden configuration.

---

During an incident, the normal infrastructure delivery path may be too slow or may itself be broken. An operator may need to change a firewall rule, fail over a service, expand capacity, or restore access directly through a cloud API.

That capability is necessary. An undocumented emergency change that survives the incident is not. A safe break-glass process does three things:

1. grants narrowly scoped emergency authority;
2. records the intent and every resulting change while responders work;
3. expires access and reconciles live infrastructure back into normal automation.

Break-glass access and a break-glass change are related but different. Access is the temporary capability. The change is the audited mutation and its lifecycle. Closing one does not automatically close the other.

## Define When Break Glass Is Allowed

Write objective activation criteria before an incident. Examples include:

- the normal deployment control plane is unavailable;
- waiting for the standard approval path would violate an incident objective;
- existing identity federation is unavailable and emergency access is required;
- an active security event requires immediate containment;
- the authorized incident lead declares that normal lead time creates greater harm.

"This change is urgent" is not enough. Require an active incident or security case, an accountable incident role, an affected environment, and a stated reason the normal path cannot meet the need.

Keep emergency access configured and tested in advance. AWS recommends deploying and periodically testing emergency console access before a disruption because the required roles may be impossible to create after access fails. Microsoft recommends multiple emergency access accounts, regular validation, and high-priority monitoring of their use.

## Separate Activation from Execution

Use two deliberate transitions:

```text
SEALED -> ACTIVATED -> IN_USE -> REVOKED -> RECONCILED -> CLOSED
```

Activation grants or retrieves emergency access. Execution records specific mutations. Revocation ends the credential or session. Reconciliation determines the durable desired state. Closure requires evidence for all four.

For critical environments, use dual control to activate the path when practical, but do not create a dependency that makes emergency access unusable during the identity outage it is meant to survive. Store redundant authentication methods and procedures through separate failure domains.

## Create an Emergency Change Record

Open the record before the first mutation when seconds allow, or have incident tooling create it automatically during activation. A useful schema is:

```yaml
incident: INC-2841
emergency_change: EC-2026-081
activated_by: operator@example.com
authorized_by: incident-commander@example.com
activated_at: 2026-08-05T09:42:11Z
access_expires_at: 2026-08-05T10:42:11Z
exception_expires_at: 2026-08-05T12:00:00Z
environment: production/eu-west-1
objective: restore checkout traffic through healthy region
normal_path_blocker: deployment control plane unavailable
allowed_actions:
  - change DNS weight for checkout.example.com
  - add temporary health-check egress rule
prohibited_actions:
  - delete data stores
  - disable audit logging
reconciliation_owner: platform-on-call@example.com
```

Use separate access and exception expirations. Access should end as soon as the responder no longer needs privilege. The configuration exception may remain briefly while the team validates stability and prepares a normal pull request.

Never place credentials, tokens, private keys, or unredacted Terraform state in the record.

## Constrain the Emergency Capability

Design the smallest practical scope:

- a dedicated emergency role rather than a person's daily administrator account;
- explicit accounts, subscriptions, projects, regions, and services;
- a short session duration with renewal requiring a recorded decision;
- permissions for expected recovery operations;
- a separate, more strongly controlled path for destructive or organization-wide actions;
- no ability to disable or delete the audit trail used to monitor the role.

Some emergencies require broad capability because the failure mode is not predictable. In that case, compensate with stronger activation, immediate alerts, session recording where supported, and rapid revocation. Do not pretend a nominally narrow role is safe if responders will need to bypass it with an unmonitored root credential.

## Record Changes from Independent Evidence

Human notes are helpful but incomplete. Collect evidence from systems outside the emergency session:

- cloud control-plane audit logs;
- identity-provider and role-assumption logs;
- CI, bastion, shell, or privileged session records where supported;
- API request IDs and resource identifiers;
- before and after configuration snapshots from supported read APIs;
- incident timeline entries explaining intent and observed result.

Send a high-priority notification on activation and on every use of an emergency identity. Microsoft guidance specifically recommends alerting whenever emergency access accounts are used or changed.

Keep audit collection active even if the main observability platform is impaired. Route emergency identity events to a separate security destination or account when possible.

## Make Temporary Exceptions Expire by Construction

An expiry in a ticket is only a reminder. Enforce time limits in the access system and, where safe, in the resource or policy itself.

Examples include:

- short-lived role sessions;
- a privileged access group with automatic membership expiry;
- a firewall exception controller that deletes a rule at a recorded deadline;
- a policy exception object whose enforcement mode changes automatically;
- a scheduled review that pages the reconciliation owner before expiry.

Automatic rollback is safe only when the reverse action is known to remain safe. Removing a temporary ingress rule is often bounded; automatically failing traffic back to a previously unhealthy region may not be. If expiry cannot safely reverse the resource, it should revoke change authority and escalate an overdue exception rather than execute a blind rollback.

## Reconcile Terraform After the Incident

Do not start by running an ordinary `terraform apply`. Terraform may try to undo a life-saving change before the team decides whether to retain it, and the configuration may contain other pending work.

Use a controlled sequence.

### 1. Stabilize and Freeze

Confirm the incident is stable enough for reconciliation. Freeze normal applies to affected states and ensure there is one coordinator. Revoke emergency write access when active mutation is no longer needed, or narrow it to read-only investigation.

### 2. Inventory the Live Changes

Reconcile audit events with live reads. Identify:

- managed objects changed outside Terraform;
- new objects not yet in any state;
- deleted objects still tracked in state;
- changes made by cloud-managed services during the incident;
- temporary exceptions with independent expiry mechanisms.

### 3. Review State-Only Reconciliation

Terraform's refresh-only planning mode shows proposed state and output updates without proposing changes to remote objects:

```bash
terraform plan -refresh-only -out=refresh.tfplan
terraform show -no-color refresh.tfplan
```

Do not automatically apply this plan. A credential or region error can make existing resources appear missing. HashiCorp recommends reviewing refresh-only changes before applying them.

A normal plan also refreshes objects in memory, but state is not committed merely because a plan ran. Use refresh-only apply only when accepting the live attributes into state is an intentional decision.

### 4. Decide Per Change

Choose one disposition for every emergency mutation:

- **Revert**: configuration remains authoritative and the emergency value should be removed.
- **Adopt**: update configuration so the emergency value becomes desired state.
- **Replace with a durable design**: keep the temporary value only until a reviewed long-term control is ready.
- **Transfer ownership**: document that another controller legitimately owns an attribute and change Terraform configuration accordingly.
- **Import**: bind an emergency-created object to exactly one Terraform resource address.
- **Delete manually with evidence**: only when the object should not be managed and its safe deletion is proven.

Do not use a broad `ignore_changes` rule to make the plan quiet. Attribute-specific shared ownership can be legitimate, but an unbounded ignore rule converts an emergency exception into hidden permanent drift.

### 5. Import Emergency-Created Resources Carefully

Configuration-driven import makes the operation reviewable:

```hcl
import {
  to = aws_vpc_security_group_egress_rule.temporary_health_check
  id = "sgr-0123456789abcdef0"
}

resource "aws_vpc_security_group_egress_rule" "temporary_health_check" {
  security_group_id = "sg-0123456789abcdef0"
  cidr_ipv4         = "10.20.30.40/32"
  from_port         = 443
  ip_protocol       = "tcp"
  to_port           = 443
  description       = "Temporary health-check egress"
}
```

This example uses the AWS provider's separate VPC security group rule resource and a security group rule ID. The identifier format is provider and resource specific, so consult the exact provider documentation. Terraform expects one remote object to be bound to one resource address, so search other states before importing.

### 6. Apply Through the Normal Path

Create a reconciliation pull request that references the incident and emergency change record. Produce a fresh plan, separate drift from intended edits, run normal policies, obtain the required approvals, and apply the exact reviewed plan.

Afterward, require an ordinary plan with no unexplained changes. "No changes" is a convergence check, not proof that the emergency decision itself was correct, so retain the incident review and audit evidence.

## Close Access and Exceptions Independently

Before closure, verify:

- emergency sessions and temporary group memberships expired;
- credentials were rotated or resealed if the procedure requires it;
- alerts fired and reached the expected responders;
- every API mutation maps to a disposition;
- Terraform and other controllers converge;
- temporary rules were removed or adopted with an owner;
- normal delivery is working;
- a follow-up issue owns any long-term design work.

An expired credential does not prove the resource exception disappeared. A clean Terraform plan does not prove the emergency account was revoked. Test both.

## Drill the Entire Lifecycle

Run scheduled exercises that include activation, a harmless controlled mutation, audit verification, access expiry, Terraform drift discovery, reconciliation, and closure. Test during an identity-provider outage simulation and an unavailable CI control plane.

Measure:

- time to obtain emergency access;
- unauthorized or failed activation attempts;
- percentage of actions captured by independent audit logs;
- time from incident stabilization to access revocation;
- time to reconcile all exceptions;
- overdue exceptions and repeat emergency changes;
- drill failures and stale contact information.

If drills only prove login, they test less than half the process.

## Official Documentation

- [AWS IAM Identity Center emergency access](https://docs.aws.amazon.com/singlesignon/latest/userguide/emergency-access.html)
- [Microsoft Entra emergency access accounts](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/security-emergency-access)
- [Microsoft monitoring guidance for emergency accounts](https://learn.microsoft.com/en-us/entra/architecture/security-operations-privileged-accounts)
- [Terraform refresh-only workflow](https://developer.hashicorp.com/terraform/tutorials/state/refresh)
- [Terraform refresh command deprecation and safety warning](https://developer.hashicorp.com/terraform/cli/commands/refresh)
- [Terraform import blocks](https://developer.hashicorp.com/terraform/language/block/import)
- [Terraform lifecycle ignore_changes](https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle)
- [AWS provider VPC security group egress rule and import format](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule)

## Conclusion

A break-glass process is complete only after privilege ends and infrastructure converges. Preconfigure resilient emergency access, bind every use to an incident, capture mutations independently, enforce meaningful expirations, and reconcile each live change through the normal source of truth. That preserves response speed without turning an emergency exception into permanent invisible infrastructure.
