# How to Test SRv6 Configurations in Lab Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Lab Testing, GNS3, Linux, Containerlab, Networking

Description: Set up SRv6 lab environments using Linux namespaces, Containerlab, or GNS3 to test configurations before production deployment.

## Introduction

Testing SRv6 configurations in an isolated lab prevents production outages. Linux network namespaces provide a lightweight option, while Containerlab and GNS3 enable more realistic multi-vendor topologies.

## Option 1: Linux Network Namespaces (Minimal Setup)

```bash
#!/bin/bash
# srv6-lab.sh - minimal SRv6 test topology using Linux namespaces

# Create 3 routers as network namespaces

for ns in R1 R2 R3; do
    ip netns add $ns
    ip netns exec $ns ip link set lo up
    ip netns exec $ns sysctl -w net.ipv6.conf.all.forwarding=1
    ip netns exec $ns sysctl -w net.ipv6.conf.all.seg6_enabled=1
    ip netns exec $ns sysctl -w net.ipv6.conf.default.seg6_enabled=1
done

# Create veth pairs between routers
# R1 - R2
ip link add r1r2-r1 type veth peer name r1r2-r2
ip link set r1r2-r1 netns R1
ip link set r1r2-r2 netns R2
ip netns exec R1 ip link set r1r2-r1 up
ip netns exec R2 ip link set r1r2-r2 up

# R2 - R3
ip link add r2r3-r2 type veth peer name r2r3-r3
ip link set r2r3-r2 netns R2
ip link set r2r3-r3 netns R3
ip netns exec R2 ip link set r2r3-r2 up
ip netns exec R3 ip link set r2r3-r3 up

# Enable SRH processing on the lab interfaces
ip netns exec R1 sysctl -w net.ipv6.conf.r1r2-r1.seg6_enabled=1
ip netns exec R2 sysctl -w net.ipv6.conf.r1r2-r2.seg6_enabled=1
ip netns exec R2 sysctl -w net.ipv6.conf.r2r3-r2.seg6_enabled=1
ip netns exec R3 sysctl -w net.ipv6.conf.r2r3-r3.seg6_enabled=1

# Assign link-local addresses (auto), locator addresses, and a test service address
ip netns exec R1 ip -6 addr add 5f00:1::/128 dev lo
ip netns exec R2 ip -6 addr add 5f00:2::/128 dev lo
ip netns exec R3 ip -6 addr add 5f00:3::/128 dev lo
ip netns exec R3 ip -6 addr add fd00:99::1/128 dev lo

# Assign link addresses
ip netns exec R1 ip -6 addr add fd00:12::1/64 dev r1r2-r1
ip netns exec R2 ip -6 addr add fd00:12::2/64 dev r1r2-r2
ip netns exec R2 ip -6 addr add fd00:23::2/64 dev r2r3-r2
ip netns exec R3 ip -6 addr add fd00:23::3/64 dev r2r3-r3

# Configure static routes (in a real lab, use FRR's IS-IS)
ip netns exec R1 ip -6 route add 5f00:2::/32 via fd00:12::2
ip netns exec R1 ip -6 route add 5f00:3::/32 via fd00:12::2
ip netns exec R2 ip -6 route add 5f00:1::/32 via fd00:12::1
ip netns exec R2 ip -6 route add 5f00:3::/32 via fd00:23::3
ip netns exec R3 ip -6 route add 5f00:1::/32 via fd00:23::2
ip netns exec R3 ip -6 route add 5f00:2::/32 via fd00:23::2
ip netns exec R1 ip -6 route add fd00:23::/64 via fd00:12::2
ip netns exec R3 ip -6 route add fd00:12::/64 via fd00:23::2

# Configure SRv6 endpoints
# R2: End function
ip netns exec R2 ip -6 route add 5f00:2:0:e001::/128 \
    encap seg6local action End dev lo

# R3: End.DT6 function
ip netns exec R3 ip -6 route add 5f00:3:0:e000::/128 \
    encap seg6local action End.DT6 table 254 dev lo

# R1: encapsulate traffic via SRv6
ip netns exec R1 ip -6 route add fd00:99::/64 \
    encap seg6 mode encap segs 5f00:2:0:e001::,5f00:3:0:e000:: \
    via fd00:12::2 dev r1r2-r1

echo "SRv6 lab ready!"
echo "Test: ip netns exec R1 ping -6 -I 5f00:1:: 5f00:3::"
```

## Option 2: Containerlab with FRRouting

```yaml
# containerlab/srv6-topology.yml
name: srv6-lab

topology:
  nodes:
    R1:
      kind: linux
      image: frrouting/frr:latest
      binds:
        - R1/frr.conf:/etc/frr/frr.conf
        - R1/daemons:/etc/frr/daemons

    R2:
      kind: linux
      image: frrouting/frr:latest
      binds:
        - R2/frr.conf:/etc/frr/frr.conf
        - R2/daemons:/etc/frr/daemons

    R3:
      kind: linux
      image: frrouting/frr:latest
      binds:
        - R3/frr.conf:/etc/frr/frr.conf
        - R3/daemons:/etc/frr/daemons

  links:
    - endpoints: ["R1:eth1", "R2:eth1"]
    - endpoints: ["R2:eth2", "R3:eth1"]
```

```bash
# Deploy the Containerlab topology
sudo containerlab deploy -t containerlab/srv6-topology.yml

# Verify topology
sudo containerlab inspect -t containerlab/srv6-topology.yml

# Execute commands in a container
sudo containerlab exec -t containerlab/srv6-topology.yml \
  --label clab-node-name=R1 \
  --cmd "vtysh -c 'show segment-routing srv6 sid'"
```

## Test Cases for SRv6 Validation

```bash
#!/bin/bash
# srv6-tests.sh - validate SRv6 lab configuration

PASS=0
FAIL=0

run_test() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "PASS: $name"
        ((PASS++))
    else
        echo "FAIL: $name"
        ((FAIL++))
    fi
}

capture_srh() {
    rm -f /tmp/test.pcap
    ip netns exec R1 timeout 5 tcpdump -i r1r2-r1 -c 1 'ip6 proto 43' -w /tmp/test.pcap >/dev/null 2>&1 &
    local tcpdump_pid=$!
    sleep 1
    ip netns exec R1 ping -6 -I 5f00:1:: -c 1 -W 2 fd00:99::1 >/dev/null 2>&1
    local ping_rc=$?
    wait "$tcpdump_pid"
    local tcpdump_rc=$?
    return $((ping_rc || tcpdump_rc))
}

# Test 1: R2 End SID programmed
run_test "R2 End SID installed" \
    "ip netns exec R2 ip -6 route show 5f00:2:0:e001::/128 | grep -q 'seg6local action End'"

# Test 2: R3 End.DT6 SID programmed
run_test "R3 End.DT6 SID installed" \
    "ip netns exec R3 ip -6 route show 5f00:3:0:e000::/128 | grep -q 'seg6local action End.DT6 table 254'"

# Test 3: Service chain end-to-end
run_test "SRv6 service chain working" \
    "ip netns exec R1 ping -6 -I 5f00:1:: -c 2 -W 2 fd00:99::1"

# Test 4: SRH present in captured packets
run_test "SRH in encapsulated packets" "capture_srh"

echo ""
echo "Results: $PASS passed, $FAIL failed"
```

## Cleanup

```bash
# Remove the lab namespaces
for ns in R1 R2 R3; do
    ip netns del $ns
done
ip link del r1r2-r1 2>/dev/null
ip link del r2r3-r2 2>/dev/null

# Or for Containerlab
sudo containerlab destroy -t containerlab/srv6-topology.yml
```

## Conclusion

Linux namespaces provide a zero-cost SRv6 lab for quick validation; Containerlab enables realistic multi-node FRRouting topologies. Always validate End, End.X, End.DT4, End.DT6 functions and end-to-end paths in the lab before production deployment. Integrate automated test scripts into CI pipelines and use OneUptime for continuous validation.
