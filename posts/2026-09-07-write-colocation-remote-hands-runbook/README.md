# How to Write an Executable Colocation Remote-Hands Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Runbook, Documentation, Vendor Management, Change Management

Description: Turn remote colocation work into an unambiguous runbook with exact targets, prerequisites, evidence, stop conditions, and rollback.

---

A remote-hands technician should not have to infer which device, cable, or outlet you meant. A safe runbook describes observable physical actions, requires identity checks, and says when to stop.

## Confirm the service boundary

Read the facility's service catalog before writing the procedure. Providers distinguish planned equipment maintenance, cable work, power cycles, console sessions, audits, shipments, and outage tickets. Each type can have different skills, scheduling, billing, and turnaround.

Equinix, for example, documents separate order types for equipment installation, cable moves, loopback tests, power cycles, physical audits, remote console, and inbound shipments. Map the task to the offered service and obtain approval for anything outside it.

## Put identity before action

At the top of the runbook, include:

- ticket and change identifiers
- site, building, floor, cage, cabinet, and cabinet face
- rack unit and device orientation
- asset ID, manufacturer, model, and serial number
- exact port, cable, PDU, bank, and outlet identifiers
- current-state photograph or diagram reference
- requester, technical lead, approver, and live contact method

Use at least two independent identifiers before a disruptive action. For a drive replacement, that could be chassis asset ID plus serial, then slot label plus drive serial. For power, use server asset ID plus the mapped outlet label.

## State prerequisites and safety limits

List what must already be true: backups current, traffic drained, maintenance active, replacement part received, firmware compatible, access authorized, and monitoring silenced appropriately. Include required tools, console adapters, ESD controls, lifting equipment, and vendor instructions.

Say what the technician must not do. Examples include opening an unapproved chassis, unplugging an unlabeled lead, cleaning live fiber without the approved process, moving adjacent cables, or bypassing a safety interlock.

Never ask facility staff to improvise electrical work. Energized work, circuit changes, and PDU connections must follow facility policy and qualified-person requirements.

## Write atomic, observable steps

Each numbered step should contain one action and its expected result:

```text
7. At rack LON1-C03-R12, front, verify asset label SRV-042 and
   chassis serial ABC123. Send a photograph showing both labels.
   STOP if either value differs.

8. Verify drive-bay fault LED at slot 0:5 is amber. Do not remove
   any drive. Report the observed LED state and wait for approval.
```

Avoid phrases such as check the server, fix the cable, reboot if needed, or use the usual port. Translate logical names into visible labels. State whether left and right are viewed from the front or rear.

For every destructive or hard-to-reverse step, insert a hold point. The remote engineer reviews the photograph, console output, light level, or LED state and explicitly releases the next step.

## Define stop conditions

Place stop conditions beside the relevant step, not only at the end. Stop on:

- identity or label mismatch
- unexpected link or fault-light state
- missing ESD or lifting equipment
- resistance, damage, heat, odor, liquid, or alarm
- cable path different from the diagram
- loss of communication with the remote engineer
- elapsed time beyond the approved window

The instruction after STOP is to preserve state, take evidence if safe, and contact the named lead. It is not to try a plausible alternative.

## Include verification and rollback

Define success in terms the technician and remote engineer can observe. Examples are link light, device health LED, console prompt, matching serial, measured optical level, and correctly seated latch. The remote engineer should separately verify application health, routing, replication, and monitoring.

Rollback must be equally specific. Identify the original port, cable, part, outlet, and configuration, plus the latest time at which rollback can start. Some actions, such as removing a failed drive, may not have a simple reverse step; state the recovery path instead.

## Close the work record

Require before-and-after photographs, actual start and end times, technician name, part serials removed and installed, cable changes, anomalies, and disposition of old equipment. Update rack diagram, asset inventory, and spare count in the same change workflow.

Review the provider invoice against the order type, start time, minimum increment, materials, and after-hours terms. Feed any ambiguity discovered during execution back into the reusable runbook.

## Conclusion

An executable remote-hands runbook names the physical target twice, uses atomic actions and observable results, stops on uncertainty, and includes approval holds, verification, rollback, evidence, and record updates. That structure prevents a distant technician from having to guess.

## Official Documentation

- [Equinix Smart Hands order types](https://docs.equinix.com/smart-hands/ordering/order-types/)
- [Equinix Smart Hands service overview](https://docs.equinix.com/smart-hands/)
- [Equinix inbound shipment requirements](https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/)
- [NIST SP 800-34 Rev. 1 contingency planning guide](https://www.nist.gov/publications/contingency-planning-guide-federal-information-systems-including-updates-through)
