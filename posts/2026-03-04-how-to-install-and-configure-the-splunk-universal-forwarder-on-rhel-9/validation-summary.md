# Validation Summary: How to Install and Configure the Splunk Universal Forwarder on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Splunk Universal Forwarder
- Splunk CLI
- systemd
- firewalld

## Sources Consulted
- Splunk Universal Forwarder Manual: Install a *nix universal forwarder: https://help.splunk.com/en/splunk-cloud-platform/forward-and-process-data/universal-forwarder-manual/9.1/install-the-universal-forwarder/install-a-nix-universal-forwarder
- Splunk Universal Forwarder Manual: Configure forwarding with outputs.conf: https://help.splunk.com/en/splunk-cloud-platform/forward-and-process-data/universal-forwarder-manual/9.1/forward-data/configure-forwarding-with-outputs.conf
- Splunk Universal Forwarder Manual: Start or stop the universal forwarder: https://help.splunk.com/en/splunk-cloud-platform/forward-and-process-data/universal-forwarder-manual/9.1/configure-the-universal-forwarder/start-or-stop-the-universal-forwarder
- Splunk Universal Forwarder Manual: Enable a receiver for Splunk Enterprise: https://help.splunk.com/en/splunk-cloud-platform/forward-and-process-data/universal-forwarder-manual/9.1/configure-the-universal-forwarder/enable-a-receiver-for-splunk-enterprise
- Splunk documentation: Monitor files and directories with the CLI: https://docs.splunk.com/Documentation/SplunkCloud/latest/Data/MonitorfilesanddirectoriesusingtheCLI
- Splunk documentation: Run Splunk Enterprise as a systemd service: https://docs.splunk.com/Documentation/Splunk/9.4.2/Admin/RunSplunkassystemdservice
- Splunk Universal Forwarder downloads page: https://www.splunk.com/en_us/download/universal-forwarder.html
- Red Hat documentation: Using and configuring firewalld: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters

## Issues Found
- The RPM download URL used `splunkforwarder-9.1.0-x86_64.rpm`, which does not match Splunk's published RPM naming convention because Splunk release artifacts include a build hash. Updated the command to a current published Splunk Universal Forwarder RPM URL.
- The Linux install steps omitted ownership correction for `/opt/splunkforwarder`. Added `chown -R splunkfwd:splunkfwd /opt/splunkforwarder`, matching Splunk's Linux forwarder installation guidance for the least-privileged `splunkfwd` user.
- The systemd boot-start command was shown while the forwarder was already running and omitted the group. Added `splunk stop` before `enable boot-start` and included `-group splunkfwd`, matching Splunk's systemd guidance.
- The firewall section implied opening TCP 9997 on the RHEL forwarder host. TCP 9997 is the conventional receiver/indexer listening port, so the firewalld commands were clarified as receiver-side commands.

## Review Notes
The `add forward-server`, `add monitor`, `list forward-server`, and `list monitor` CLI examples match Splunk CLI documentation. The example assumes the target `main` index exists and that the Splunk receiver/indexer is already configured to listen on TCP 9997.
