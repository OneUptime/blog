# Validation Summary: How to Set Up Ceph as OpenStack Glance Image Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD block storage)
- OpenStack Glance (image service)
- OpenStack Nova (compute, for COW boot verification)
- `ceph` CLI (pool creation, auth management)
- `rbd` CLI (pool init, image listing/info)
- `qemu-img` (image format conversion)
- OpenStack CLI (`openstack image create`, `openstack server create`)

## Sources Consulted
- Ceph documentation: Pool creation and management (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph documentation: User management and auth capabilities (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- OpenStack Glance documentation: Configuration reference for `[glance_store]` RBD options (https://docs.openstack.org/glance/latest/configuration/configuring.html)
- OpenStack Glance documentation: `[image_format]` section for `disk_formats` option (https://docs.openstack.org/glance/latest/configuration/glance_api.html)
- OpenStack Nova documentation: Ceph RBD ephemeral storage and COW cloning behavior (https://docs.openstack.org/nova/latest/admin/configuration/hypervisor-kvm.html)

## Issues Found
1. **`disk_formats` in wrong config section**: The `disk_formats` option was placed under `[DEFAULT]` but in modern OpenStack Glance (Queens and later), this option belongs in the `[image_format]` section. Changed `[DEFAULT]` to `[image_format]`.

## Review Notes
- The `[glance_store]` configuration uses the classic single-store approach. Modern OpenStack (Victoria+) supports a multi-store backend configuration, but the single-store approach shown remains valid and functional.
- The Glance service name `openstack-glance-api` is Red Hat/CentOS convention. On Ubuntu/Debian systems, the service is typically named `glance-api`. The post does not specify a distro, which is acceptable for a general guide.
- The Nova ephemeral pool is shown as `vms`, which is a common convention but is configurable. Readers may need to adjust this to match their Nova configuration (e.g., `nova` is another common pool name).
- The `disk_formats` snippet lists all commonly accepted formats. It does not by itself force images to be raw; it only controls which formats are accepted for upload. The actual enforcement of raw format is handled correctly in Step 5 by converting and uploading as raw.
