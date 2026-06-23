# Validation Summary: Why a lot of software engineers don't understand networking

## Status
validated

## Post Type
Opinion piece / technical guidance

## Technologies Covered
- OSI model
- IP addressing, CIDR, and private address ranges
- TCP and UDP
- DNS
- HTTP, HTTPS, and TLS
- Network diagnostic tools: `ping`, `traceroute`, `dig`, `curl`, `netstat`, `ss`, `tcpdump`
- Cloud VPC networking
- Distributed systems patterns: timeouts, retries, backoff, jitter, circuit breakers, connection pooling, service discovery, load balancing
- Service meshes: Istio and Linkerd
- Observability and network metrics

## Sources Consulted
- ISO/IEC 7498-1:1994, OSI Basic Reference Model: https://www.iso.org/standard/20269.html
- RFC 791, Internet Protocol: https://www.rfc-editor.org/info/rfc791/
- RFC 1918, Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- RFC 4632, Classless Inter-domain Routing: https://datatracker.ietf.org/doc/html/rfc4632
- RFC 9293, Transmission Control Protocol: https://datatracker.ietf.org/doc/html/rfc9293
- RFC 1034 and RFC 1035, Domain Names: https://www.rfc-editor.org/info/rfc1034/ and https://datatracker.ietf.org/doc/html/rfc1035
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/info/rfc9110/
- RFC 8446, TLS 1.3: https://datatracker.ietf.org/doc/html/rfc8446
- Linux `ping`, `dig`, `curl`, `ss`, and `tcpdump` local help/version output
- Linux `traceroute`, `netstat`, and `ss` manual pages: https://man7.org/linux/man-pages/man8/traceroute.8.html, https://man7.org/linux/man-pages/man8/netstat.8.html, and https://man7.org/linux/man-pages/man8/ss.8.html
- BIND 9 `dig` documentation: https://bind9.readthedocs.io/en/stable/manpages.html
- tcpdump documentation: https://www.tcpdump.org/ and https://www.wireshark.org/docs/wsug_html_chunked/AppToolstcpdump.html
- AWS Builders Library, "Timeouts, retries, and backoff with jitter": https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- AWS Well-Architected Reliability Pillar retry guidance: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_limit_retries.html
- Microsoft Azure Architecture Center, Circuit Breaker pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- AWS VPC documentation: https://docs.aws.amazon.com/vpc/
- Google Cloud VPC documentation: https://docs.cloud.google.com/vpc/docs
- Istio service mesh documentation: https://istio.io/latest/about/service-mesh/
- Linkerd overview: https://linkerd.io/2-edge/overview/
- OpenTelemetry network metrics documentation: https://opentelemetry.io/docs/zero-code/obi/network/

## Issues Found
No technical issues found.

## Review Notes
The post is intentionally high-level and opinionated. It names networking concepts and tools rather than providing executable examples or configuration, so the review focused on whether the referenced protocols, diagnostic tools, cloud networking concepts, and distributed systems patterns were current and technically accurate. `netstat` is older than `ss` on Linux, but mentioning both is acceptable because `netstat` remains documented and commonly encountered.
