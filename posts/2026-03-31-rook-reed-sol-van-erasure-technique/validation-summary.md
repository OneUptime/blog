# Validation Summary: How to Select Erasure Coding Techniques (reed_sol_van) in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (erasure coding subsystem)
- Jerasure plugin (reed_sol_van, reed_sol_r6_op, cauchy_orig, cauchy_good, liberation, blaum_roth, liber8tion)
- ISA-L plugin (reed_sol_van, cauchy)
- Rook (CephBlockPool CRD)
- Kubernetes

## Sources Consulted
- Ceph official documentation on erasure code profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- Ceph ISA plugin documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code-isa/
- Ceph erasure code profile CLI reference: https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Jerasure library documentation and Reed-Solomon coding theory

## Issues Found
No technical errors requiring correction were found. The core Ceph erasure coding content is accurate:

- The list of Jerasure techniques (reed_sol_van, reed_sol_r6_op, cauchy_orig, cauchy_good, liberation, blaum_roth, liber8tion) is correct.
- The ISA-L plugin techniques (reed_sol_van, cauchy) are correct.
- The CLI syntax for `ceph osd erasure-code-profile set` and `get` is correct.
- The explanation of GF(2^w) with default w=8 for reed_sol_van is accurate.
- The recovery property (tolerate up to m failures with k chunks remaining) is correct.
- The XOR-based technique constraints (m=2 only) are correct.

## Review Notes
- The Rook integration section shows creating an erasure code profile manually via the Ceph toolbox and then referencing it via `spec.parameters.erasure_code_profile` in a CephBlockPool CRD. While this pass-through approach may work, the more standard Rook approach is to let Rook manage the erasure code profile automatically using `spec.erasureCoded.dataChunks`, `spec.erasureCoded.codingChunks`, and optionally `spec.erasureCoded.algorithm` to set the technique. Future revisions could show this native Rook approach as the primary method.
- The XOR-based techniques (liberation, blaum_roth, liber8tion) have additional constraints beyond m=2 that are only briefly mentioned as "specific stripe width constraints." For example, liberation requires w to be a prime number with k < w, and blaum_roth requires k+1 to be prime. The post's mention of constraints is accurate but could be more specific in a future revision.
- The comparison table in "Cauchy vs Vandermonde" uses qualitative terms (High/Medium/Low XORs) rather than benchmarks, which is acceptable for a general guide but readers should benchmark their specific k/m combinations.
