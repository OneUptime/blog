# Validation Summary: How to use iperf for measuring network throughput between pods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes Services
- Kubernetes NetworkPolicy
- Kubernetes Jobs
- Kubernetes DaemonSets
- iperf3
- jq

## Sources Consulted
- iperf3 official documentation and manual page: https://software.es.net/iperf/invoking.html
- iperf3 official project repository: https://github.com/esnet/iperf
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes container command and arguments documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found
- The basic TCP test description said it reports throughput in both directions. iperf3's default mode sends test data from client to server and reports sender-side and receiver-side summaries for that direction. Updated the wording to avoid implying bidirectional traffic.
- The bidirectional example used `-d`, which is the iperf3 debug flag, not dual-test mode. Replaced it with `--bidir`, the iperf3 option for simultaneous client-to-server and server-to-client testing.
- The packet-size section described `-M 9000` as testing with a 9000 byte MTU. iperf3 `-M` sets TCP/SCTP MSS, documented as MTU minus 40 bytes, and UDP payload size is controlled with `-l`. Updated the section to use UDP `-l 1472` and TCP `-M 8960` for a 9000 byte IPv4 MTU example.
- The client Pod did not have the `app: iperf-client` label required by the NetworkPolicy example's ingress `podSelector`. Added the label to the client Pod examples.
- The automated testing section described a Kubernetes `Job` as running periodic throughput tests. A Job runs tasks to completion once; periodic scheduling would require a CronJob. Updated the wording to describe a one-time Job.
- The automated Job parsed JSON with `jq` while using the `networkstatic/iperf3` image, which should not be assumed to include `jq`. Switched the Job to `alpine:3.20` and installed `iperf3` and `jq` in the script before running tests.
- The DaemonSet used `hostNetwork: true` while describing pod network testing, and added `NET_ADMIN` even though iperf3 server mode does not require it. Updated the comment to clarify that host networking measures the node network path and removed the unnecessary capability.

## Review Notes
The Kubernetes API versions used in the manifests are current. The examples use `nodeName` for direct node placement, which is valid but bypasses the scheduler; Kubernetes documentation recommends node affinity or `nodeSelector` for most ordinary node-placement cases.
