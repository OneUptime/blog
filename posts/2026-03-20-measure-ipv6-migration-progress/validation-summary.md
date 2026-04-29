# Validation Summary: How to Measure IPv6 Migration Progress

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS AAAA records
- Prometheus / PromQL
- Kubernetes
- Bash
- Python
- GNU grep

## Sources Consulted
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- dnspython resolver documentation: https://dnspython.readthedocs.io/en/latest/resolver-functions.html
- dnspython installation documentation: https://dnspython.readthedocs.io/en/2.7/installation.html
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/3.4/querying/functions/
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Python `socket` module documentation: https://docs.python.org/3.11/library/socket.html
- Python `pathlib` documentation: https://docs.python.org/3.11/library/pathlib.html
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html

## Issues Found
- The DNS example used `dnspython` without identifying it as an external dependency. I added a `pip install dnspython` note so the snippet is runnable as written.
- The PromQL section presented `ip_version="ipv6"` as if it were a generic built-in label and set a fixed `40%+ within 6 months` target. I clarified that the query is an example that depends on your metric labels and changed the target guidance to be user-base specific.
- The Kubernetes readiness script counted Services by `ipFamilyPolicy`, which can report `PreferDualStack` even when a Service is only assigned one address family. I changed the check to count Services with more than one entry in `.spec.clusterIPs`, which matches actual dual-stack assignment.
- The application readiness score treated `::` versus `0.0.0.0` as if that alone determined IPv6 support. Python’s socket docs make clear that dual-stack behavior depends on socket family and dual-stack settings, not just the literal bind address. I changed this check to a heuristic for explicit IPv4-only bind addresses and updated the issue text accordingly.
- The `0.0.0.0` grep was a plain substring search, which could falsely match addresses like `10.0.0.0`. I changed it to an anchored regex.
- The IPv6 test discovery only looked for `test_*.py`, which missed other common Python, Go, and JavaScript test naming patterns. I broadened the patterns and made file reads tolerant of encoding issues.
- The `AF_INET` check claimed to detect `AF_INET without AF_INET6`, but the code actually flagged any `AF_INET` occurrence. I replaced it with a file-based heuristic that only flags Python files using `AF_INET` without `AF_INET6` or `AF_UNSPEC`.
- The conclusion described AAAA coverage as “services reachable via IPv6,” which is broader than what RFC 3596 defines. I corrected this to “services publishing AAAA records.”

## Review Notes
- The PromQL example is still illustrative. Teams need request metrics that expose an IP-family label, or an equivalent way to separate IPv4 and IPv6 traffic.
- The dashboard numbers are example placeholders rather than universal targets; real IPv6 traffic goals depend on audience, geography, access networks, and application type.
