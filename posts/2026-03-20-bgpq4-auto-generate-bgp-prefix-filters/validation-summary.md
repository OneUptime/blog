# Validation Summary: How to Use bgpq4 to Auto-Generate BGP Prefix Filters from IRR Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- bgpq4
- BGP prefix filters
- Internet Routing Registry (IRR)
- Cisco IOS and IOS XR prefix-list generation
- BIRD
- OpenBGPD
- JSON output for routing automation
- Bash automation with cron

## Sources Consulted
- bgpq4 official repository and documentation: https://github.com/bgp/bgpq4
- bgpq4 official README (options, examples, source notes, build instructions): https://raw.githubusercontent.com/bgp/bgpq4/main/README.md
- bgpq4 upstream test fixtures used to verify current flag combinations and output formats: https://github.com/bgp/bgpq4/tree/main/tests/reference
- ARIN official IRR documentation: https://www.arin.net/resources/manage/irr/
- RIPE Database documentation, including RIPE IRR overview: https://docs.db.ripe.net/What-is-the-RIPE-Database/Purpose-and-Content-of-the-RIPE-Database/

## Issues Found
- The source-build example cloned the Git repository and then ran `./configure` directly. Upstream requires `./bootstrap` first when building from the repository, so that step was added.
- The single-AS examples used private and placeholder objects (`AS65100`, RFC1918 example prefixes) that would not work as shown. They were replaced with public examples verified in bgpq4's upstream test data (`AS112` and its published prefixes).
- The first Step 2 command was described as Cisco IOS output, but `-F "%n/%l\n"` produces plain user-defined prefix/mask lines rather than IOS configuration. The description was corrected.
- The example output in Step 2 showed IOS sequence numbers even though the command did not use `-s`. The output was corrected to match standard `-l` behavior.
- The AS-SET examples used placeholder objects (`AS-EXAMPLE`) and incorrectly described `-R 24` as setting a maximum prefix length. They were replaced with public AS-SET examples and the explanation was corrected: `-R` allows more-specifics up to the specified mask length.
- The automation script listed placeholder/private IRR objects that would not resolve in practice. Those entries were replaced with public objects from the official docs and tests.
- The commented router-application example (`ssh router.example.com < "$OUTPUT_FILE"`) was too vendor-specific to be reliably correct as written. It was replaced with an accurate note that deployment is router- and workflow-specific.
- The router-format section misused several flags: `-S` was incorrectly used as a filter name, `-f` was incorrectly used for BIRD/OpenBGPD prefix output, and `-O` is not a valid bgpq4 option. Those commands were corrected to the official flags `-X`, `-b`, `-B`, and `-j`.
- The IRR server section incorrectly stated that bgpq4 defaults to RADB and used `-h` where `-S` was the correct mechanism for restricting IRR data sources. The section was corrected to reflect the documented default host (`rr.ntt.net`), proper use of `-S`, and `SOURCE::OBJECT` notation.
- The conclusion incorrectly described `-R 24` as a maximum-prefix-length control. It was corrected to distinguish `-R` from `-m`.

## Review Notes
- The post is technically valid after the corrections above.
- IRR-based filtering remains useful, but real-world deployments should choose trusted sources carefully and align `-S`, `-R`, and `-m` usage with local routing policy.
