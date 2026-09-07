# How to Verify Colocation Resilience and SLAs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, High Availability, UPS, Cooling, SLA

Description: Verify colocation power, cooling, fire protection, maintenance, failure response, and SLA language with evidence and witnessed tests.

---

Resilience is a property of the complete facility topology and its operation, not a count of UPS units or generators. Verify how each system carries your rack through maintenance and failure, then compare that behavior with the contract.

## Start with business failure cases

Define the events the service must tolerate:

- loss of one utility source
- UPS module, battery string, PDU, or distribution-path failure
- generator start failure or extended utility outage
- cooling unit, pump, control, or power-path failure
- fire alarm, suppression activation, or water event
- planned maintenance on each major component
- loss of one carrier entrance or meet-me-room path

Decide whether IT can run degraded and for how long. One cabinet in one facility cannot protect against loss of the entire site, so match the facility design with application-level geographic recovery.

## Trace the power path

Request a current single-line diagram and walk the path from utility and generators through switchgear, UPS, bypasses, PDUs, remote panels, branch circuits, rack PDUs, and device cords. Mark every A/B crossing and shared component.

Review capacity in normal, maintenance, and failure states. Evidence should include preventive-maintenance history, battery tests, UPS events, generator start and load tests, fuel runtime assumptions, refueling contracts, breaker coordination, alarm response, and recent incidents.

Ask what happens when utility power fails while another component is under maintenance. A generator count does not prove fuel quality, automatic start, switch operation, cooling power, or ability to refuel during a regional event.

At the rack, verify both feeds and perform an approved A-side and B-side failure test under representative load. The surviving path must remain within every circuit and PDU limit.

## Trace cooling and environmental control

Map heat from rack intake through containment, cooling units, heat rejection, pumps, controls, and power. Identify shared pipes, control systems, water supplies, and maintenance bypasses. Obtain the approved rack density for the exact position, not only a room average.

Review temperature and humidity sensor placement, alarm thresholds, response procedures, trend data, and loss-of-cooling tests. NIST SP 800-53 includes controls for maintaining and monitoring environmental conditions in facilities that contain information systems.

Test with realistic IT heat. An empty-room commissioning result may not demonstrate airflow at a populated high-density rack.

## Review detection and fire protection

Ask a qualified facility representative to explain detection zones, alarm sequencing, suppression type, manual controls, evacuation, automatic notifications, maintenance isolation, and recovery after activation. Verify inspections and impairment procedures.

NFPA 75 addresses fire protection approaches, construction, equipment, detection and suppression, utilities, and recovery for information technology equipment spaces. Do not prescribe a suppression agent from a sales brochure; verify the installed design against applicable code, insurer requirements, and the authority having jurisdiction.

Include leak detection, floor drains where relevant, overhead water paths, and protection from neighboring tenant work.

## Interpret certifications correctly

Uptime Institute defines Tier I through IV by infrastructure performance outcomes. Tier III is concurrently maintainable, while Tier IV adds fault tolerance. Certification scope matters: a design certification, constructed-facility certification, and operational assessment are not interchangeable.

Request certificate identifier, site, scope, level, date, and current status directly from the issuing body. A provider saying Tier-like or designed to Tier III is not the same as an independent current certification.

Also inspect audit reports and management certifications, but map their scope and exceptions to the service you buy. No certificate replaces your application recovery design.

## Read the SLA as a calculation

Extract the exact service, measurement point, formula, exclusions, maintenance treatment, claim window, evidence, credit, and chronic-failure remedy. Availability percentages can hide a meaningful outage budget:

```text
allowed downtime = measurement period x (1 - availability target)
```

For a 30-day month, 99.99 percent permits about 4.32 minutes under a simple calculation. The contract may define availability differently, exclude events, or measure each component separately.

A credit is a pricing remedy, not proof that the architecture meets your recovery objective. Compare the provider SLA with application error budgets and with dependencies such as carriers that have separate contracts.

## Witness tests and inspect operations

Request recent integrated-systems test summaries and an opportunity to witness relevant commissioning or maintenance tests. Sample alarm-to-ticket timestamps, escalation, staffing, spare parts, vendor response, and after-action closure.

Run customer-controlled tests for feed loss, carrier loss, out-of-band access, and incident communication. Record evidence, gaps, owners, and due dates in a risk register. Retest after major facility or rack changes.

## Conclusion

Verify colocation resilience by tracing end-to-end power, cooling, fire, network, and operational paths through normal, maintenance, and failure states. Validate certification scope, calculate the SLA literally, and keep geographic recovery for failures one facility cannot survive.

## Official Documentation

- [Uptime Institute Tier Classification System](https://uptimeinstitute.com/tiers)
- [Uptime Institute Tier certification](https://uptimeinstitute.com/tier-certification)
- [NFPA 75 Standard for Fire Protection of IT Equipment](https://link.nfpa.org/all-publications/75/2024)
- [NIST SP 800-53 Rev. 5 security and privacy controls](https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0)
