# Validation Summary: How to Set Up Ceph RBD as Storage Backend for KVM/QEMU

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephBlockPool CRD)
- Ceph RBD (RADOS Block Device)
- KVM/QEMU virtualization
- libvirt (virsh, secret management, domain XML)
- Kubernetes (kubectl for Rook-Ceph toolbox access)

## Sources Consulted
- Ceph documentation on RBD and authentication: https://docs.ceph.com/en/latest/rbd/
- Ceph auth capabilities documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- libvirt domain XML format specification: https://libvirt.org/formatdomain.html
- libvirt secret XML format: https://libvirt.org/formatsecret.html
- libvirt storage documentation for RBD: https://libvirt.org/storage.html
- Rook CephBlockPool CRD reference: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- virsh command reference: https://libvirt.org/manpages/virsh.html

## Issues Found

1. **Step ordering: libvirt secret must be created before VM definition (Steps 6 and 7 swapped)**
   - **What was wrong:** The original Step 6 defined a VM whose XML referenced a libvirt secret UUID (`YOUR-SECRET-UUID`), but the secret was not created until Step 7. A user following the tutorial sequentially would not have the UUID needed for the VM definition.
   - **What was changed:** Swapped Steps 6 and 7 so the libvirt secret is registered first (new Step 6), and the VM definition that references the secret UUID comes after (new Step 7). Added clarifying text noting the dependency.
   - **Why:** The VM XML requires the secret UUID at definition time. Without creating the secret first, the user cannot fill in the UUID placeholder.

2. **Missing required `<os>` element in libvirt domain XML**
   - **What was wrong:** The domain XML was missing the `<os>` element, which is required by libvirt for KVM domains. Running `virsh define` with this XML would fail with a validation error.
   - **What was changed:** Added the `<os>` element with `<type arch='x86_64'>hvm</type>` to the domain XML.
   - **Why:** The libvirt domain XML schema requires the `<os>` element for KVM guests to specify the boot type. Without it, libvirt rejects the domain definition.

## Review Notes
- The domain XML is intentionally minimal (no boot device, no graphics, no network interface) which is appropriate for a tutorial focused on the RBD disk configuration. Users would add additional devices as needed.
- The `cache='writeback'` setting on the disk driver is valid but users should be aware that `cache='none'` with `io='native'` is often recommended for production RBD workloads for better data safety.
- The `--image-feature layering` flag in `rbd create` explicitly sets only the `layering` feature. Modern Ceph versions enable additional features by default (exclusive-lock, object-map, fast-diff, deep-flatten). The explicit flag is valid and provides broader compatibility.
- The `virsh secret-list | grep ceph | awk '{print $1}'` approach to extract the UUID works but is fragile if multiple ceph secrets exist. For a tutorial context, this is acceptable.
