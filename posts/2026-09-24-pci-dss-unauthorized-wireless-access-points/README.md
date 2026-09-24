# How to Detect Unauthorized Wireless Access Points for PCI DSS Without Chasing Every Nearby SSID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PCI DSS, Security, Networking

Description: Identify rogue wireless paths into the cardholder data environment, classify neighboring access points with evidence, and preserve useful detection records.

---

A wireless scan in a shared building can return dozens of SSIDs. Most may belong to neighboring businesses, but a familiar name does not prove that an access point is harmless. An unauthorized device can advertise a nearby company's name while connected to your network.

Build a process that distinguishes authorized devices, investigated external devices, and unresolved findings. The objective is a defensible view of wireless access affecting your environment.

## Establish the required coverage and timing

PCI DSS v4.0.1 Requirement 11.2.1 requires testing for wireless access points, detecting and identifying authorized and unauthorized points, and performing this work at least once every three months. Automated monitoring must generate alerts to notify personnel. Requirement 11.2.2 requires an inventory of authorized access points with business justification.

The standard's scope discussion explains that rogue-wireless detection still applies when the organization prohibits wireless or does not intentionally use it in the CDE. Consult the wireless section and Requirements 11.2.1–11.2.2 in the [current PCI DSS standard](https://www.pcisecuritystandards.org/document_library/).

Do not translate “we have no Wi-Fi” into “there is nothing to test.” An employee-installed travel router or a laptop providing a bridge is precisely the kind of change the process must discover.

## Define a site-specific detection method

List the physical facilities and network segments included in the assessment. Document how the method covers wired connections that can introduce wireless access, not just the areas where approved radios are mounted.

Depending on the environment, combine wireless scanning, wireless intrusion detection, network-access control, switch-port investigation, and physical inspection. The standard's guidance allows different methods; the method must reliably identify unauthorized wireless devices.

Record the practical limits. A short radio survey can miss an intermittent device. A network inventory may miss a device that hides behind another endpoint. Use complementary information when one method cannot establish the necessary coverage.

For each run, retain the site, date, operator or automated system, covered locations, observed access points, and investigation results.

## Build two distinct inventories

The authorized-access-point inventory should include device identity, owner, business purpose, location, connected port or uplink, network placement, and approval reference.

Separately maintain investigated external observations. Avoid mixing neighboring access points into the authorized corporate list; they are not devices the organization has approved for its own network.

| Classification | Evidence needed | Follow-up |
|---|---|---|
| Authorized | Matches owned device and approved connectivity | Reconcile changes |
| External and investigated | Documented basis for no connection to your network | Recheck when observations change |
| Unauthorized and connected | Confirmed unapproved network path | Contain and investigate |
| Unresolved | Insufficient evidence | Assign owner and due date |

Track BSSID and other stable device information where available. SSIDs alone are weak identifiers: several radios can advertise the same name, and names can be changed.

## Investigate a suspicious observation

Suppose a new access point appears near a payment office. Start by checking your approved inventory and recent network changes. Correlate the observation with switch-port records, network-access-control events, device inventories, and physical inspection within your premises.

A missing MAC-address match alone is not conclusive. Different interfaces on the same device may use different addresses, and an access point may sit behind another device. Record how the combined evidence supports the classification.

The guidance for Requirement 11.2.2 specifically discusses neighboring devices. It recommends documenting why those devices can be disregarded and verifying they are not connected through the entity's network ports or other connected devices.

Use that as a reason to improve classification quality, not to attack or connect to neighboring networks. Investigate through assets and networks you control.

If a finding remains uncertain, leave it unresolved and assign investigation work. Silently whitelisting every unfamiliar SSID destroys the value of the inventory.

## Verify that detection reaches a responder

Use an authorized, isolated test arrangement to confirm the monitoring method identifies a deliberately introduced unapproved access point. Coordinate the test so it does not create an uncontrolled bridge into the CDE.

Check that the expected alert reaches a named responder, includes enough location and device context to investigate, and results in a recorded disposition. For manual surveys, test the escalation procedure instead of assuming a spreadsheet will be read promptly.

When an unauthorized access point threatens the CDE, follow the incident-response plan. Preserve relevant network and detection records, isolate the connection through controlled means, and determine what access was possible.

## Keep the evidence useful between assessments

Reconcile approved devices when radios are replaced, offices move, or network ports are repurposed. Revisit external observations when identity, signal characteristics, or location changes.

A useful quarterly record shows both coverage and disposition: which sites were checked, what changed, how suspicious devices were investigated, and who closed each finding. That creates a manageable process without treating every nearby SSID as either an emergency or an automatic exception.
