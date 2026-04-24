# How to Use Python pyATS and Genie for Network Testing and Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PyATS, Genie, Python, Network Testing, Cisco, Validation

Description: Learn how to use Cisco's pyATS and Genie frameworks to write automated network tests that validate device configuration and operational state.

## What Are pyATS and Genie?

**pyATS** (Python Automated Test System) is Cisco's framework for writing network test scripts with:
- Device connection management
- Test execution and reporting
- Snapshot/comparison (learn before/after)

**Genie** is a library on top of pyATS that provides:
- Parsers for 2000+ Cisco show commands
- Device models (APIs to interact with NX-OS, IOS-XE, etc.)
- Testbed YAML for multi-device inventories

## Step 1: Install pyATS and Genie

```bash
python3 -m pip install "pyats[full]"

# Verify installation

pyats version check
```

## Step 2: Create a Testbed File

```yaml
# testbed.yaml
devices:
  router01:
    type: router
    os: iosxe
    platform: isr4k
    connections:
      cli:
        protocol: ssh
        ip: 192.168.1.1
        port: 22
    credentials:
      default:
        username: admin
        password: "%ENC{<encoded_password>}"    # Use pyats secret encoding

  router02:
    type: router
    os: iosxe
    platform: isr4k
    connections:
      cli:
        protocol: ssh
        ip: 192.168.1.2
    credentials:
      default:
        username: admin
        password: password
```

## Step 3: Connect and Parse Show Commands

```python
from pyats.topology import loader
from genie.libs.parser.utils import get_parser

# Load testbed
testbed = loader.load('testbed.yaml')
device = testbed.devices['router01']

# Connect
device.connect(log_stdout=False)

# Parse 'show ip interface brief' into structured dict
output = device.parse('show ip interface brief')
print(output)

# Output:
# {'interface': {
#   'GigabitEthernet0/0': {
#     'ip_address': '192.168.1.1',
#     'interface_is_ok': 'YES',
#     'method': 'NVRAM',
#     'status': 'up',
#     'protocol': 'up'
#   }, ...
# }}

# Disconnect
device.disconnect()
```

## Step 4: Write an AEtest Test Script

```python
#!/usr/bin/env python3
# network_tests.py

from pyats import aetest
from pyats.topology import loader
import logging

log = logging.getLogger(__name__)

class CommonSetup(aetest.CommonSetup):
    """Connect to all devices in the testbed."""

    @aetest.subsection
    def connect_to_devices(self, testbed):
        testbed = loader.load(testbed)
        self.parent.parameters['testbed'] = testbed

        for device in testbed.devices.values():
            device.connect(log_stdout=False)
            log.info(f"Connected to {device.name}")

class VerifyBGPNeighbors(aetest.Testcase):
    """Verify BGP neighbor adjacencies are established."""

    @aetest.test
    def check_bgp_neighbors(self, testbed):
        issues = []

        for device in testbed.devices.values():
            bgp_output = device.parse('show bgp summary')
            vrfs = bgp_output.get('vrf', {})
            down_neighbors = []

            for vrf_name, vrf_data in vrfs.items():
                neighbors = vrf_data.get('neighbor', {})
                for peer, peer_data in neighbors.items():
                    for af_name, af_data in peer_data.get('address_family', {}).items():
                        state = str(af_data.get('state_pfxrcd', ''))
                        if not state.isdigit():
                            down_neighbors.append(
                                f"{peer} (vrf {vrf_name}, {af_name}: {state})"
                            )

            if down_neighbors:
                issues.append(
                    f"{device.name}: BGP neighbors not established: {down_neighbors}"
                )
            else:
                log.info(f"{device.name}: All BGP neighbors are established")

        if issues:
            self.failed("\n".join(issues))

class VerifyInterfaceStatus(aetest.Testcase):
    """Verify critical interfaces are up."""

    @aetest.setup
    def setup(self):
        self.critical_interfaces = ['GigabitEthernet0/0', 'GigabitEthernet0/1']

    @aetest.test
    def check_interfaces_up(self, testbed):
        issues = []

        for device in testbed.devices.values():
            intf_data = device.parse('show ip interface brief')
            interfaces = intf_data.get('interface', {})

            for intf_name in self.critical_interfaces:
                if intf_name not in interfaces:
                    issues.append(f"{device.name}: Interface {intf_name} not found")
                    continue

                status = interfaces[intf_name].get('status')
                protocol = interfaces[intf_name].get('protocol')

                if status != 'up' or protocol != 'up':
                    issues.append(f"{device.name}: {intf_name} is {status}/{protocol}")

        if issues:
            self.failed("\n".join(issues))

class CommonCleanup(aetest.CommonCleanup):
    @aetest.subsection
    def disconnect(self, testbed):
        for device in testbed.devices.values():
            device.disconnect()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--testbed', default='testbed.yaml')
    args, _ = parser.parse_known_args()

    result = aetest.main(testbed=args.testbed)
    aetest.exit_cli_code(result)
```

## Step 5: Learn and Compare (Before/After Testing)

Genie's "learn" feature snapshots operational state for comparison:

```python
from pyats.topology import loader
from genie.libs.ops.bgp.iosxe.bgp import Bgp

testbed = loader.load('testbed.yaml')
device = testbed.devices['router01']
device.connect(log_stdout=False)

# Learn BGP state before change
bgp_before = Bgp(device)
bgp_before.learn()

print("BGP neighbors before change:")
print(bgp_before.info)

# ... make network changes ...

# Learn BGP state after change
bgp_after = Bgp(device)
bgp_after.learn()

# Compare before and after
diff = bgp_before.diff(bgp_after, exclude=bgp_before.exclude)
print("Changes detected:")
print(diff)

device.disconnect()
```

## Step 6: Run Tests

```bash
# Run the test script
python3 network_tests.py --testbed testbed.yaml

# Summary excerpt:
# VerifyBGPNeighbors    PASSED
# VerifyInterfaceStatus PASSED

# Run with more verbose output
python3 network_tests.py --testbed testbed.yaml -v
```

## Conclusion

pyATS and Genie provide a structured framework for network testing. Use Genie parsers to get structured data from show commands with `device.parse('show ...')`, write test cases inheriting from `aetest.Testcase`, and use `self.failed()` to mark test failures. Genie's "learn and diff" capability is particularly valuable for validating that network changes have the expected effect and nothing unexpected changed. This enables change management workflows with automated pre/post validation.
