# How to Set Up Split-Horizon DNS with Unbound on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DNS, Unbound, Linux

Description: Learn how to set Up Split-Horizon DNS with Unbound on RHEL with step-by-step instructions, configuration examples, and best practices.

---

Split-horizon DNS returns different answers for the same domain depending on where the query originates. This is useful when internal clients should resolve to private IP addresses while external clients get public addresses.

## Prerequisites

- RHEL with Unbound installed
- Root or sudo access
- Internal and external network segments defined

## Step 1: Configure Unbound for Split-Horizon

```bash
sudo vi /etc/unbound/unbound.conf
```

```unbound
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

```unbound
server:
    interface: 0.0.0.0
    access-control: 10.0.0.0/8 allow
    access-control: 192.168.0.0/16 allow
    access-control: 203.0.113.0/24 refuse_non_local
    access-control: 127.0.0.0/8 allow
    access-control-view: 10.0.0.0/8 "internal"
    access-control-view: 192.168.0.0/16 "internal"
    access-control-view: 203.0.113.0/24 "external"
    module-config: "validator iterator"

view:
    name: "internal"
    view-first: yes
    local-zone: "example.com." static
    local-data: "web.example.com. IN A 10.0.1.10"

view:
    name: "external"
    view-first: yes
    local-zone: "example.com." static
    local-data: "web.example.com. IN A 203.0.113.10"
```

## Step 3: Use Access Control Lists

Restrict which clients get internal answers:

```unbound
server:
    access-control: 10.0.0.0/8 allow
    access-control: 192.168.0.0/16 allow
    access-control: 203.0.113.0/24 refuse_non_local
    access-control-view: 10.0.0.0/8 "internal"
    access-control-view: 192.168.0.0/16 "internal"
    access-control-view: 203.0.113.0/24 "external"
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
# Should return 203.0.113.10
```

## Step 5: Restart and Verify

```bash
sudo unbound-checkconf
sudo firewall-cmd --permanent --add-service=dns
sudo firewall-cmd --reload
sudo systemctl restart unbound
```

## Conclusion

Split-horizon DNS with Unbound on RHEL 9 lets you serve different DNS answers to internal and external clients. This is essential for networks where internal services use private addresses but the same domain names resolve to public addresses for external users.
