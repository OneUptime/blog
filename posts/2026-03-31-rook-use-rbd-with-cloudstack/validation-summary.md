# Validation Summary: How to Use RBD with CloudStack

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Apache CloudStack (RBD primary storage, KVM hypervisor)
- Ceph RBD via Rook-Ceph (pool creation, cephx auth, mon dump)
- CloudMonkey (`cmk`) CLI
- libvirt / QEMU Ceph client integration

## Sources Consulted
- Ceph docs "Block Devices and CloudStack" — https://docs.ceph.com/en/reef/rbd/rbd-cloudstack/ (pool creation `ceph osd pool create` + `rbd pool init`, `ceph auth get-or-create client.cloudstack mon 'profile rbd' osd 'profile rbd pool=cloudstack'`, RADOS Pool/User/Secret semantics, libvirt 0.9.13+ requirement, username without `client.` prefix)
- Apache CloudStack 4.x Configuration guide / Working with Storage — https://docs.cloudstack.apache.org/en/latest/installguide/configuration.html (RBD primary storage parameters: RADOS Monitor, Pool, User, Secret; round-robin DNS for MONs)
- CloudStack createStoragePool RBD URL format references — https://docs.cloudstack.apache.org/en/4.21.0.0/installguide/configuration.html and CLOUDSTACK-9309 (`rbd://<monitor>/<pool>` basic URL form, `provider=DefaultPrimary`)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- Ceph user caps `mon 'profile rbd'` and `osd 'profile rbd pool=cloudstack'` match the official Ceph CloudStack documentation exactly.
- `ceph osd pool create cloudstack 128 replicated` and `rbd pool init cloudstack` are valid; pg_num plus pool type is acceptable syntax.
- The CloudStack Add Primary Storage fields (Protocol RBD, Server, Port 6789, Pool, Username = `cloudstack` without the `client.` prefix, AuthSecret = the cephx key) align with the documented RADOS Monitor/Pool/User/Secret mapping.
- The CloudMonkey `cmk create storagepool ... url="rbd://192.168.1.10/cloudstack" provider=DefaultPrimary` is consistent with the documented `rbd://<monitor>/<pool>` URL form and the DefaultPrimary provider. Note (left as-is, not an error): for non-UI provisioning some deployments embed credentials as `rbd://<user>:<secret>@<monitor>/<pool>`, and secrets containing special characters must be URL-encoded (CLOUDSTACK-9309); the simple form shown is valid when credentials are supplied separately.
- `rbd feature enable cloudstack/<image> layering` is valid; `layering` is required for RBD clone-based fast templating, matching CloudStack's clone behavior.
- Mon endpoint port 6789 (Ceph v1 messenger) is correct for the legacy/`mon_host` config shown; this was left as-is since CloudStack/libvirt RBD typically uses the v1 port.
