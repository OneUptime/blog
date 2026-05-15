# Validation Summary: How to Set Up Satellite Capsule Server for Remote Locations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Satellite 6.15
- Red Hat Satellite Capsule Server
- Red Hat Enterprise Linux 8
- Hammer CLI
- subscription-manager
- firewalld

## Sources Consulted
- Red Hat Satellite 6.15 Installing Capsule Server: https://docs.redhat.com/en/documentation/red_hat_satellite/6.15/html-single/installing_capsule_server/index
- Red Hat Satellite 6.15 Managing hosts, registering hosts to Satellite or Capsule Server: https://docs.redhat.com/en/documentation/red_hat_satellite/6.15/html/managing_hosts/registering_hosts_to_server_managing-hosts
- Red Hat Satellite 6.15 Hammer CLI Guide, Capsule content commands: https://docs.redhat.com/en/documentation/red_hat_satellite/6.15/html-single/hammer_cli_guide/index
- Red Hat Satellite Product Life Cycle: https://access.redhat.com/support/policy/updates/satellite

## Issues Found
- The prerequisites incorrectly said Satellite Capsule 6.15 could be installed on RHEL 8 or 9 with 20 GB RAM. Red Hat's 6.15 Capsule documentation supports the latest RHEL 8 release and lists a minimum 4-core 2.0 GHz CPU, 12 GB RAM, and 4 GB swap recommendation, so the prerequisite was corrected.
- The repository examples used RHEL 9 repository IDs for Satellite Capsule 6.15. Red Hat documents RHEL 8 BaseOS, AppStream, Satellite Capsule 6.15 for RHEL 8, and Satellite Maintenance 6.15 for RHEL 8 repositories, so the repository IDs were corrected.
- The Capsule repository setup omitted enabling the `satellite-capsule:el8` module and updating packages before installation. These steps were added to match Red Hat's installation procedure.
- The Capsule host registration example used a direct `subscription-manager register` command without the documented Satellite host-registration flow. It was changed to generate and run a `hammer host-registration generate-command` registration command.
- The lifecycle environment assignment used environment names directly. The official Capsule content procedure has administrators list available lifecycle environments and add them by `--lifecycle-environment-id`, so the example was corrected.
- The firewall example included port 5647 and persistent port commands that did not match the documented Capsule 6.15 firewall procedure. It was replaced with the documented `firewall-cmd` service and port commands followed by `--runtime-to-permanent`.
- The host registration section used the deprecated Katello CA Consumer RPM flow and also saved an RPM as a `.pem` file. It was replaced with the recommended global registration command generated with `hammer host-registration generate-command --smart-proxy-id`.

## Review Notes
Satellite 6.15 is version-specific and Red Hat's lifecycle policy expects Satellite and Capsule servers to be kept on supported minor releases. Future updates should consider refreshing the article for the currently supported Satellite release and its matching RHEL base OS requirements.
