# Validation Summary: How to Understand RPL (Routing Protocol for Low-Power Networks) over IPv6

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6
- RPL / LLN routing
- DODAG construction and Rank
- RPL control messages
- RPL storing and non-storing modes
- OpenThread CLI / Thread mesh routing
- Contiki-NG RPL configuration

## Sources Consulted
- RFC 6550: RPL: IPv6 Routing Protocol for Low-Power and Lossy Networks - https://datatracker.ietf.org/doc/html/rfc6550
- RFC 6552: Objective Function Zero for RPL - https://datatracker.ietf.org/doc/html/rfc6552
- RFC 6719: The Minimum Rank with Hysteresis Objective Function - https://datatracker.ietf.org/doc/rfc6719/
- RFC 6554: An IPv6 Routing Header for Source Routes with RPL - https://www.rfc-editor.org/rfc/rfc6554
- OpenThread CLI Command Reference - https://openthread.io/reference/cli/commands
- OpenThread Thread Primer: Network Discovery and Formation - https://openthread.io/guides/thread-primer/network-discovery
- Contiki-NG RPL documentation - https://docs.contiki-ng.org/en/release-v4.8/doc/programming/RPL.html
- Contiki-NG configuration system - https://docs.contiki-ng.org/en/master/doc/getting-started/The-Contiki-NG-configuration-system.html
- Contiki-NG routing API source documentation - https://docs.contiki-ng.org/en/master/_api/routing_8h_source.html
- Contiki-NG logging system - https://docs.contiki-ng.org/en/master/doc/getting-started/The-Contiki-NG-logging-system.html

## Issues Found
- The post described the root as having raw Rank 1. RFC 6550 defines Rank as a raw fixed-point value and DAGRank as the normalized integer value; changed the diagram and prose to use normalized DAGRank 1.
- ETX was expanded as "Expected Transmissions"; changed it to the standard "Estimated Transmission Count."
- OF0 and MRHOF were over-simplified. Updated OF0 to describe its basic/default role and MRHOF as minimizing an additive metric, commonly ETX, with hysteresis.
- The control-message table omitted RPL control codes and used "Info" instead of "Information." Added type/code values and corrected message names and purposes.
- The join flow implied DAO registration with all ancestors and routes on all intermediate nodes in every mode. Updated it to distinguish storing mode from non-storing mode.
- The OpenThread section implied OpenThread uses RPL internally. Corrected it to say OpenThread implements Thread mesh routing using MLE and distance-vector route propagation, then updated the CLI examples to match the official OpenThread command reference.
- The Contiki-NG configuration snippet used `RPL_CONF_WITH_NON_STORING` as a storing/non-storing selector. Updated it to use `RPL_CONF_MOP` and clarified that RPL Lite is non-storing only while RPL Classic supports storing mode.
- The Contiki-NG objective-function snippet used the unsupported `RPL_MRHOF_CONF_SWITCH_THRESHOLD` macro and did not include OF support configuration. Replaced it with supported `RPL_CONF_SUPPORTED_OFS`, `RPL_CONF_OF_OCP`, and `RPL_MRHOF_CONF_SQUARED_ETX` examples.
- The Contiki-NG application snippet used logging macros without the required logging header/module definitions and showed a top-level `if` fragment. Added the standard logging include/module definitions and wrapped the check in a function.
- The conclusion claimed RPL creates an optimal routing tree. Changed this to a policy-driven routing topology, which is more accurate for objective-function-based routing.

## Review Notes
The snippets were reviewed against official RFCs and current OpenThread/Contiki-NG documentation. No build was run because the examples are documentation snippets rather than a complete Contiki-NG project.
