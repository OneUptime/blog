# How to Transport Servers Safely for a Colocation Move

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Packaging, Server Hardware, Asset Management, Migration

Description: Protect server hardware and data during a colocation move with verified backups, ESD packaging, chain of custody, and arrival testing.

---

Servers are designed to run in a rack, not to absorb uncontrolled shock, static, moisture, or a loose rail during transport. Use model-specific vendor instructions and a documented chain of custody from shutdown through destination validation.

## Decide what should move physically

Before packing, determine whether workloads can migrate to replacement or temporary capacity. A logical migration avoids transporting the only good copy of a service. Retire obsolete systems instead of paying to move and rack them again.

For each moving asset, record model, serial, rack position, weight, dimensions, rail kit, installed drives and cards, encryption state, and destination. Photograph front, rear, cable map, drive order, and any existing damage.

Check the manufacturer's service manual and transport restrictions. Some systems can ship populated only in approved packaging or transport-rated racks. Heavy accelerators, heatsinks, bezel parts, rails, cable arms, drives, or other components may need separate securing or removal. Do not generalize one server model's instructions to another.

## Protect the data first

Create and test a backup that will not travel in the same vehicle. Verify application consistency and record restore instructions, encryption keys, and recovery contacts. Redundancy inside the chassis is not a backup against shock, loss, or theft of the whole system.

Drain traffic and stop applications cleanly. Confirm storage writes and replication are complete before shutdown. Capture health logs, drive state, firmware inventory, and configuration so arrival problems can be compared with a known baseline.

Apply the organization's media-transport and custody policy. Encrypt data at rest where supported and protect keys separately. Document who releases, carries, receives, and opens each serialized package.

## Use approved protective packaging

Original manufacturer packaging with fitted foam is the first choice when approved for that configuration. Otherwise use a professional reusable server case designed for the model, weight, and transport mode.

Use ESD-safe handling and antistatic packaging for removed electronic parts. Seagate's official drive shipping guidance calls for individual antistatic protection and cushioning, and advises against loose packing materials such as pellets, air bags, or newspaper for drives.

Package rails, cable-management arms, bezels, optics, screws, and adapters separately in labeled compartments so metal parts cannot strike electronics. Protect connector faces and fiber optics with proper caps. Do not allow cables or accessories to move freely inside a chassis.

Seal each container with:

- asset and package identifiers
- destination site, cage, and contact
- gross weight and handling orientation
- package count, such as 2 of 5
- tamper-evident identifier where required

Do not print credentials, sensitive network details, or a complete inventory of valuable contents on the external label.

## Control handling and transport

Use a carrier experienced with high-value electronic equipment. Confirm loading-dock booking, vehicle size, liftgate, pallet-jack, elevator, doorway, floor-loading, security, insurance, and after-hours rules at both sites.

Keep equipment upright when required, restrained against movement, protected from weather, and within manufacturer temperature and humidity limits. Shock, tilt, and environmental indicators can provide evidence but do not replace proper packaging.

Equinix requires inbound shipments to be ordered in advance and documents loading-dock, label, carrier, and collection rules. Obtain the actual destination facility's policy, because an unannounced shipment may be delayed or rejected.

Avoid transporting loaded cabinets unless the rack, server rails, hard-mount hardware, route, and carrier are all rated and approved for it. Dell rail instructions distinguish hardware used to secure systems for shipment or unstable environments. Ordinary slide-rail latches are not proof that a loaded rack is roadworthy.

## Receive and inspect before power

Reconcile seals, package count, serials, and custody immediately. Photograph crushed corners, water, broken indicators, or tampering before moving or opening the package. Escalate damage under the carrier and insurance procedure.

If equipment is cold or has crossed a large temperature or humidity change, keep it powered off until it has safely acclimatized and condensation risk has passed according to vendor guidance. Never use power-on heat to dry suspected moisture.

Inspect chassis, connectors, fans, cards, heatsinks, drive seating, rails, and loose parts. Use the correct lifting method and install heavy equipment low in a stabilized rack. Dell notes that heavy systems can require a rack lift and multiple people.

## Validate in stages

After racking and cabling, verify A/B power mapping and network labels before energizing. Observe BMC health and power-on self-test, then compare memory, drives, adapters, firmware, temperatures, and event logs with the pre-move baseline.

Run storage consistency checks appropriate to the platform, test both network paths and power feeds, restore monitoring, and perform application transactions. Keep packaging and the old service path until the acceptance window closes.

## Conclusion

Safe transport begins with a recoverable service and an off-vehicle backup. Follow model-specific restrictions, use ESD-safe fitted packaging, control custody and environment, pre-book facility logistics, and compare staged arrival tests with a captured health baseline.

## Official Documentation

- [Seagate packing and shipping instructions](https://www.seagate.com/support/warranty-and-replacements/packing-and-shipping-instructions/)
- [Dell PowerEdge rack and rail setup guidance](https://www.dell.com/support/kbdoc/en-us/000203859/install-and-setup-poweredge-rack-and-tower-servers-and-configure-idrac-and-ism-documentation-videos)
- [Dell PowerEdge R740 rail installation guide](https://dl.dell.com/manuals/all-products/esuprt_ser_stor_net/esuprt_poweredge/poweredge-r740_setup-guide2_en-us.pdf)
- [Equinix inbound shipment requirements](https://docs.equinix.com/smart-hands/shipping-receiving/sh-inbound-shipments/)
