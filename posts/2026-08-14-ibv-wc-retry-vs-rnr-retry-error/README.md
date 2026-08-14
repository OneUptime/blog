# Diagnose IBV_WC_RETRY_EXC_ERR and RNR Retry Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RDMA Verbs, Queue Pair, IBV_WC_RETRY_EXC_ERR, RNR, InfiniBand, RDMA

Description: Distinguish transport retry exhaustion from receiver-not-ready exhaustion, identify the evidence each completion provides, and debug both queue-pair peers without blaming the wrong host.

---

Both `IBV_WC_RETRY_EXC_ERR` and `IBV_WC_RNR_RETRY_EXC_ERR` appear in a send completion queue after a reliable-connected queue pair exhausts a retry policy. They do not mean the same thing:

- `IBV_WC_RETRY_EXC_ERR` means the transport retry counter was exceeded because the requester did not receive the required response.
- `IBV_WC_RNR_RETRY_EXC_ERR` means the RNR retry counter was exceeded after the responder reported Receiver Not Ready.

The completion is local to the work request that failed, but the cause may be on either endpoint or anywhere on the path. The status narrows the investigation; it does not identify a guilty machine by itself.

## First Preserve the Failing Completion

Log the first non-success work completion before teardown floods the CQ with secondary errors:

~~~c
fprintf(stderr,
        "wc: status=%s (%d) wr_id=%" PRIu64
        " qp=%u vendor_err=0x%x\n",
        ibv_wc_status_str(wc.status), wc.status, wc.wr_id,
        wc.qp_num, wc.vendor_err);
~~~

For an unsuccessful completion, the `ibv_poll_cq()` contract guarantees only `wr_id`, `status`, `qp_num`, and `vendor_err`. Do not read `opcode`, `byte_len`, or other completion fields after an error. Instead, use `wr_id` to find the application's record of the submitted operation, buffer, peer, and sequence number.

Capture both peers' QP state and logs at the same time. Once a QP enters error, later outstanding work requests are commonly completed with `IBV_WC_WR_FLUSH_ERR`; those flushed completions are consequences, not the original network diagnosis.

## What Transport Retry Exhaustion Tells You

For reliable-connected transport, the requester expects acknowledgements or responses. `IBV_WC_RETRY_EXC_ERR` says those did not arrive before the configured transport retry budget expired.

Investigate conditions that can prevent a usable response:

- the remote QP does not exist, was destroyed, or is not in a compatible state;
- connection metadata contains the wrong remote QP number, PSN, LID, GID, or port;
- source and destination disagree about path attributes such as P_Key, service level, MTU, or GID context;
- a native InfiniBand path or RoCE route is broken in one direction;
- the remote process, host, or HCA stopped making progress;
- fabric congestion or packet loss exceeds the configured retry tolerance;
- the QP was modified with an unexpectedly small timeout or retry count.

This status does **not** prove the local transmit port is faulty. It only proves that the local requester exhausted its retry behavior for that work request.

Check both ends:

~~~console
$ rdma link show
$ ibv_devinfo
$ rdma resource show qp
$ cat /sys/class/infiniband/mlx5_0/ports/1/counters/port_xmit_discards
$ cat /sys/class/infiniband/mlx5_0/ports/1/counters/port_rcv_errors
~~~

Counter filenames vary by driver and kernel. Take before/after deltas around one reproducer rather than treating a lifetime nonzero count as causation. For RoCE, include netdev/VLAN/IP routing and Ethernet switch counters; for native InfiniBand, include SM path records, LIDs, GIDs, P_Keys, and switch ports.

## What RNR Retry Exhaustion Tells You

RNR is more specific. The responder was reachable enough to return an RNR NAK, but it did not have a receive work queue entry available for an operation that requires one. The requester retried and eventually exhausted its `rnr_retry` policy.

Focus first on receive-credit management at the responder:

- receives were posted after sends could arrive;
- the receive queue or shared receive queue drained under burst load;
- reposting stopped because its completion thread stalled or failed;
- the sender and receiver disagree about message count or protocol phase;
- several QPs share an SRQ whose aggregate demand was underestimated;
- a receive-post operation failed and its return code was ignored;
- the wrong QP/SRQ received the connection.

Send operations consume receive WQEs. RDMA Write with Immediate also creates a receive-side completion and requires receive-side resources; plain RDMA Write does not consume a posted receive in the same way. Always correlate the submitted operation recorded for `wr_id` and the application protocol instead of assuming every RDMA operation needs an RQ entry.

Instrument receive credits explicitly:

~~~text
posted_receives_total
receive_completions_total
current_receive_credits
minimum_receive_credits
post_recv_failures_total
srq_limit_events_total
~~~

Post the initial receive window before allowing the peer to send. Replenish in batches early enough to cover scheduling latency and the maximum in-flight burst. Increasing `rnr_retry` can make a transient scheduling pause survivable, but an infinite or very large retry policy can turn a missing receive into an indefinite hang. Fix the credit bug first.

## Compare the Two Errors

| Evidence | `IBV_WC_RETRY_EXC_ERR` | `IBV_WC_RNR_RETRY_EXC_ERR` |
| --- | --- | --- |
| Required response observed | no usable ACK/response before retry exhaustion | explicit RNR response was observed |
| Strongest first hypothesis | path, remote QP/state, addressing, or remote liveness | responder receive queue/SRQ had no WQE |
| First place to inspect | both QPs and both directions of the path | responder's receive-credit logic |
| Useful “fix” | correct connection/path/state; then tune timeout if justified | post/replenish receives; then tune RNR retry if justified |
| Common misleading action | repeatedly increasing retry count | adding fabric retries or replacing a cable |

An RNR response is evidence that at least part of the return path worked at that moment. It does not prove the fabric is perfect, and transport retry exhaustion does not prove packets never reached the responder.

## Inspect the QP Retry Configuration

The relevant RC QP attributes include timeout, retry count, minimum RNR timer, and RNR retry count. With RDMA CM, `struct rdma_conn_param` includes `retry_count` and `rnr_retry_count`; the rdma-core `rping` example sets both when initiating a connection.

If the application modifies the QP directly, log the exact values used during the RTR and RTS transitions. Do not assume library defaults are identical across connection managers or versions. A configuration copied from a latency benchmark may fail under production scheduling pauses; a configuration copied from a storage stack may hide an application deadlock for too long.

Change retry settings only after measuring:

- worst-case fabric round-trip and congestion behavior;
- receive repost latency under CPU contention;
- application deadline and failure-detection requirements;
- how connection recovery occurs after QP error.

## Reproduce Without Creating More Ambiguity

1. Reduce to one QP and one peer.
2. Assign sequence numbers to every send and receive.
3. Post and log the initial receive depth before connecting or signalling readiness.
4. Capture the first failing WC and all verbs return codes.
5. Snapshot QP states and port counters on both hosts.
6. Verify exchanged QPN, PSN, LID/GID, P_Key, port, MTU, and memory keys.
7. Add load back gradually: more QPs, SRQ sharing, CPU contention, then real message bursts.

For an RNR reproducer, deliberately delay receive posting in a lab to verify observability. For a transport retry reproducer, do not disrupt a shared fabric; use an isolated QP and controlled endpoint teardown.

## Official Documentation

- [rdma-core: ibv_poll_cq work-completion statuses](https://man7.org/linux/man-pages/man3/ibv_poll_cq.3.html)
- [Linux RDMA core: official work-completion status messages](https://github.com/torvalds/linux/blob/master/drivers/infiniband/core/verbs.c)
- [rdma-core: connection parameters including retry and RNR retry counts](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/rdma_cma.h)
- [rdma-core rping: reference connection and receive-posting flow](https://github.com/linux-rdma/rdma-core/blob/master/librdmacm/examples/rping.c)
- [NVIDIA RDMA Aware Networks Programming User Manual](https://docs.nvidia.com/rdma-aware-networks-programming-user-manual-1-7.pdf)

## Conclusion

Transport retry exhaustion says the requester never obtained the required response; RNR retry exhaustion says it repeatedly received “receiver not ready.” Start the former investigation with both QPs and the complete path. Start the latter with receive WQEs, SRQ credits, and reposting on the responder. Preserve the first WC, because the flushed completions that follow usually describe teardown, not the root cause.
