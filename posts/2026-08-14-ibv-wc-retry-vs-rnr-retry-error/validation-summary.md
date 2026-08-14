# Validation Summary: Diagnose IBV_WC_RETRY_EXC_ERR and RNR Retry Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- RDMA Verbs and libibverbs work completions
- Reliable Connected queue pairs
- InfiniBand and RoCE
- Transport retry and Receiver Not Ready NAK handling
- Receive queues and shared receive queues
- RDMA Connection Manager
- Linux rdma-core, iproute2 RDMA tools, and InfiniBand sysfs counters

## Sources Consulted
- rdma-core `ibv_poll_cq(3)` completion-field contract: https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/libibverbs/man/ibv_poll_cq.3
- rdma-core verbs definitions and QP attributes: https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/libibverbs/verbs.h and https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/libibverbs/man/ibv_modify_qp.3
- rdma-core RDMA CM connection parameters: https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/librdmacm/rdma_cma.h and https://man7.org/linux/man-pages/man3/rdma_connect.3.html
- Current rdma-core `rping` connection and receive-posting flow: https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/librdmacm/examples/rping.c
- Linux RDMA work-completion status strings: https://github.com/torvalds/linux/blob/2f1baf1fc8929e6c48370be543ad028ac7ad4131/drivers/infiniband/core/verbs.c
- Linux Soft-RoCE requester retry and RNR handling: https://github.com/torvalds/linux/blob/2f1baf1fc8929e6c48370be543ad028ac7ad4131/drivers/infiniband/sw/rxe/rxe_comp.c
- Linux Soft-RoCE responder handling for receive WQEs, MTU errors, and RNR NAKs: https://github.com/torvalds/linux/blob/2f1baf1fc8929e6c48370be543ad028ac7ad4131/drivers/infiniband/sw/rxe/rxe_resp.c
- Linux stable InfiniBand sysfs ABI: https://github.com/torvalds/linux/blob/2f1baf1fc8929e6c48370be543ad028ac7ad4131/Documentation/ABI/stable/sysfs-class-infiniband
- iproute2 `rdma link` and resource command documentation/parser: https://github.com/iproute2/iproute2/blob/main/man/man8/rdma-link.8 and https://github.com/iproute2/iproute2/blob/main/rdma/res.c
- rdma-core `ibv_devinfo(1)` manual: https://github.com/linux-rdma/rdma-core/blob/a4b8d50e6357a4a581347111396fc8218cad838c/libibverbs/man/ibv_devinfo.1
- NVIDIA RDMA Aware Networks Programming User Manual: https://docs.nvidia.com/rdma-aware-networks-programming-user-manual-1-7.pdf
- NVIDIA RoCEv1/RoCEv2 encapsulation and routing documentation: https://docs.nvidia.com/networking/display/mlnxenv23102131201lts/rdma-over-converged-ethernet-roce.pdf
- `saquery(8)` Subnet Administration and PathRecord documentation: https://man7.org/linux/man-pages/man8/saquery.8.html
- NVM Express RDMA Transport Specification 1.0d RNR retry semantics: https://nvmexpress.org/wp-content/uploads/NVM-Express-RDMA-Transport-Specification-1.0d-2024.07.01-Ratified.pdf

## Issues Found
- The transport-retry explanation implied that retry exhaustion only follows a missing ACK or response. A PSN sequence-error NAK or implied sequence error can also consume the transport retry counter. The introduction, detailed explanation, comparison table, and conclusion now describe failure to make forward progress rather than claiming that no response arrived.
- The RNR explanation treated a missing receive WQE as a fact established by the completion. The completion establishes that one or more RNR NAKs exhausted the configured policy. A missing receive WQE is the usual cause for Send and RDMA Write with Immediate, but implementations can report other temporary responder-resource conditions as RNR. The post now requires opcode correlation before diagnosing receive credits.
- The post said the requester retried repeatedly before RNR exhaustion. With `rnr_retry = 0`, the first RNR NAK can fail the work request. The affected wording and comparison table now say “one or more” RNR NAKs.
- A large finite RNR retry value was said to cause an indefinite hang. The post now states precisely that `rnr_retry = 7` selects infinite RNR retries, while finite settings can delay error detection but eventually exhaust.
- The transport-retry cause list treated an endpoint path-MTU mismatch as a normal retry-exhaustion cause and included a stalled remote process. An exercised QP MTU mismatch normally produces an Invalid Request NAK and `IBV_WC_REM_INV_REQ_ERR`, while an ordinary userspace stall more commonly drains receive credits and produces RNR. The list now distinguishes a route that cannot carry the configured MTU and limits the liveness cause to the remote host or HCA.
- The two displayed `counters` filenames were described as driver-dependent even though they are stable Linux sysfs ABI names. The post now distinguishes standard `counters` from optional driver-dependent `hw_counters`.
- The network checklist applied IP routing to all RoCE traffic and referred to “SM path records.” It now limits IP routing to RoCEv2 and uses the correct Subnet Administration term, SA PathRecords.

## Review Notes
- The C logging snippet uses the current, non-deprecated `ibv_wc_status_str()` API and valid format specifiers, assuming the normal `<stdio.h>`, `<inttypes.h>`, and `<infiniband/verbs.h>` headers. Its restriction to `wr_id`, `status`, `qp_num`, and `vendor_err` on failed completions exactly matches `ibv_poll_cq(3)`.
- `rdma link show`, `ibv_devinfo`, `rdma resource show qp`, and both displayed sysfs counter paths are valid. Every external URL in the post returned HTTP 200 and pointed to the described material during review.
- QP `timeout` and `min_rnr_timer` are encoded values rather than literal durations. In particular, zero has special meanings. The post correctly recommends logging exact values, but those values should be decoded before comparing them with measured time.
- In RDMA CM, `retry_count` is ignored by `rdma_accept()`, while `rnr_retry_count` governs retries by the remote sender. The post only claims that the initiating `rping` path sets both, which is correct.
- The InfiniBand RNR retry encoding reserves 7 for infinite retries; this should not be generalized to the ordinary transport retry counter. Current Linux Soft-RoCE unusually treats 7 as non-decrementing for both counters, so provider behavior should be checked when exact failure timing matters.
- The post's GitHub `master` links are moving references, and the NVIDIA version 1.7 programming manual is older, but all were reachable and technically applicable at validation time.
