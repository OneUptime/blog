# How to Give Apps One Stable PostgreSQL Endpoint with HAProxy and Keepalived

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Patroni, HAProxy, Keepalived, High Availability, Failover, Traffic Routing

Description: Combine Patroni-aware HAProxy checks with a Keepalived virtual IP so applications retain one PostgreSQL address through database and proxy failures.

---

Patroni can elect a PostgreSQL primary, but it does not give applications one redundant network address. HAProxy can route new connections to the current primary, but a single HAProxy host is still a single point of failure. Keepalived closes that final gap on a normal layer-2 network by moving a virtual IP (VIP) between two proxy hosts.

The resulting write path is:

```text
application -> postgres-write.example.net -> 10.40.0.20 VIP
            -> active HAProxy -> Patroni primary -> PostgreSQL
```

There are two independent elections here. Patroni, through its distributed configuration store, decides which database node may lead. VRRP, through Keepalived, decides which proxy owns the VIP. Keep those responsibilities separate: Keepalived must never infer the PostgreSQL primary, and HAProxy must never promote PostgreSQL.

## Build the two layers

Assume three Patroni members and two proxy hosts:

| Host | Address | Purpose |
| --- | --- | --- |
| `pg1` | `10.40.0.11` | Patroni REST `8008`, PostgreSQL `5432` |
| `pg2` | `10.40.0.12` | Patroni REST `8008`, PostgreSQL `5432` |
| `pg3` | `10.40.0.13` | Patroni REST `8008`, PostgreSQL `5432` |
| `proxy1` | `10.40.0.21` | HAProxy and Keepalived |
| `proxy2` | `10.40.0.22` | HAProxy and Keepalived |
| write VIP | `10.40.0.20` | Application endpoint |

Create DNS `postgres-write.example.net` pointing only to the VIP. Use a certificate issued by a CA that clients trust and valid for that service name on every possible PostgreSQL primary if clients use `sslmode=verify-full`; HAProxy is forwarding TCP and does not change the database certificate.

Install the same HAProxy configuration on both proxies:

```haproxy
global
    log /dev/log local0

defaults
    mode tcp
    timeout connect 3s
    timeout client  30m
    timeout server  30m
    timeout check   2s

frontend postgres_write
    bind :5000
    default_backend patroni_primary

backend patroni_primary
    option httpchk
    http-check connect port 8008
    http-check send meth GET uri /primary ver HTTP/1.1 hdr Host patroni
    http-check expect status 200
    default-server inter 2s fall 3 rise 2 init-state fully-down on-marked-down shutdown-sessions
    server pg1 10.40.0.11:5432 check
    server pg2 10.40.0.12:5432 check
    server pg3 10.40.0.13:5432 check
```

HAProxy accepts application connections on port `5000` and forwards them to PostgreSQL on port `5432`, while each health check explicitly connects to Patroni on `8008`. `init-state fully-down` keeps servers out of rotation on a fresh start until they pass the configured `rise 2` checks, avoiding a window in which a replica is treated as eligible before the role checks run. Patroni documents `/primary` (and `/read-write`) as the role-aware endpoint for a running primary that holds the leader lock. Do not replace it with a TCP check of `5432`: a healthy replica also listens there.

`on-marked-down shutdown-sessions` intentionally closes HAProxy streams attached to a server when that server becomes `DOWN`. Without it, HAProxy changes where new connections go but existing streams can remain attached to the old node. The interruption is visible to clients, so applications need bounded reconnect logic. Retry an interrupted transaction as a whole only when its outcome is known or the operation is idempotent or deduplicated; a lost connection around a write or `COMMIT` can leave the outcome unknown.

Validate the file before reloading one proxy at a time:

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg
systemctl reload haproxy
```

## Move the VIP only between usable proxies

Keepalived's `vrrp_instance` owns the VIP. A `vrrp_track_process` can force the instance out of service when the HAProxy process disappears. On `proxy1`:

```text
global_defs {
    enable_script_security
}

vrrp_track_process haproxy_process {
    process haproxy
}

vrrp_instance POSTGRES_VIP {
    state BACKUP
    interface eth0
    virtual_router_id 61
    priority 150
    advert_int 1
    nopreempt

    unicast_src_ip 10.40.0.21
    check_unicast_src
    unicast_peer {
        10.40.0.22
    }

    virtual_ipaddress {
        10.40.0.20/24 dev eth0
    }

    track_process {
        haproxy_process
    }
}
```

On `proxy2`, use `unicast_src_ip 10.40.0.22`, peer `10.40.0.21`, and a lower priority such as `100`. Choose a `virtual_router_id` that does not collide with another VRRP instance on the same LAN, and keep the value, advertisement interval, VIP, and interface semantics aligned between these proxies. Both nodes start in `BACKUP` state because Keepalived documents that `nopreempt` does not work with an initial `MASTER` state. `nopreempt` avoids moving the VIP back merely because the preferred proxy recovered, reducing unnecessary client disruption.

Tracking the process prevents a proxy with no matching HAProxy process from holding the VIP, but it does not prove that HAProxy is responsive or that the complete database path works. Monitor HAProxy's backend state and run an external SQL probe through the VIP. Do not make Keepalived relinquish the VIP merely because all Patroni backends are briefly down: moving to the other identical HAProxy cannot repair a database election, and repeated VIP movement makes diagnosis harder.

VRRP advertisements must be allowed between the two hosts. Keepalived's unicast mode is useful where multicast is unavailable, but it is not a substitute for network policy. `check_unicast_src` rejects advertisements whose source is not in `unicast_peer`; also restrict the peers at the network layer and protect the proxy management plane. Legacy VRRP password authentication is not encryption and should not be treated as protection against a hostile network.

## Test each failure independently

First verify ownership and routing:

```bash
ip address show dev eth0
curl --silent --output /dev/null --write-out '%{http_code}\n' \
  http://10.40.0.11:8008/primary
psql "host=postgres-write.example.net port=5000 dbname=app user=app sslmode=verify-full" \
  -c "SELECT inet_server_addr(), pg_is_in_recovery();"
```

The direct Patroni probe returns `200` only when `pg1` is the current primary; `503` is expected there if another member leads. Probe all three members if you want to confirm that exactly one returns `200`. The SQL result must show `pg_is_in_recovery() = false`. Then stage controlled tests:

1. Stop HAProxy on the VIP owner. Confirm the VIP appears on the other proxy and a fresh SQL connection succeeds.
2. Restore HAProxy. With `nopreempt`, confirm ownership stays where it is.
3. Perform a Patroni switchover. Confirm the VIP does not move, HAProxy marks the old database down, and new sessions reach the new primary.
4. Block VRRP only in an isolated test environment and observe the result from both sides. A peer partition can make both Keepalived instances become `MASTER`; VRRP alone cannot guarantee one VIP owner when the proxies cannot hear each other. If duplicate ownership is unacceptable, add an external fencing mechanism or use a platform load balancer whose control plane provides that guarantee.

Measure the total interruption rather than promising zero downtime. It includes Patroni election/promotion time, HAProxy role-check convergence (`fall` and `rise` thresholds), Keepalived detection if a proxy failed, neighbor-cache convergence, and application reconnect delay. Existing PostgreSQL sessions are not migrated.

## Know when a floating VIP is the wrong primitive

A Keepalived VIP assumes both proxies can announce the same address on a network that honors VRRP and gratuitous ARP or neighbor advertisements. Many public clouds, routed networks, and managed Kubernetes environments do not provide that model. Use a cloud network load balancer, a provider-supported movable address, or a Kubernetes Service there. Do not force VRRP through a network whose failure semantics you have not tested.

## Official Documentation

- [Patroni REST API health-check endpoints](https://patroni.readthedocs.io/en/latest/rest_api.html#health-check-endpoints)
- [HAProxy configuration manual](https://docs.haproxy.org/3.4/configuration.html)
- [HAProxy health-check guidance](https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/)
- [Keepalived quick start](https://www.keepalived.org/documentation/user-guide/quick-start/)
- [Keepalived configuration synopsis](https://www.keepalived.org/documentation/user-guide/configuration-synopsis/)
- [Keepalived configuration reference](https://www.keepalived.org/documentation/keepalived-conf/)
- [PostgreSQL libpq SSL/TLS support](https://www.postgresql.org/docs/current/libpq-ssl.html)

## Conclusion

Use Patroni to choose the writer, HAProxy to route new connections by Patroni role, and Keepalived to make the proxy address redundant. Track HAProxy locally, monitor the SQL path externally, test database and proxy failures separately, and use a platform-native load balancer when the network cannot safely support a floating VIP.
