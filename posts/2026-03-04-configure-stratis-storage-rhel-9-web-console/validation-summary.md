# Validation Summary: How to Configure Stratis Storage Using the RHEL Web Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL Web Console
- Cockpit
- Cockpit storage add-on
- Stratis
- stratisd
- stratis-cli
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systems using the RHEL 9 web console, installing and enabling the web console: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/managing_systems_using_the_rhel_9_web_console/index
- Red Hat Enterprise Linux 9 documentation: Setting up Stratis file systems, installing Stratis, creating pools and filesystems by using the web console, encryption, and mounting: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/setting-up-stratis-file-systems_managing-file-systems/
- Red Hat Enterprise Linux 9 documentation: Extending a Stratis pool with additional block devices by using the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/extending-a-stratis-pool-with-additional-block-devices_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Using snapshots on Stratis file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation: Removing Stratis file systems and pools by using the web console: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Stratis upstream how-to documentation: https://stratis-storage.github.io/howto/

## Issues Found
- The login instructions referenced the older "Reuse my password for privileged tasks" option. Updated this to current RHEL Web Console limited/administrative access wording.
- The Stratis pool creation procedure pointed users to a generic Devices section and described encryption as a simple toggle with only a passphrase. Updated this to match the RHEL 9 web console flow, including the Storage table menu and supported encryption choices.
- The filesystem creation section claimed the Web Console automatically adds `x-systemd.requires=stratisd.service`. Reworded this because Red Hat documents multiple persistent mount approaches and the web console exposes an at-boot mount choice rather than requiring users to manage that exact option.
- The snapshot creation and mounting steps described GUI actions that are not documented in the RHEL 9 Stratis web console procedures. Replaced them with documented `stratis fs snapshot` and `mount /dev/stratis/...` commands, noting they can be run from the Web Console Terminal or SSH.
- The add-device procedure omitted the data/cache tier selection and passphrase prompt for encrypted pools. Added those steps and clarified that capacity increases immediately when adding to the data tier.
- The encrypted pool unlock instructions described a Web Console unlock button workflow that is not documented for Stratis pools. Replaced it with a documented keyring-based CLI unlock note and Tang automatic-unlock caveat.
- The limitations section incorrectly used cache tier management as an example of a missing web console feature. Replaced it with snapshot revert scheduling, which is documented as a CLI operation.
- The description and conclusion implied the Web Console covers snapshot creation directly. Updated those statements to reflect that snapshot creation remains a CLI task in the verified RHEL 9 documentation.

## Review Notes
The core installation commands for `cockpit`, `cockpit-storaged`, `stratisd`, `stratis-cli`, `cockpit.socket`, `stratisd`, and firewalld are consistent with RHEL 9 documentation. The article is accurate after the corrections above, with the caveat that Cockpit UI labels can vary slightly across RHEL minor releases.
