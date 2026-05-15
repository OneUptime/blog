# Validation Summary: How to Plan and Execute a Migration from CentOS Stream 8 to RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux 8
- CentOS Stream 8
- Convert2RHEL
- DNF/YUM package management
- Red Hat Subscription Manager
- EPEL
- Leapp

## Sources Consulted
- Red Hat documentation: Converting from a Linux distribution to RHEL using the Convert2RHEL utility: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/index
- Red Hat documentation: Converting using the command line: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/converting_from_a_linux_distribution_to_rhel_using_the_convert2rhel_utility/converting-using-the-command-line_converting-from-a-linux-distribution-to-rhel
- Red Hat documentation: Upgrading from RHEL 8 to RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/upgrading_from_rhel_8_to_rhel_9/performing-the-upgrade-from-rhel-8-to-rhel-9_upgrading-from-rhel-8-to-rhel-9
- Red Hat Customer Portal: Red Hat Enterprise Linux Life Cycle: https://access.redhat.com/support/policy/updates/errata
- CentOS Project announcement: CentOS Stream 8 ending May 31, 2024: https://lists.centos.org/hyperkitty/list/announce@lists.centos.org/thread/DS7Q6NQWYD3YXCECJPSAXFFSRSDIJG2Q/
- CentOS Project page: CentOS Linux and Stream end dates: https://www.centos.org/centos-linux/

## Issues Found
- The post said Convert2RHEL supports CentOS Stream 8 to RHEL 8 conversions. Red Hat's current supported conversion paths do not list CentOS Stream 8 as supported; the docs describe CentOS Stream 8 conversion as possible but unsupported. Updated the wording to reflect that distinction.
- The post gave only "May 2024" for CentOS Stream 8 EOL. Updated it to the exact official date, May 31, 2024.
- The Convert2RHEL repository URL used the older `ftp.redhat.com` path. Replaced it with the current Red Hat CDN public repository file URL and added the Red Hat GPG key download step from the official docs.
- The post claimed Convert2RHEL handles newer CentOS Stream packages by mapping to an appropriate RHEL version. Red Hat documents corresponding minor-version conversion for supported paths, but CentOS Stream 8 is unsupported and may fail. Reworded the guidance to tell readers to review the analysis carefully.
- The post recommended manually removing `centos-stream-repos` and `centos-stream-release` before conversion. That can remove the source OS repository metadata Convert2RHEL may need. Replaced it with safer guidance to remove only packages flagged by analysis or official unsupported-conversion guidance.
- The RHEL 8 lifecycle note listed "ELS: May 2032". Current Red Hat lifecycle documentation confirms Full Support ended May 31, 2024 and Maintenance Support ends May 31, 2029, while extended support offerings should be checked on the current lifecycle page. Updated the comment accordingly.

## Review Notes
CentOS Stream 8 conversion remains a higher-risk unsupported path. The post is now technically accurate as a planning guide, but production migrations should still test rollback, backups, third-party packages, and application behavior before running Convert2RHEL on live systems.
