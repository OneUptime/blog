# How to Receive SNMP Traps on Port 162 with Telegraf Without Running It as Root

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, SNMP, Linux, Systemd, Security

Description: Give Telegraf only the Linux capability needed to bind UDP port 162, then verify trap delivery and MIB translation without granting full root privileges.

---

SNMP managers normally receive traps on UDP port 162. On Linux, ports below 1024 are privileged, so the unprivileged `telegraf` service account cannot bind that address by default. Running the whole agent as root fixes the bind error by granting far more authority than an SNMP listener needs.

The narrow permission is `CAP_NET_BIND_SERVICE`. Grant it to the service process or binary, keep Telegraf's normal user, and test the complete UDP and translation path.

## Configure the Trap Listener

The SNMP translator is an agent-wide setting. The built-in `gosmi` backend is the recommended replacement for the deprecated `netsnmp` backend:

```toml
[agent]
  snmp_translator = "gosmi"

[[inputs.snmp_trap]]
  service_address = "udp://:162"
  version = "2c"
  path = [
    "/usr/share/snmp/mibs",
    "/opt/telegraf/mibs",
  ]
```

`service_address` must use `udp://`; this plugin does not provide a TCP trap listener. Omitting the local address binds all interfaces, so use a specific address such as `udp://192.0.2.10:162` when the host should not listen everywhere.

The `path` value is shared by all instances of all Telegraf SNMP plugin types. Supply the vendor MIBs and their imported dependencies at readable paths. The plugin must translate the trap and varbind OIDs. If lookup fails, it logs the numeric OID and does not emit that trap metric, so use the log to distinguish a MIB problem from a network problem.

For SNMPv3, change `version` to `"3"` and configure `sec_name`, `sec_level`, authentication, and privacy options. The plugin supports secret references for `sec_name`, `auth_password`, and `priv_password`. SNMPv1 and v2c communities appear on emitted metrics as a tag, so restrict access to the resulting telemetry.

## Option 1: Grant the Capability to the Binary

InfluxData documents this Linux command for a package-installed binary:

```bash
sudo setcap cap_net_bind_service=+ep /usr/bin/telegraf
getcap /usr/bin/telegraf
sudo systemctl restart telegraf
```

The expected `getcap` result includes `cap_net_bind_service=ep`. Telegraf still runs as its configured unprivileged user; only low-port binding is added.

An upgrade that replaces `/usr/bin/telegraf` can remove the extended-file capability. Verify it after package upgrades, and automate the check if this is the selected deployment model. Also confirm the actual executable path with the service unit rather than assuming it is `/usr/bin/telegraf`.

## Option 2: Grant the Capability in systemd

A systemd drop-in keeps the permission with the service definition instead of the executable:

```ini
# sudo systemctl edit telegraf
[Service]
AmbientCapabilities=
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
```

Then reload the unit and restart the service:

```bash
sudo systemctl daemon-reload
sudo systemctl restart telegraf
systemctl show telegraf -p User -p AmbientCapabilities -p CapabilityBoundingSet
```

Keep `User=telegraf` in effect. The empty assignments reset any earlier capability lists because repeated positive assignments are merged. `AmbientCapabilities` then passes the one capability to the process, while `CapabilityBoundingSet` prevents it from acquiring capabilities outside that set. If another enabled input genuinely needs a different capability, account for it explicitly before narrowing the bounding set.

## Option 3: Listen Above 1024 and Forward

The plugin documentation also suggests listening on an unprivileged port and forwarding UDP/162 at the firewall or load-balancer layer:

```toml
[[inputs.snmp_trap]]
  service_address = "udp://:1162"
  version = "2c"
```

This keeps Telegraf capability-free, but the forwarding rule becomes part of the monitored path. Forward UDP, preserve the sender information required by your design, and make the rule persistent using the host's supported firewall tooling. Alternatively, configure devices to send directly to UDP/1162 when they allow a nonstandard destination port.

## Verify the Failure Domain

First confirm that only one process owns the configured listener port and that Telegraf's live process stayed unprivileged. Use port 1162 in the first command if you selected Option 3:

```bash
sudo ss -lunp 'sport = :162'
systemctl show telegraf -p User -p MainPID
ps -o pid=,user=,uid= -p "$(systemctl show --property=MainPID --value telegraf)"
sudo journalctl -u telegraf -n 100 --no-pager
```

A bind failure usually says permission denied or address already in use. Once the socket exists, send a known test trap from an allowed source and inspect Telegraf's output. Check host and network firewalls for egress at the sender and ingress at the receiver. Traps are unconfirmed UDP notifications, so no acknowledgement proves delivery; if you test an inform request, also verify the return path for its response.

`inputs.snmp_trap` is a service input. A plain `--test` invocation can exit before a trap arrives, and even `--test-wait` only creates a finite reception window. For production-like verification, run the service with a temporary safe file output, send a uniquely identifiable trap, and confirm its `source`, `version`, OID-derived tags, and fields.

## Official Documentation

- [Telegraf SNMP trap input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/snmp_trap/)
- [Telegraf agent SNMP translator settings](https://docs.influxdata.com/telegraf/v1/configuration/agent/#snmp)
- [Telegraf secret references](https://docs.influxdata.com/telegraf/v1/configuration/secrets/)
- [systemd execution environment and capabilities](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html)
- [Linux capabilities manual](https://man7.org/linux/man-pages/man7/capabilities.7.html)

## Conclusion

Receiving SNMP traps on the standard port does not require a root Telegraf process. Bind `udp://:162`, grant only `CAP_NET_BIND_SERVICE` through systemd or the binary, or forward the port to an unprivileged listener. Then verify the actual service user, socket, UDP path, and MIB resolution with a known trap.
