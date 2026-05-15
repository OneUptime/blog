# Validation Summary: How to Plan and Design an IdM Deployment on RHEL 9

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Red Hat Identity Management
- FreeIPA
- 389 Directory Server
- MIT Kerberos
- Dogtag Certificate System
- BIND DNS
- SSSD
- chronyd

## Sources Consulted
- Red Hat Enterprise Linux 9 Planning Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/planning_identity_management/
- Red Hat Enterprise Linux 9 Installing Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_identity_management/
- Red Hat Enterprise Linux 9 Preparing for disaster recovery with Identity Management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/preparing_for_disaster_recovery_with_identity_management/
- FreeIPA DNS Location Mechanism documentation: https://www.freeipa.org/page/V4/DNS_Location_Mechanism

## Issues Found
- The replication guidance said not to create more than four replication agreements per server. Red Hat documents this as a maximum recommendation, but not a hard requirement, with exceptions for failover paths and larger deployments. Updated the wording to include that caveat.
- The external DNS example omitted `_kerberos-master._tcp` and `_kpasswd._tcp` SRV records, and did not state that each IdM server needs equivalent SRV records with resolvable target hostnames. Added the missing records and a note about A/AAAA and reverse DNS.
- The sizing table and disk-layout estimate understated documented entry size and did not align with Red Hat's RAM examples. Updated the user-count ranges, RAM guidance, and entry-size estimate to match Red Hat's 4 GB RAM for 10,000 users and 100 groups, 16 GB RAM for 100,000 users and 50,000 groups, and 5-10 KB per basic user or host entry with a certificate.
- The CA section described "External CA" too broadly. Clarified that IdM can use an externally signed IdM CA or be installed without an integrated CA.
- The firewall table listed UDP 123 as an IdM server port. RHEL 9 IdM configures `chronyd` as an NTP client and no longer provides the IdM NTP server role. Removed the port from the server firewall table and added a time-synchronization note.

## Review Notes
The backup commands are valid, but `ipa-backup` normally requires root privileges and offline backups stop IdM services. Future revisions could mention `ipa-backup --data --online` when downtime is not acceptable.
