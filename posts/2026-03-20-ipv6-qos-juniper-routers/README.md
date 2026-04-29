# How to Configure IPv6 QoS Policies on Juniper Routers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Juniper, IPv6, QoS, DSCP, Class of Service, Junos, Router

Description: Configure IPv6 Quality of Service on Juniper routers using Class of Service (CoS), including DSCP rewriting, forwarding classes, scheduler policies, and interface application.

---

Juniper Junos uses Class of Service (CoS) for QoS configuration. IPv4 and IPv6 share the same forwarding classes, queues, and scheduler policies, but IPv6 DSCP values are carried in the IPv6 Traffic Class field and are typically configured with `dscp-ipv6` classifiers and rewrite rules when you want IPv6-specific handling.

## Juniper CoS Classifier for IPv6

```text
# Juniper JunOS CoS Configuration

# Define DSCP IPv6 classifier for IPv6 traffic

set class-of-service classifiers dscp-ipv6 IPv6-DSCP-CLASSIFIER \
  forwarding-class VOIP-MEDIA loss-priority low code-points 101110  # EF
set class-of-service classifiers dscp-ipv6 IPv6-DSCP-CLASSIFIER \
  forwarding-class VOIP-SIGNAL loss-priority low code-points 101000  # CS5
set class-of-service classifiers dscp-ipv6 IPv6-DSCP-CLASSIFIER \
  forwarding-class VIDEO loss-priority low code-points 100010  # AF41
set class-of-service classifiers dscp-ipv6 IPv6-DSCP-CLASSIFIER \
  forwarding-class DATA loss-priority low code-points 001010  # AF11
set class-of-service classifiers dscp-ipv6 IPv6-DSCP-CLASSIFIER \
  forwarding-class BEST-EFFORT loss-priority low code-points 000000  # CS0

commit
```

## Forwarding Classes and Queues

```text
# Define forwarding classes (mapped to queues)
set class-of-service forwarding-classes queue 0 BEST-EFFORT
set class-of-service forwarding-classes queue 1 DATA
set class-of-service forwarding-classes queue 2 VIDEO
set class-of-service forwarding-classes queue 3 VOIP-SIGNAL
set class-of-service forwarding-classes queue 7 VOIP-MEDIA

commit
```

## Scheduler Policy for IPv6 QoS

```text
# Define scheduler for each forwarding class
set class-of-service schedulers SCHED-VOIP-MEDIA \
  transmit-rate percent 30 \
  priority strict-high \
  buffer-size temporal 5000

set class-of-service schedulers SCHED-VOIP-SIGNAL \
  transmit-rate percent 5 \
  buffer-size percent 5

set class-of-service schedulers SCHED-VIDEO \
  transmit-rate percent 25 \
  buffer-size percent 25

set class-of-service schedulers SCHED-DATA \
  transmit-rate percent 20 \
  buffer-size percent 20

set class-of-service schedulers SCHED-BEST-EFFORT \
  transmit-rate remainder \
  buffer-size remainder

# Map schedulers to forwarding classes
set class-of-service scheduler-maps WAN-SCHED-MAP \
  forwarding-class VOIP-MEDIA scheduler SCHED-VOIP-MEDIA
set class-of-service scheduler-maps WAN-SCHED-MAP \
  forwarding-class VOIP-SIGNAL scheduler SCHED-VOIP-SIGNAL
set class-of-service scheduler-maps WAN-SCHED-MAP \
  forwarding-class VIDEO scheduler SCHED-VIDEO
set class-of-service scheduler-maps WAN-SCHED-MAP \
  forwarding-class DATA scheduler SCHED-DATA
set class-of-service scheduler-maps WAN-SCHED-MAP \
  forwarding-class BEST-EFFORT scheduler SCHED-BEST-EFFORT

commit
```

## Rewrite Rules for IPv6 DSCP

```text
# Define rewrite rules (for remarking IPv6 Traffic Class)
set class-of-service rewrite-rules dscp-ipv6 IPv6-DSCP-REWRITE \
  forwarding-class VOIP-MEDIA loss-priority low code-point 101110  # EF
set class-of-service rewrite-rules dscp-ipv6 IPv6-DSCP-REWRITE \
  forwarding-class VOIP-SIGNAL loss-priority low code-point 101000  # CS5
set class-of-service rewrite-rules dscp-ipv6 IPv6-DSCP-REWRITE \
  forwarding-class VIDEO loss-priority low code-point 100010  # AF41
set class-of-service rewrite-rules dscp-ipv6 IPv6-DSCP-REWRITE \
  forwarding-class DATA loss-priority low code-point 001010  # AF11
set class-of-service rewrite-rules dscp-ipv6 IPv6-DSCP-REWRITE \
  forwarding-class BEST-EFFORT loss-priority low code-point 000000  # CS0

commit
```

## Applying CoS to IPv6 Interface

```text
# Apply CoS to IPv6 interface
set class-of-service interfaces ge-0/0/0 \
  scheduler-map WAN-SCHED-MAP
set class-of-service interfaces ge-0/0/0 \
  unit 0 classifiers dscp-ipv6 IPv6-DSCP-CLASSIFIER
set class-of-service interfaces ge-0/0/0 \
  unit 0 rewrite-rules dscp-ipv6 IPv6-DSCP-REWRITE

# Verify interface CoS configuration
run show class-of-service interface ge-0/0/0

commit
```

## Monitoring IPv6 QoS on Juniper

```text
# Check queue statistics
show class-of-service interface ge-0/0/0 comprehensive

# View per-queue statistics
show interfaces ge-0/0/0 detail | find "Queue counters"

# Check DSCP classification
show class-of-service classifier name IPv6-DSCP-CLASSIFIER

# Monitor interface traffic in real time
monitor interface traffic ge-0/0/0

# Check CoS applied to interface
show class-of-service interface ge-0/0/0

# View queue counters directly
show interfaces queue ge-0/0/0
```

## Firewall Filter for IPv6 QoS (Alternative Approach)

```text
# Using firewall filter to classify and mark IPv6 traffic
set firewall family inet6 filter IPV6-QOS-MARK \
  term VOIP-MEDIA from protocol udp \
  term VOIP-MEDIA from destination-port 10000-20000 \
  term VOIP-MEDIA then dscp ef \
  term VOIP-MEDIA then count VOIP-COUNTER \
  term VOIP-MEDIA then accept

set firewall family inet6 filter IPV6-QOS-MARK \
  term DEFAULT then accept

# Apply filter to interface input
set interfaces ge-0/0/1 unit 0 \
  family inet6 filter input IPV6-QOS-MARK

commit
```

Juniper's CoS framework uses the same forwarding classes, queues, and scheduler policies for IPv4 and IPv6. For IPv6-specific DSCP handling, use `dscp-ipv6` classifiers and rewrite rules, because the DSCP bits are carried in the IPv6 Traffic Class field.
