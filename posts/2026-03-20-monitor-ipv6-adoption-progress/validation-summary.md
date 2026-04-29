# Validation Summary: How to Monitor IPv6 Adoption Progress in Your Network

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus / PromQL
- node_exporter (netstat / snmp / snmp6 collectors)
- Bash scripting
- `dig` (BIND DNS utilities)
- Ansible (`ansible.builtin.uri`, `ansible.builtin.template`, `community.general.mail`)
- Grafana (Stat, Time series, Bar gauge panels)
- Prometheus blackbox_exporter (`probe_success`)
- YAML configuration

## Sources Consulted
- node_exporter `netstat_linux.go` collector source — https://github.com/prometheus/node_exporter/blob/master/collector/netstat_linux.go (confirmed metric naming convention `node_netstat_<protocol>_<field>`, e.g., `node_netstat_Ip_InReceives` for IPv4 and `node_netstat_Ip6_InReceives` for IPv6)
- Prometheus HTTP API docs — https://prometheus.io/docs/prometheus/latest/querying/api/ (confirmed that form-urlencoded body parameters require POST; GET requests must use URL query parameters)
- Ansible `ansible.builtin.uri` module documentation
- Ansible `community.general.mail` module documentation
- `dig` man page (BIND 9) — `+short` flag behavior

## Issues Found
1. **Incorrect IPv4 metric name in PromQL queries.** The post used `node_netstat_InReceives` for IPv4 received packets across Steps 1, 2, 4, and 5. node_exporter's `netstat` collector emits IPv4 SNMP metrics under the `Ip` protocol prefix (i.e., `node_netstat_Ip_InReceives`), so the original queries would have returned no series. Replaced every occurrence with the correct metric name `node_netstat_Ip_InReceives`.
2. **Ansible Prometheus query used GET with a form-urlencoded body.** Step 4 sent the PromQL query as the body of a `GET` request. The Prometheus HTTP API only accepts URL-encoded body parameters when the method is `POST`; a `GET` request must place parameters in the URL query string. Changed `method: GET` to `method: POST` so the form-urlencoded body is honored. Also removed the unused `url_username: ""` line, which provided no value (empty basic-auth username).

## Review Notes
- The first PromQL query is a host-coverage proxy — it counts hosts that have *received* any IPv6 packet rather than hosts with an assigned IPv6 address. A node that has IPv6 configured but has not yet seen IPv6 traffic during the evaluation window will not be counted. This is acceptable for an adoption trend, but readers should be aware it is a proxy.
- The traffic-share calculation in Step 2 compares IPv6 packet receives against IPv4 packet receives via `node_netstat_Ip_InReceives`. Note that `Ip_InReceives` counts all IP datagrams received including the IPv4-encapsulated portion of dual-stack hosts, while `Ip6_InReceives` counts only IPv6. The ratio is therefore packet-count based rather than byte-count based, which is fine for a relative trend.
- The `community.general.mail` module's `attach` parameter attaches files but the post body says "Please see the attached IPv6 adoption report" — readers should ensure their mail relay accepts attachments of the produced HTML size.
- `gather_facts: true` is required for `ansible_date_time.date` to be populated; the playbook correctly sets this.
- Bash arithmetic `$(( WITH_AAAA * 100 / TOTAL ))` will do integer division. For small `TOTAL` values this is acceptable, but precision is lost (e.g., 3/5 → 60, 4/5 → 80). Not corrected since it is functionally a stylistic choice and produces a sensible whole-percent value.
