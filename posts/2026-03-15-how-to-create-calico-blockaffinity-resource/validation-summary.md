# Validation Summary: How to Create the Calico BlockAffinity Resource

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source and Calico IPAM
- Calico BlockAffinity resources
- Calico IPPool resources
- calicoctl
- Kubernetes and kubectl

## Sources Consulted
- Calico Open Source IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BlockAffinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico Open Source calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico calicoctl ipam check reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/check
- Calico calicoctl ipam release reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/release
- Calico Open Source datastore migrate lock reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico Open Source datastore migrate unlock reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock

## Issues Found
- The post described Calico as always allocating from a node-affine block and creating a new block when none exists. Calico documentation states that Calico tries to allocate from an associated block, creates blocks as needed, and can also allocate borrowed IPs from blocks associated with other nodes. Updated the introduction to reflect that behavior.
- The post referred to a Calico IPAM controller for BlockAffinity creation. Official documentation describes BlockAffinity resources as managed by Calico IPAM. Updated the wording to avoid implying a separate controller flow.
- The BlockAffinity state list omitted `pending`. Updated the key field description to include `confirmed`, `pending`, and `pendingDeletion`.
- The `blockSize` explanation could be read backwards because Calico's field is a CIDR prefix length. Updated the explanation to clarify that `/24` creates larger blocks and `/28` creates smaller blocks.
- The cleanup sections treated `ipam check` and `ipam release --from-report` as general stale-block garbage collection. Official CLI documentation describes this workflow as checking IPAM consistency and releasing leaked addresses. Updated the text accordingly.
- The leaked-address cleanup examples omitted the documented datastore lock/unlock workflow. Added `calicoctl datastore migrate lock` and `calicoctl datastore migrate unlock` around the check and release commands.

## Review Notes
BlockAffinity resources are read/list/watch resources according to the official reference; direct create, update, and delete operations are not supported. Future revisions could make that explicit near the schema section because the post title may otherwise imply manual creation.
