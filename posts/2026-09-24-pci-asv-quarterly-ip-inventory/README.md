# How to Define the IP Inventory for Quarterly PCI DSS ASV Scans

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PCI DSS, Security, Vulnerability Management

Description: Create an ASV scan inventory that reconciles public addresses, hostnames, payment flows, cloud changes, and documented segmentation exclusions.

---

A passing ASV report is only useful if the scan covered the correct external attack surface. An old spreadsheet can omit a checkout hostname, a disaster-recovery endpoint, or an exposed origin while still producing a reassuring report for the addresses it contains.

PCI DSS v4.0.1 Requirement 11.3.2 requires passing external scans by an Approved Scanning Vendor at least once every three months. The ASV Program Guide defines scan preparation and scope responsibilities. Build the target inventory jointly with your ASV, using your documented PCI scope as the starting point. [PCI DSS v4.0.1 and ASV Program Guide](https://www.pcisecuritystandards.org/document_library/)

## Inventory services before resolving addresses

Start with payment flows and security-impacting systems. List the public services that store, process, or transmit account data, and those that can affect its security. Include relevant web applications, gateways, exposed administration, remote-access services, and connected infrastructure.

For SAQ A e-commerce merchants, outsourcing payment processing does not remove scanning for the merchant webpage that redirects to a provider or embeds its payment form. PCI SSC's June 2026 FAQ explicitly covers both arrangements, including chained redirects and nested iframes. [PCI SSC FAQ 1604](https://www.pcisecuritystandards.org/faqs/1604/)

Do not reduce the inventory to the hostname where PAN is entered. Trace the merchant-controlled steps that deliver or redirect the payment experience.

## Reconcile independent inventory sources

Compare at least the public DNS zones, cloud resource inventories, external load balancers, firewall and NAT configuration, certificates, hosting accounts, and the approved PCI asset register. Use deployment records to identify recently added and removed endpoints.

A practical inventory row includes:

```text
asset_id | owner | function | FQDN | IPv4/IPv6 | provider/account
origin relationship | PCI scope reason | ASV treatment | last verified
```

Keep stable asset identity separate from an IP address. Addresses can change or be reassigned. Record when DNS resolution was observed and what service the address represented at that time.

Investigate differences between sources. A hostname absent from the asset register may be a forgotten service. An address present only in a previous scan may have been retired, but confirm decommissioning instead of quietly dropping it.

## Give the ASV both names and network context

Virtual hosting and TLS routing can serve different applications on the same address. Provide relevant fully qualified domain names along with address information so the ASV can determine how to inspect the intended services.

Describe CDNs, load balancers, NAT, shared hosting, redirects, and origin access restrictions. An edge address does not necessarily explain whether a directly reachable origin exists. Conversely, scanning an arbitrary shared cloud range without the provider's and ASV's agreed process is not a sound way to establish your application's coverage.

The standard specifically directs customers and ASVs to work through topology, hosting-provider, protocol, and interference issues. Retain the agreed treatment for dynamic addressing and shared services. [PCI DSS v4.0.1, 11.3.2 applicability notes](https://www.pcisecuritystandards.org/document_library/)

Include IPv6 exposure in the discussion. An IPv4-only inventory can miss a publicly reachable service advertised through an AAAA record. Confirm supported coverage with the ASV and document any unresolved gaps.

## Justify exclusions with segmentation evidence

A public system may be outside the relevant scope when effective segmentation and its function support that conclusion. Document the rationale, boundary controls, and supporting validation. Ownership by a different team is not isolation.

Maintain exclusions alongside included targets. Each exclusion should identify the asset, reason, evidence, approver, and change triggers. If a later deployment creates connectivity or a security-impacting dependency, revisit the conclusion.

Do not make exclusions to avoid a failing finding. If an asset was decommissioned or a vulnerable service permanently removed, preserve the change and verification evidence so the inventory history explains the disappearance.

## Reconcile the report back to the inventory

Before accepting the scan package, compare expected targets with the completed scan's targets and outcomes. Investigate omitted, unreachable, inconclusive, and unresolved systems separately. A report showing only successful targets can hide the population that failed to complete.

After remediation, ensure rescans cover the affected interface and remain tied to the original finding. Preserve the inventory version used for the scan, subsequent corrections, and the final passing evidence.

## Keep the inventory current between scans

Add inventory updates to public-service creation, DNS changes, cloud migrations, and decommissioning. Review it before each scheduled ASV scan and when significant changes occur. Requirement 11.3.2.1 separately addresses external scanning after significant changes; it does not require that tester to be an ASV, though qualification and independence still apply. [PCI DSS v4.0.1, 11.3.2.1](https://www.pcisecuritystandards.org/document_library/)

The outcome should be a maintained explanation of the external payment attack surface, with every included or excluded target accounted for. That explanation makes the ASV result defensible and helps engineering teams notice exposure before the next assessment.
