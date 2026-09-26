# How to Expose Routine Network Changes as a Guardrailed Self-Service Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Ansible, Automation, Security

Description: Offer narrowly scoped network changes through a validated request contract with server-side authorization, immutable plans, controlled execution, and verified results.

A useful network self-service workflow lets a team request an outcome such as moving an approved access port to an approved VLAN. The requester should not need device credentials or the ability to submit arbitrary configuration commands.

Start with one low-variance operation. Define its inputs, ownership rules, current-state requirements, verification criteria, and recovery procedure before building the form.

## Define a request that expresses intent

For example:

```json
{
  "operation": "set_access_vlan",
  "device_id": 123,
  "interface": "GigabitEthernet1/0/10",
  "vlan_id": 120,
  "ticket": "CHG-184"
}
```

Do not accept a management IP, SSH username, credential ID, inventory path, template name, or freeform commands from this request. Resolve those details from trusted server-side records.

The service should determine the authenticated requester independently of the JSON body. A field such as `requested_by` is useful for display only if the service sets it; a caller-supplied identity is not an authorization decision.

## Put authorization behind the form

A dropdown improves usability but does not protect the API. Revalidate the request on the server against current resource ownership and policy. An allowlisted operation still becomes dangerous if a user can target another team's port.

This example is application policy, not an AWX or Ansible built-in API. The `policy` argument must come from a trusted authorization service, scoped to the authenticated principal:

```python

def authorize(request, policy):
    expected = {"operation", "device_id", "interface", "vlan_id", "ticket"}
    if set(request) != expected:
        raise ValueError("Unexpected or missing request fields")
    if request["operation"] != "set_access_vlan":
        raise PermissionError("Operation is not available")
    if type(request["device_id"]) is not int:
        raise ValueError("Invalid device ID")
    if not isinstance(request["interface"], str):
        raise ValueError("Invalid interface")
    if type(request["vlan_id"]) is not int:
        raise ValueError("Invalid VLAN ID")
    if not isinstance(request["ticket"], str) or not request["ticket"].strip():
        raise ValueError("A change record is required")

    resource = (request["device_id"], request["interface"])
    allowed = policy["access_ports"].get(resource)
    if allowed is None:
        raise PermissionError("No authority over this access port")
    if request["vlan_id"] not in allowed["vlan_ids"]:
        raise PermissionError("VLAN is outside the permitted set")
    return {
        "device_id": request["device_id"],
        "interface": request["interface"],
        "vlan_id": request["vlan_id"],
    }
```

A ticket string is not proof of approval. Resolve that record in the trusted change system and check its status, scope, requester, expiry, and window where required. Keep these controls outside caller-controlled extra variables.

## Collect a current baseline and produce a plan

Before planning, read the device state. Require the target to be an eligible access interface, exclude management ports and uplinks, check port-channel membership, and verify that the selected VLAN is valid at the site. A port that was eligible yesterday may now connect critical equipment.

Compute the smallest configuration change and retain a digest of the resulting plan. Present the requester with the device name, interface, current VLAN, requested VLAN, expected impact, and recovery conditions. A no-op should return a verified already-compliant result without pushing commands.

Bind any approval to that plan and observed baseline. When either changes, regenerate the review. A single approved form submission should not authorize an evolving target set.

## Use AWX as a controlled executor

AWX surveys can collect typed answers such as a single selection or integer and pass them into playbook extra variables. For a strongly controlled integration, the portal can submit only a request identifier; the worker retrieves the authorized plan from the service. The request record must already be bound to the authenticated caller and permitted resources. [AWX job templates and surveys](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html)

Fix the inventory, credential, project, playbook, and execution environment on the template. Avoid exposing arbitrary extra variables or prompts that allow callers to replace those choices. Give requesters only the access necessary to launch the approved workflow, and test what that access permits through the API as well as the UI.

A possible workflow is:

```text
Validate stored request
    -> Collect current state
    -> Create and review plan
    -> Approval when policy requires it
    -> Reauthorize, lock, and recheck baseline
    -> Apply and verify
    -> Publish safe result
```

AWX supports approval nodes and success/failure paths. However, its documentation allows users who can execute the workflow to approve its approval nodes. Do not assume an approval node alone enforces independent peer review. Implement separation in a trusted approval service or use controls that explicitly enforce the separation your policy requires. [AWX approval behavior](https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflow_templates.html)

## Handle concurrency and retries as product behavior

Give each submission an idempotency key bound to the authenticated principal and request payload. Store that mapping durably. Repeating the same key and payload should return the original request; repeating the key with a different payload should fail.

Acquire a lock on the device or relevant topology before applying. Recheck ownership, eligibility, maintenance window, and baseline after waiting for that lock. Two individually valid port requests may still conflict if they affect a shared dependency.

If the worker loses contact after a write, mark the request as needing reconciliation. Do not label it failed-and-safe or automatically launch another configuration push. Determine the actual state before retrying or recovering.

## Verify and explain the outcome

Read the resulting interface configuration and run the operation's health checks. For a VLAN change, confirm intended membership and the expected endpoint path. Preserve unrelated port settings, and verify startup persistence according to the platform's behavior.

Return clear states such as waiting for approval, scheduled, applying, verified, reverted, or needs operator recovery. Include a safe explanation and evidence reference. Keep passwords, full configurations, and raw exception traces out of user-visible results.

Record the requester, policy version, authorized resources, approver where applicable, artifact digest, executor identity, and per-device outcome. Review rejected requests and repeated failures to improve the catalog.

Expand self-service only after the initial operation has demonstrated reliable authorization, no-op behavior, failure recovery, and auditability. The useful abstraction is a small set of network outcomes with predictable boundaries, backed by an executor that can prove what actually happened.
