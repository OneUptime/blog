# Validation Summary: How to Configure DNS Services in IdM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux Identity Management (IdM)
- FreeIPA
- Integrated DNS
- BIND
- DNS zones and resource records
- DNS forwarding
- Dynamic DNS updates

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Working with DNS in Identity Management, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/working_with_dns_in_identity_management/index
- Red Hat Enterprise Linux 8 documentation: Managing Hosts in IdM CLI, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_identity_management/managing-hosts-cli_configuring-and-managing-idm
- Red Hat Enterprise Linux 8 documentation: Installing Identity Management, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/installing_identity_management/index
- FreeIPA API documentation: dnsrecord_add, https://freeipa.readthedocs.io/en/ipa-4-11/api/dnsrecord_add.html
- FreeIPA API documentation: host_del, https://freeipa.readthedocs.io/en/ipa-4-11/api/host_del.html
- FreeIPA documentation: DNS updates and zone transfers with TSIG, https://www.freeipa.org/page/Howto/DNS_updates_and_zone_transfers_with_TSIG.html

## Issues Found
- The post said IdM client DNS updates are handled automatically during client enrollment. Red Hat documents `ipa-client-install --enable-dns-updates` for updating DNS records during enrollment, so the comment was changed to mention that option.
- The post said DNS records are automatically created when hosts are added and cleaned up when hosts are removed. Red Hat documents DNS record creation with `ipa host-add --ip-address` or dynamic DNS updates, and FreeIPA exposes host deletion DNS cleanup through `host-del --updatedns`. The paragraph was updated to state those conditions.

## Review Notes
The DNS zone, record, forwarder, zone-transfer, dynamic-update, and verification commands are consistent with Red Hat IdM DNS documentation and FreeIPA CLI/API behavior. Forward zones are supported, but Red Hat cautions that they should be used only when required because they are not the preferred standard DNS delegation mechanism.
