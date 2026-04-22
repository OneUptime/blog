# Validation Summary: How to Configure Sendmail DaemonPortOptions for IPv4 Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Sendmail
- DaemonPortOptions / DAEMON_OPTIONS
- IPv4 and IPv6 socket binding
- SMTP and Message Submission Agent ports
- Linux service and socket inspection commands
- m4-generated Sendmail configuration

## Sources Consulted
- Sendmail Installation and Operation Guide, `DaemonPortOptions` option: https://www.sendmail.org/~ca/email/doc8.11/op.pdf
- Sendmail 8.12 cf/README, `DAEMON_OPTIONS` m4 macro behavior and defaults: https://www.sendmail.org/~ca/email/doc8.12/cf/m4/tweaking_config.html
- Proofpoint Sendmail Open Source FAQ, localhost IPv4/IPv6 daemon examples: https://www.proofpoint.com/us/sendmail/faq
- Red Hat Enterprise Linux 6 Deployment Guide, Sendmail configuration generation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/s2-email-mta-sendmail
- Oracle Linux 7 Email Service Configuration, Sendmail configuration files and regeneration: https://docs.oracle.com/en/operating-systems/oracle-linux/7/network/network-EmailServiceConfiguration.html
- Local `ss --help` output for `-tlnp` option meanings.

## Issues Found
- The post stated that default Sendmail listens on both IPv4 and IPv6. Upstream Sendmail documentation says the `Family` key defaults to IPv4 (`INET`/`inet`), and IPv6 requires additional `Family=inet6` daemon options. Updated the introduction and default behavior section.
- The post described `sendmail.cf` as a compiled binary config. It is a generated text configuration file. Updated the configuration-file description and recompilation wording.
- The post used absolute wording that `sendmail.cf` should never be edited directly. Distribution documentation recommends editing `sendmail.mc` when that source file manages the generated configuration, so the wording was softened to that accurate case.
- The verification example omitted the configured submission listener on port 587 from the expected `ss` output. Added `192.168.1.10:587` to match the example configuration.

## Review Notes
The `DAEMON_OPTIONS` examples, `Family=inet`, `Addr=`, `Port=`, `Name=`, and `M=Ea` usage match the Sendmail documentation. The local environment did not include Sendmail or `m4`, so the Sendmail configuration was verified against official documentation rather than compiled locally.
