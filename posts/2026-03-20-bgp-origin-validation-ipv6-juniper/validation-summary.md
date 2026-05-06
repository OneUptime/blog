# Validation Summary: How to Configure BGP Origin Validation for IPv6 on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos
- BGP
- RPKI
- RTR
- IPv6
- Routing policy

## Sources Consulted
- Juniper, BGP Origin Validation: https://www.juniper.net/documentation/us/en/software/junos/bgp/topics/topic-map/bgp_origin_validation.html
- Juniper, `session` statement for origin validation: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/session-edit-routing-options-validation.html
- Juniper, `show validation session`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-validation-session.html
- Juniper, `show validation database`: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-validation-database.html
- Juniper, `policy-statement` syntax including validation database match conditions: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/policy-statement-edit-policy-options.html
- Juniper, actions in routing policy terms: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/policy-configuring-actions-in-routing-policy-terms.html
- Juniper, `traceoptions` for origin validation: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/traceoptions-edit-routing-options-validation.html
- Juniper, trace `flag` options for origin validation: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/flag-edit-routing-options-validation-trace.html
- Juniper Day One, Deploying BGP Routing Security 2.0: https://www.juniper.net/documentation/en_US/day-one-books/DO_BGP_SecureRouting2.0.pdf
- RFC 6811, BGP Prefix Origin Validation: https://www.rfc-editor.org/rfc/rfc6811
- RFC 8210, The Resource Public Key Infrastructure (RPKI) to Router Protocol, Version 1: https://www.rfc-editor.org/rfc/rfc8210

## Issues Found
- The post used invalid IPv6 literals in multiple examples (`2001:db8:validator::1` and `2001:db8:peer::1`). I replaced them with valid documentation-prefix IPv6 addresses so the Junos examples are syntactically correct.
- The set-style configuration block was labeled as if it were an `/etc/juniper` file edit, but those lines are Junos configuration mode commands. I corrected the comment so the example matches how Junos `set` syntax is actually used.
- The curly-brace example used a different validation group name (`rpki-validators`) than the set-style example (`rpki-validator`). I made the group name consistent so the two examples describe the same configuration.
- `show validation database inet6` is not valid Junos CLI syntax. I replaced it with documented `show validation database` commands that work for inspecting the validation database and querying a specific IPv6 record.
- The routing policy block was fenced as `python` even though it is Junos configuration, not Python. I changed the fence to `text` so the snippet is accurately identified.
- The monitoring examples used `table inet6.0` variants that were not the documented validation examples I could verify from Juniper sources. I simplified them to the verified `show route validation-state ...` form and kept the per-prefix `show route ... detail` example.
- The final section described the configuration as syslog logging for invalid routes, but the example actually configures Junos `traceoptions` output for RPKI validation events to a trace file and is not limited to invalid routes. I corrected the section title, comment, and file syntax to reflect what the configuration really does.

## Review Notes
- The post does not pin a specific Junos release. The reviewed configuration and commands are supported in current Junos documentation, and core origin-validation support is documented as introduced in Junos OS 12.2.
- The example keeps port `3323`, which is acceptable when the validator is configured to listen there. Operators should match the RTR port configured on their validator.
- Juniper documentation cautions that `validation traceoptions` can affect scale and performance and should generally be enabled temporarily for troubleshooting rather than left on indefinitely.
