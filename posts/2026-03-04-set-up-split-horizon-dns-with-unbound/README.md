# How to Set Up Split-Horizon DNS with Unbound on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Unbound, Linux

Description: Learn how to set Up Split-Horizon DNS with Unbound on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Split-horizon DNS returns different answers for the same domain deRHELg on where the query originates. This is useful when internal clients shoRHELsolve to private IP addresses while external clients get public addresses.

## Prerequisites

- RHEL with Unbound installed
- Root or sudo access
- Internal and external network segments defined

## Step 1: Configure Unbound for Split-Horizon

```bash
sudo vi /etc/unbound/unbound.conf
```

```yaml
server:
    interface: 0.0.0.0
    access-control: 10.0.0.0/8 allow
    access-control: 192.168.0.0/16 allow
    access-control: 127.0.0.0/8 allow

    # Internal zone overrides
    local-zone: "example.com." transparent

    # Internal records
    local-data: "web.example.com. IN A 10.0.1.10"
    local-data: "api.example.com. IN A 10.0.1.11"
    local-data: "db.example.com. IN A 10.0.1.12"

    # PTR records for reverse lookups
    local-data-ptr: "10.0.1.10 web.example.com"
    local-data-ptr: "10.0.1.11 api.example.com"
    local-data-ptr: "10.0.1.12 db.example.com"
```

## Step 2: Use Views for Different Client Networks

For more complex scenarios, use Unbound's `view` feature:

```yaml
server:
    interface: 0.0.0.0
    module-config: "validator iterator"

view:
    name: "internal"
    view-first: yes
    local-zone: "example.com." static
    local-data: "web.example.com. IN A 10.0.1.10"

view:
    name: "external"
    view-first: yes
    local-zone: "example.com." transparent
```

## Step 3: Use Access Control Lists

Restrict which clients get internal answers:

```yaml
server:
    access-control-view: 10.0.0.0/8 "internal"
    access-control-view: 192.168.0.0/16 "internal"
```

## Step 4: Test from Different Networks

From an internal client:

```bash
dig @10.0.1.1 web.example.com
# Should return 10.0.1.10
```

From an external client:

```bash
dig @10.0.1.1 web.example.com
# Should return the public IP or forward to upstream
```

## Step 5: Restart and Verify

```bash
sudo unbound-checkconf
sudo systemctl restart unbound
```

## Conclusion

Split-horizon DNS with Unbound on RHEL 9 lets you serve different DNS answers to internal and external clients. This is essential for networks where internal services use private addresses but the same domain names resolve to public addresses for external users.
RHEL