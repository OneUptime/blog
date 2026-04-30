# How to Use Mininet for IPv6 Network Emulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Mininet, IPv6, Network Emulation, SDN, Python, Testing

Description: Emulate IPv6 networks with Mininet for testing, SDN experiments, and teaching network concepts with Python scripting.

## Setting Up Mininet with IPv6

```bash
# Install Mininet

sudo apt-get install -y mininet

# Verify installation
sudo mn --version

# Test a basic Mininet topology
sudo mn --switch ovsbr --test pingall
```

## Basic IPv6 Topology in Python

```python
#!/usr/bin/env python3
# ipv6-topo.py - Basic 3-host IPv6 topology

from mininet.net import Mininet
from mininet.node import OVSBridge
from mininet.cli import CLI
from mininet.log import setLogLevel
import time

def create_ipv6_topology():
    net = Mininet(switch=OVSBridge)

    # Add switches
    s1 = net.addSwitch('s1')

    # Add hosts
    h1 = net.addHost('h1')
    h2 = net.addHost('h2')
    h3 = net.addHost('h3')

    # Add links
    net.addLink(h1, s1)
    net.addLink(h2, s1)
    net.addLink(h3, s1)

    net.start()

    # Configure IPv6 addresses
    h1.cmd('ip -6 addr add 2001:db8:1::1/64 dev h1-eth0')
    h2.cmd('ip -6 addr add 2001:db8:1::2/64 dev h2-eth0')
    h3.cmd('ip -6 addr add 2001:db8:1::3/64 dev h3-eth0')

    time.sleep(1)

    # Verify IPv6 connectivity
    print("Testing IPv6 connectivity...")
    print(h1.cmd('ping -6 -c 3 2001:db8:1::2'))
    print(h1.cmd('ping -6 -c 3 2001:db8:1::3'))

    CLI(net)  # Interactive CLI
    net.stop()

if __name__ == '__main__':
    setLogLevel('info')
    create_ipv6_topology()
```

## Multi-Subnet IPv6 Topology

```python
#!/usr/bin/env python3
# multi-subnet-ipv6.py

from mininet.net import Mininet
from mininet.node import OVSBridge
from mininet.cli import CLI
from mininet.log import setLogLevel
import time

def create_multi_subnet():
    net = Mininet(switch=OVSBridge)

    # Two switches (simulating two subnets)
    s1 = net.addSwitch('s1')  # Subnet 1: 2001:db8:1::/64
    s2 = net.addSwitch('s2')  # Subnet 2: 2001:db8:2::/64

    # Hosts in subnet 1
    h1 = net.addHost('h1')
    h2 = net.addHost('h2')

    # Hosts in subnet 2
    h3 = net.addHost('h3')
    h4 = net.addHost('h4')

    # Router (dual-homed Linux host)
    router = net.addHost('r1')

    # Links
    net.addLink(h1, s1)
    net.addLink(h2, s1)
    net.addLink(h3, s2)
    net.addLink(h4, s2)
    net.addLink(router, s1)
    net.addLink(router, s2)

    net.start()

    # Configure IPv6 addresses
    h1.cmd('ip -6 addr add 2001:db8:1::1/64 dev h1-eth0')
    h2.cmd('ip -6 addr add 2001:db8:1::2/64 dev h2-eth0')
    h3.cmd('ip -6 addr add 2001:db8:2::1/64 dev h3-eth0')
    h4.cmd('ip -6 addr add 2001:db8:2::2/64 dev h4-eth0')

    # Configure router
    router.cmd('ip -6 addr add 2001:db8:1::ffff/64 dev r1-eth0')
    router.cmd('ip -6 addr add 2001:db8:2::ffff/64 dev r1-eth1')
    router.cmd('sysctl -w net.ipv6.conf.all.forwarding=1')

    time.sleep(1)

    # Configure routes on hosts
    h1.cmd('ip -6 route add 2001:db8:2::/64 via 2001:db8:1::ffff dev h1-eth0')
    h2.cmd('ip -6 route add 2001:db8:2::/64 via 2001:db8:1::ffff dev h2-eth0')
    h3.cmd('ip -6 route add 2001:db8:1::/64 via 2001:db8:2::ffff dev h3-eth0')
    h4.cmd('ip -6 route add 2001:db8:1::/64 via 2001:db8:2::ffff dev h4-eth0')

    # Test inter-subnet reachability
    print("\nTesting inter-subnet IPv6 reachability:")
    result = h1.cmd('ping -6 -c 3 2001:db8:2::1')
    print(result)

    CLI(net)
    net.stop()

if __name__ == '__main__':
    setLogLevel('info')
    create_multi_subnet()
```

## Automated IPv6 Test Suite

```python
#!/usr/bin/env python3
# test-suite.py - Automated IPv6 tests in Mininet

from mininet.net import Mininet
from mininet.node import OVSBridge
from mininet.log import setLogLevel, info
import re
import time

class IPv6TestSuite:

    def __init__(self, net):
        self.net = net
        self.passed = 0
        self.failed = 0

    def test(self, name, host, cmd, expected_pattern):
        output = host.cmd(cmd)
        if re.search(expected_pattern, output):
            info(f"  PASS: {name}\n")
            self.passed += 1
        else:
            info(f"  FAIL: {name}\n")
            info(f"    Output: {output.strip()}\n")
            self.failed += 1

    def run_all(self):
        h1, h2 = self.net.get('h1', 'h2')

        info("=== IPv6 Tests ===\n")

        self.test("h1 has IPv6 address",
            h1, "ip -6 addr show", r"2001:db8:1::1")

        self.test("h1 can ping h2",
            h1, "LANG=C ping -6 -c 2 -W 2 2001:db8:1::2", r"2 received")

        self.test("h1 has connected IPv6 route",
            h1, "ip -6 route show 2001:db8:1::/64", r"2001:db8:1::/64 dev h1-eth0")

        self.test("h1 sees h2 in IPv6 neighbor table",
            h1, "ip -6 neigh show", r"2001:db8:1::2")

        info(f"\nResults: {self.passed} passed, {self.failed} failed\n")

def main():
    setLogLevel('warning')
    net = Mininet(switch=OVSBridge)
    s1 = net.addSwitch('s1')
    h1 = net.addHost('h1')
    h2 = net.addHost('h2')
    net.addLink(h1, s1)
    net.addLink(h2, s1)
    net.start()

    h1.cmd('ip -6 addr add 2001:db8:1::1/64 dev h1-eth0')
    h2.cmd('ip -6 addr add 2001:db8:1::2/64 dev h2-eth0')

    time.sleep(1)

    suite = IPv6TestSuite(net)
    suite.run_all()

    net.stop()

if __name__ == '__main__':
    main()
```

## Conclusion

Mininet provides a scriptable IPv6 network emulation environment perfect for testing, SDN experiments, and automated validation. The Python API enables topology-as-code with IPv6 addresses assigned via `ip -6 addr add` commands. For routing between subnets, add a multi-homed host with `sysctl -w net.ipv6.conf.all.forwarding=1`. Mininet's lightweight hosts run as processes in Linux network namespaces, making it suitable for CI/CD network test pipelines. Combine with an SDN controller for software-defined IPv6 networking experiments.
