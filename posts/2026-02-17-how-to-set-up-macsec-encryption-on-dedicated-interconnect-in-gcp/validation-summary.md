# Validation Summary: How to Set Up MACsec Encryption on Dedicated Interconnect in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dedicated Interconnect
- MACsec for Cloud Interconnect
- Google Cloud CLI
- IEEE 802.1AE MACsec
- IPsec / HA VPN over Cloud Interconnect

## Sources Consulted
- Google Cloud Documentation: MACsec for Cloud Interconnect overview, https://docs.cloud.google.com/network-connectivity/docs/interconnect/concepts/macsec-overview
- Google Cloud Documentation: Set up MACsec, https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/macsec/set-up-macsec
- Google Cloud Documentation: Enable MACsec, https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/macsec/enable-macsec
- Google Cloud Documentation: Modify fail-open behavior, https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/macsec/modify-fail-open-behavior
- Google Cloud Documentation: View MACsec status, https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/macsec/view-macsec-status
- Google Cloud Documentation: Rotate MACsec keys, https://docs.cloud.google.com/network-connectivity/docs/interconnect/how-to/macsec/rotate-macsec-keys
- Google Cloud SDK reference: gcloud compute interconnects macsec, https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/macsec

## Issues Found
- The post stated that MACsec is not available for Partner Interconnect. Google documents MACsec for Partner Interconnect when the service provider supports it, so I changed the prerequisite to clarify that this Dedicated Interconnect guide assumes Dedicated Interconnect and that Partner Interconnect MACsec depends on the provider.
- The supported link sizes were incomplete. Google supports MACsec for 10G, 100G, and 400G circuits, with 100G and 400G MACsec capable by default and 10G requiring support and account-team enablement. I updated the prerequisite section.
- The create command used `--macsec-enabled`, which is not the documented way to request a MACsec-capable Dedicated Interconnect. I changed it to `--requested-features=MACSEC` and added the required customer name flag shown in Google documentation.
- The post implied an existing Interconnect could be enabled with `gcloud compute interconnects update --macsec-enabled`. Current Google documentation uses MACsec-specific subcommands, and existing 10G ports must first be MACsec capable. I replaced that command with a capability check and migration guidance.
- The key retrieval command used `gcloud compute interconnects describe --format="yaml(macsec)"`, but Google documents `gcloud compute interconnects macsec get-config` to retrieve CAK and CKN values. I corrected the command.
- The vendor-specific Cisco, Juniper, and Arista snippets were not safely verifiable as generally correct for all supported platform versions. I replaced them with Google's documented required interoperability parameters and instructed readers to use vendor documentation for device syntax.
- The post skipped the Google-side enablement command after configuring keys and router settings. I added `gcloud compute interconnects macsec update --enabled` and noted the documented temporary packet-loss risk.
- The MACsec status command used an incorrect output path. I updated it to inspect the documented `links.macsec`, `links.operationalStatus`, and `bundleOperationalStatus` fields from `gcloud compute interconnects get-diagnostics`.
- The fail-open and fail-close commands used unsupported `interconnects update` flags. I replaced them with the documented `gcloud compute interconnects macsec update --no-enabled --fail-open/--no-fail-open` sequence followed by re-enabling MACsec.
- The key rotation section omitted the five-key limit, six-hour spacing requirement, active-key verification, and the recommendation to remove the old key from the on-premises router before removing it from Cloud Interconnect. I added those details.
- A few performance and encryption claims were too absolute, including "no performance penalty", "no latency impact", and exact per-frame overhead. I softened them to line-rate operation on supported hardware, minimal latency impact, and generic SecTAG/ICV overhead.
- The IPsec comparison said IPsec encrypts only the IP payload and is not native with Interconnect. I clarified that IPsec tunnel mode also protects the original IP header and that HA VPN over Cloud Interconnect is a supported pattern.

## Review Notes
The Google Cloud CLI is not installed in this workspace, so command verification was done against current official Google Cloud documentation rather than local `gcloud --help` output.
