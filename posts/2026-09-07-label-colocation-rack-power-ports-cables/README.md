# How to Label Rack Units, Power Feeds, Ports, and Cables Before a Colocation Move

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Labeling, Documentation, Rack, Networking

Description: Create durable, unique rack, device, power, port, and cable identifiers that match the source of truth before a colocation move.

---

Labels are the physical interface to your migration plan. A technician should be able to identify a device, both ends of a cable, and the correct power path without interpreting color, handwriting, or tribal knowledge.

## Choose one location hierarchy

Define stable identifiers for site, room or cage, cabinet, cabinet face, rack unit, device, and component. For example:

```text
site:       LON1
cage:       C03
rack:       R12
device:     LON1-C03-R12-SRV042
position:   front, U18-U19
```

Declare whether rack units are counted from bottom to top and label both front and rear rails. Avoid embedding owner, application, or environment in the permanent asset ID because those can change. Store those meanings as attributes in the inventory.

Use identifiers that remain unique across sites. NIST component-inventory guidance calls for accountable, non-duplicated records and includes physical location among useful hardware fields.

## Label devices and removable parts

Put the asset ID where it is visible from the service side without removing the device. Record manufacturer serial, model, rack position, hostname, and management address in the source of truth, but avoid printing sensitive addresses or credentials on the chassis.

Label field-replaceable drives, power supplies, fan modules, and line cards by chassis slot and serial when operational procedures depend on them. A drive instruction should name `SRV042 slot 0:5`, not only failed disk.

Photograph the front and rear of every rack after labels are applied.

## Make power identity explicit

Use `A` and `B` as text as well as distinct colors. Color is an aid, not an identifier. Label both ends of every power cord with:

- device and power-supply position
- rack PDU identifier
- bank or branch and outlet number
- feed A or B

An example is `SRV042-PSU1 -> R12-PDU-A outlet A17`. Keep the arrow direction or source and destination fields consistent.

Verify the mapping physically by reading PDU outlet data or performing an approved one-cord-at-a-time test on redundant equipment. Do not infer A/B from which side of the rack a cord occupies.

## Give every data cable one ID

Assign a unique cable ID and print it at both ends. The source-of-truth record maps that ID to endpoint device, port, patch panel, media, connector, length, and purpose:

```text
cable: C-LON1-004217
A end: R12-SW01 Ethernet1/17
Z end: R12-SRV042 NIC1
media: single-mode fiber, LC pair
```

Add an endpoint label near each connector so a technician can see the expected far end without opening the database. For fibers, preserve pair and polarity identification. Never use interface description as the only cable ID because ports and purposes change.

ANSI/TIA-606-D provides a standards framework for identifiers, records, and administration across telecommunications spaces. Confirm the edition required by your organization, contract, and authority having jurisdiction.

## Label patch panels and ports

Give each panel a rack and position identifier and each port an unambiguous number. Match device interface names exactly, including slot and sub-port notation. Use a consistent left-to-right and top-to-bottom numbering scheme and document unused, reserved, and provider-controlled positions.

For a provider cross-connect, record the customer panel and port, provider circuit ID, carrier ID, demarcation, LOA/CFA reference, and remote endpoint. Do not relabel provider assets without authorization.

## Build and reconcile the move sheet

Export one row per asset and cable with old location, new location, move wave, dependencies, shutdown owner, destination U, destination power outlets, and destination switch ports. Use barcode or QR scanning to reduce transcription, but keep the printed identifier human-readable.

Run three reconciliations:

1. database to rack: every record exists physically
2. rack to database: every item has one current record
3. endpoint to endpoint: every cable and power cord matches both labels

Quarantine discrepancies before the move. Do not label around an unknown cable and promise to identify it during the outage.

## Make labels survive the move

Use material rated for the surface, temperature, handling, and expected life. Place wrap or flag labels without violating cable bend radius, blocking vents, covering serials, or interfering with latches. Print spares for items likely to be repackaged.

Schneider Electric notes that rack cable management affects reliability, airflow, and safe moves and changes. Route and label together, then update records immediately after any last-minute port change.

## Conclusion

Create a stable location hierarchy, unique asset and cable IDs, explicit A/B text, exact endpoint records, and a three-way reconciliation before the move. Durable labels and current records let remote and on-site technicians execute without guessing.

## Official Documentation

- [ANSI/TIA-606-D administration standard](https://store.accuristech.com/standards/tia-ansi-tia-606-d?product_id=2594255)
- [NIST SP 800-53 Rev. 5 system component inventory controls](https://www.nist.gov/publications/security-and-privacy-controls-information-systems-and-organizations-0)
- [Schneider Electric planning for power and data cables in racks](https://www.apc.com/us/en/download/document/SPD_VAVR-9G4NDJ_EN/)
- [Equinix customer installation guidelines](https://docs.equinix.com/colocation/colo-customer-install-guidelines/)
