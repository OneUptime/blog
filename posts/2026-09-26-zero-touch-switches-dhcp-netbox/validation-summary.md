# Validation Summary: How to Zero-Touch Provision Switches with DHCP, NetBox, and Templates

## Status

validated

## Post Type

Technical guide with Python provisioning-service code and a dnsmasq configuration example.

## Technologies Covered

- Arista EOS zero-touch provisioning (ZTP), startup configuration, and USB trust enrollment
- NetBox inventory, configuration context, template rendering, and REST API authentication
- Python 3, Requests, pathlib, and SHA-256 artifact digests
- dnsmasq, DHCP reservations, per-host tags, and bootfile discovery
- HTTP/HTTPS artifact delivery and provisioning lifecycle management

## Sources Consulted

- NetBox configuration rendering: https://netboxlabs.com/docs/netbox/features/configuration-rendering/
- NetBox REST API and authentication: https://netboxlabs.com/docs/netbox/integrations/rest-api/
- dnsmasq manual: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Arista 7368X switch configuration guide: https://www.arista.com/en/qsg-7368x-series/7368x-series-configuring-the-switch
- Arista EOS recovery procedures, including USB ZTP: https://www.arista.com/en/um-eos/eos-recovery-procedures
- Arista EOS manual PDF link and indexed official content: https://www.arista.com/en/assets/data/pdf/user-manual/um-books/EOS-User-Manual.pdf
- Arista CloudVision onboarding documentation: https://www.arista.io/help/2026.1/articles/devices-registration-onboard
- Requests API reference: https://requests.readthedocs.io/en/latest/api/
- Python pathlib reference: https://docs.python.org/3/library/pathlib.html
- Python built-in open modes: https://docs.python.org/3/library/functions.html#open
- Python hashlib reference: https://docs.python.org/3/library/hashlib.html
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- RFC 2132, DHCP Options and BOOTP Vendor Extensions: https://www.rfc-editor.org/rfc/rfc2132
- RFC 5737, documentation address ranges: https://www.rfc-editor.org/rfc/rfc5737

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- Confirmed the NetBox render-config POST endpoint, device/role/platform template precedence, and text/plain content negotiation. The provisioning account needs the appropriate device render_config permission and a token that permits the POST operation.
- Confirmed the Bearer scheme for v2 tokens and Token scheme for legacy v1 tokens. Current NetBox documentation says v2 tokens were introduced in 4.5 and v1 tokens are deprecated in 4.6, with removal planned for 5.0. The article correctly directs readers to their deployed version's authentication format.
- Parsed and compiled the Python example, then exercised it with mocked Requests responses and a temporary artifact directory. Checks passed for successful byte-for-byte storage, SHA-256 naming, invalid device IDs, empty responses, unexpected content types, non-200 responses, and refusal to overwrite an existing artifact. This was not a live NetBox integration test.
- Exclusive binary creation intentionally raises FileExistsError if the same artifact already exists. The surrounding service must retrieve its recorded approved artifact for delivery retries, as the article specifies, rather than rerun rendering on each boot request. Content-addressed filenames and exclusive creation do not themselves enforce filesystem immutability; directory controls and the separate validation/publication step remain necessary.
- Confirmed the dnsmasq interface, DNS-disable, binding, range, router, reservation, tag, known-client filter, and bootfile option syntax against its manual. DHCP options normally depend on the client's request list; the article appropriately requires inspecting the actual exchange. No dnsmasq binary was available for a local configuration parser test.
- The 192.0.2.0/24 addresses are documentation placeholders. A real deployment must supply appropriate interface addressing, reachable artifact service, and network values. The snippet is explicitly a lab configuration fragment, not a complete server setup.
- Confirmed EOS network configuration/script bootstrap behavior, startup configuration persistence, and USB bootstrapUrl/serverCaCertificate trust configuration in official Arista HTML documentation. Exact model, release, boot state, and certificate enrollment still need lab qualification, as stated in the article.
- The linked official HTML documentation was accessible. The EOS PDF URL is present in official search results, but the browser could not parse it and a direct HEAD request returned HTTP 200 with an HTML content type. Relevant claims were independently verified using the official Arista HTML pages; successful retrieval of the PDF itself was not established.
- DHCP identifiers do not authenticate a device, and artifact delivery alone does not establish successful provisioning. The separation of approval, rendering, delivery, management verification, persistence checks, and retirement of temporary access is technically sound.
- No physical switch, live DHCP exchange, production credentials, or end-to-end provisioning environment was used. Validation covers documentation accuracy and the local checks described above, not hardware certification.
