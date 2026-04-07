# Validation Summary: How to Understand Red Hat Ceph Storage vs Upstream Ceph

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- Ceph (upstream open-source project)
- Red Hat Ceph Storage (RHCS)
- cephadm (Ceph deployment tool)
- apt / dnf package management
- subscription-manager (RHEL)
- Red Hat Insights

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/
- Ceph installation guide: https://docs.ceph.com/en/reef/install/
- cephadm bootstrap documentation: https://docs.ceph.com/en/reef/cephadm/install/
- Red Hat Ceph Storage product documentation: https://access.redhat.com/documentation/en-us/red_hat_ceph_storage/
- Debian/Ubuntu apt-key deprecation notice: https://wiki.debian.org/DebianRepository/UseThirdParty

## Issues Found
1. **Deprecated `apt-key` usage**: The upstream Ceph repository setup used `curl -L ... | sudo apt-key add -`, which relies on the deprecated `apt-key` command (removed in recent Debian/Ubuntu releases). Replaced with the modern `gpg --dearmor` approach using `/etc/apt/keyrings/` and the `signed-by` option in the sources list entry.

## Review Notes
- The RHCS version mapping (RHCS 6 = Reef, RHCS 5 = Pacific) is accurate as of the time of writing.
- The cephadm download URL for upstream (`https://download.ceph.com/rpm-reef/el9/noarch/cephadm`) is specific to RHEL 9 / EL9. Users on other distributions would need to adjust the path accordingly.
- The `--registry-url registry.redhat.io` flag in the RHCS bootstrap command is correct — Red Hat hosts its container images on registry.redhat.io and authentication is required.
- The post's claim that upstream releases have ~2 years of support per release is reasonable, though exact support windows vary by release.
