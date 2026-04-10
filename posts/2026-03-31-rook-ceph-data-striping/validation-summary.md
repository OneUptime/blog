# Validation Summary: How to Understand Ceph Data Striping (Object Size, Stripe Unit, Stripe Count)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (RADOS, CephFS, RBD)
- Rook-Ceph (Kubernetes operator)
- Kubernetes (kubectl exec into toolbox pod)
- Linux extended attributes (getfattr, setfattr)

## Sources Consulted
- Ceph File Striping documentation: https://docs.ceph.com/en/reef/dev/file-striping/
- CephFS File Layouts documentation: https://github.com/ceph/ceph/blob/main/doc/cephfs/file-layouts.rst
- RBD Man Page: https://docs.ceph.com/en/quincy/man/8/rbd/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Erasure Code documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph Architecture documentation: https://docs.ceph.com/en/latest/architecture/

## Issues Found

### 1. Title and description used "Stripe Width" instead of "Stripe Unit"
- **What was wrong:** The title said "Object Size, Stripe Width, Stripe Count" and the description also referenced "stripe width", but the body of the post correctly discusses "Stripe Unit" as the parameter. In Ceph, the three configurable striping parameters are `object_size`, `stripe_unit`, and `stripe_count`. "Stripe width" is a derived value (`stripe_unit x stripe_count`), not a configurable parameter.
- **What was changed:** Updated the title and description to say "Stripe Unit" instead of "Stripe Width".
- **Why:** To match the actual Ceph parameter name and be consistent with the body of the post.

### 2. Misleading comment on `ceph osd pool get stripe_width` command
- **What was wrong:** The command `ceph osd pool get cephfs-data stripe_width` was labeled "Pool default stripe size", implying it works for any pool. In practice, `stripe_width` only returns a meaningful value for erasure-coded pools. For replicated pools (the typical default for CephFS data pools), it returns 0.
- **What was changed:** Updated the comment from "Pool default stripe size" to "Pool stripe width (erasure-coded pools only)" to clarify the command's applicability.
- **Why:** To prevent readers from running the command on a replicated pool and getting a confusing result of 0.

## Review Notes
- The striping walkthrough example (stripe_unit=1MB, stripe_count=4, object_size=4MB) is accurate and clearly illustrated.
- The CephFS getfattr/setfattr commands use correct syntax and attribute names.
- The RBD create command with --stripe-unit and --stripe-count flags is correct. Note that these flags require format 2 images and automatically enable the STRIPINGV2 feature.
- The claim that "RADOS stores individual objects up to 4 MB in size by default" is a simplification -- RADOS itself can store larger objects (up to 128 MiB by default via `osd_max_object_size`), but CephFS and RBD clients default to splitting data into 4 MiB objects. This is an acceptable simplification for the blog's context.
- The statement that all four objects in a stripe set "land in different PGs" is approximately correct for practical purposes, though technically CRUSH hashing does not guarantee this -- it is overwhelmingly likely with a sufficient PG count.
