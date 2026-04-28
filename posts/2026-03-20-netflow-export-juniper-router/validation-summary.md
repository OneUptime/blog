# Validation Summary: How to Configure NetFlow Export on a Juniper Router

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Junos OS (Juniper)
- NetFlow v9
- IPFIX (NetFlow v10)
- Inline J-Flow (active flow monitoring)
- Junos firewall filters
- Junos sampling and `services flow-monitoring` hierarchy

## Sources Consulted
- Juniper TechLibrary: "Configuring Active Flow Monitoring" / "Inline Active Flow Monitoring"
  (https://www.juniper.net/documentation/us/en/software/junos/flow-monitoring/)
- Juniper CLI Explorer: `services flow-monitoring`, `forwarding-options sampling instance`, `chassis fpc inline-services`
- Juniper "Sampling Statement" reference (https://www.juniper.net/documentation/us/en/software/junos/flow-monitoring/topics/ref/statement/sampling-edit-forwarding-options.html)
- IETF RFC 3954 (NetFlow v9) and RFC 7011 (IPFIX) for protocol semantics and the IANA-registered IPFIX port 4739

## Issues Found
The original post used a Junos hierarchy that does not exist. Concrete fixes applied to README.md:

1. **Wrong hierarchy for templates and flow servers.** The post placed templates and the collector under `forwarding-options flow-monitoring …`. In Junos, flow templates live under `services flow-monitoring`, and the collector is configured inside the sampling instance using `output flow-server <ip> port <port>`. Replaced all `set forwarding-options flow-monitoring …` lines with the correct `set services flow-monitoring …` and `set forwarding-options sampling instance … family inet output flow-server …` syntax in Steps 1, 2, 5, and the conclusion.
2. **Fabricated `flow-export-destination` keyword.** Junos has no `flow-export-destination` stanza; the destination is part of the sampling instance’s `output flow-server` statement. Removed everywhere it appeared (Steps 1 and 5).
3. **Invalid template field names.** `ip-headers`, `transport-ports`, `protocol`, and `counter` are not valid leaf options under a `version9`/`version-ipfix` template. Replaced with the real options: `flow-active-timeout`, `flow-inactive-timeout`, `template-refresh-rate packets`, `option-refresh-rate packets`, and the record-type selector `ipv4-template`.
4. **Missing inline J-Flow chassis binding.** Added the standard `set chassis fpc 0 sampling-instance …` and `inline-services flow-table-size` snippet that is required for Inline J-Flow on MX/EX9200-class platforms — without these, `inline-jflow source-address` alone does not produce export packets.
5. **Misleading "Full Flow Export" framing in Step 4.** A firewall-filter `then sample` action does not bypass sampling — it just gates which traffic enters the sampling instance. Renamed the step to "Selective Sampling Using a Firewall Filter", removed the incorrect mention of a "syslog action", and clarified that the configured sampling rate still applies.
6. **Wrong verification commands.** `show class-of-service interface` is for QoS, and `show services flow-monitoring statistics` / `show services flow-monitoring flow-table` are not Junos commands. Replaced with the correct Inline J-Flow commands: `show services accounting status inline-jflow fpc-slot 0`, `show services accounting flow inline-jflow fpc-slot 0`, `show services accounting errors inline-jflow fpc-slot 0`, and `show forwarding-options sampling instance <name>`. Also corrected `show configuration forwarding-options flow-monitoring` to `show configuration services flow-monitoring`.
7. **Cisco/Junos comparison table inaccuracies.** `ip flow-cache` is not the Cisco command for sampling rate (it’s a cache-tuning command). Replaced with `ip flow-sampler-map` and tightened the Junos column to match the corrected hierarchy.

## Review Notes
- The post is largely platform-agnostic across Inline J-Flow capable Juniper hardware, but readers should note that older M-series or services-PIC-based deployments may use a slightly different services-PIC flow-monitoring model not covered here.
- IPFIX UDP port 4739 is the IANA-registered default and matches the post; some collectors still listen on 2055 for IPFIX as well.
- The post does not discuss IPv6 (`family inet6`) or MPLS flow templates — those are valid future additions but out of scope of this review.
- For Junos 19.x and later, the `template-refresh-rate` and `option-refresh-rate` can also be specified in `seconds` instead of `packets`; the `packets`-based form used here is widely supported across recent releases.
