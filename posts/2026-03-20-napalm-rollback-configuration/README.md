# How to Roll Back Network Configuration Changes with NAPALM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAPALM, Rollback, Python, Network Automation, Configuration Management

Description: Learn how to use NAPALM to implement safe configuration changes with automatic rollback capability for Cisco, Arista, and Juniper network devices.

## NAPALM Rollback Strategies

NAPALM provides two rollback mechanisms:

1. **`rollback()`** - Reverts to the configuration before the last commit (device must support checkpoints, e.g., Arista EOS, Juniper JunOS)
2. **Manual rollback** - Save the current config before changes and reapply it if needed (works on all devices including Cisco IOS)

## Step 1: Check Rollback Support

```python
import napalm

# Arista EOS and Juniper JunOS support native rollback

# Cisco IOS does not natively support rollback through NAPALM

driver = napalm.get_network_driver('eos')    # Arista EOS supports rollback
device = driver('192.168.1.2', 'admin', 'password')

device.open()

# Make a change
device.load_merge_candidate(config="interface Ethernet1\n description TEST\n")
device.compare_config()
device.commit_config()
print("Change applied.")

# Rollback to the previous configuration
device.rollback()
print("Rolled back.")

device.close()
```

## Step 2: Manual Rollback for Cisco IOS

For Cisco IOS (which doesn't support native rollback), implement a save-and-restore pattern:

```python
import napalm
from datetime import datetime

def apply_with_manual_rollback(device_info, config_to_apply):
    """Apply configuration with manual rollback capability for Cisco IOS."""
    driver_class = napalm.get_network_driver(device_info['driver'])
    device = driver_class(
        hostname=device_info['host'],
        username=device_info['username'],
        password=device_info['password'],
        optional_args=device_info.get('optional_args', {}),
    )

    device.open()

    # Step 1: Save current running config as rollback point
    current_config = device.get_config(retrieve='running')['running']
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    rollback_file = f'/tmp/rollback_{device_info["host"]}_{timestamp}.cfg'

    with open(rollback_file, 'w') as f:
        f.write(current_config)
    print(f"Rollback saved to {rollback_file}")

    # Step 2: Apply new configuration
    device.load_merge_candidate(config=config_to_apply)
    diff = device.compare_config()

    if not diff:
        print("No changes needed.")
        device.discard_config()
        device.close()
        return

    print(f"Applying changes:\n{diff}")
    device.commit_config()
    print("Changes applied.")

    # Step 3: Verify (add your own verification logic)
    verify_output = device.get_interfaces()
    print(f"Interfaces after change: {list(verify_output.keys())[:5]}")

    # Step 4: If verification fails, roll back
    confirm = input("Changes OK? (yes to keep, no to rollback): ")
    if confirm.lower() != 'yes':
        print("Rolling back...")
        device.load_replace_candidate(filename=rollback_file)
        device.compare_config()  # Show what we're restoring
        device.commit_config()
        print("Rolled back to previous configuration.")
    else:
        # commit_config() already persists to startup-config on IOS
        # (NAPALM runs `write memory` internally as part of commit).
        print("Configuration kept.")

    device.close()

device_info = {
    'driver': 'ios',
    'host': '192.168.1.1',
    'username': 'admin',
    'password': 'password',
    'optional_args': {'secret': 'enablepass'},
}

apply_with_manual_rollback(device_info, """
interface GigabitEthernet0/1
 description TEST_CHANGE
""")
```

## Step 3: Scheduled Rollback (Commit with Timer)

For JunOS devices, implement a commit-confirmed pattern that rolls back automatically if not confirmed:

```python
import napalm
import threading
import time

def commit_with_timer(device_info, config, confirm_timeout=60):
    """
    Apply config that auto-rolls-back if not confirmed within timeout.
    Simulates JunOS 'commit confirmed' behavior.
    """
    driver_class = napalm.get_network_driver(device_info['driver'])

    def _build_device():
        return driver_class(
            hostname=device_info['host'],
            username=device_info['username'],
            password=device_info['password'],
            optional_args=device_info.get('optional_args', {}),
        )

    device = _build_device()
    device.open()

    # Save current config for rollback
    backup = device.get_config(retrieve='running')['running']

    # Apply the change
    device.load_merge_candidate(config=config)
    diff = device.compare_config()
    print(f"Applying:\n{diff}")
    device.commit_config()

    print(f"Changes applied. You have {confirm_timeout}s to confirm.")

    # Start rollback timer
    def auto_rollback():
        device2 = _build_device()
        device2.open()
        device2.load_replace_candidate(config=backup)
        device2.commit_config()
        device2.close()
        print("AUTO-ROLLBACK: Timer expired, reverted to previous config.")

    timer = threading.Timer(confirm_timeout, auto_rollback)
    timer.start()

    confirm = input(f"Confirm changes (yes within {confirm_timeout}s): ")
    if confirm.lower() == 'yes':
        timer.cancel()
        print("Changes confirmed. Timer cancelled.")
    else:
        timer.cancel()
        print("Waiting for rollback...")
        auto_rollback()

    device.close()
```

## Conclusion

NAPALM rollback is natively supported on Arista EOS and Juniper JunOS via `device.rollback()`. For Cisco IOS, implement manual rollback by saving the current running config before changes with `get_config(retrieve='running')`, then restoring with `load_replace_candidate()` and `commit_config()` if needed. Implement a "commit-confirm" pattern with a timeout timer for production changes where you want automatic revert if you lose access to the device after applying the change.
