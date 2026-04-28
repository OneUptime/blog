# How to Compare Running and Intended Configurations with NAPALM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAPALM, Python, Configuration Management, Diff, Network Automation

Description: Learn how to use NAPALM to compare the running configuration of a network device against an intended (desired state) configuration and identify configuration drift.

## Configuration Drift Detection

In production networks, configurations can drift from their intended state due to manual changes, failed automation runs, or emergency fixes. NAPALM provides a consistent way to detect and quantify this drift.

## Step 1: Compare Running Config to a File

```python
import napalm

driver = napalm.get_network_driver('ios')
device = driver(
    hostname='192.168.1.1',
    username='admin',
    password='password',
    optional_args={'secret': 'enablepass'},
)

device.open()

# Load intended config from file

device.load_replace_candidate(filename='/etc/network/configs/router01.cfg')

# Get the diff between running and intended
diff = device.compare_config()

if diff:
    print("Configuration drift detected!")
    print(diff)
else:
    print("Device is in desired state. No drift.")

# Important: Don't commit - just checking
device.discard_config()
device.close()
```

## Step 2: Get Running Configuration

```python
import napalm

driver = napalm.get_network_driver('ios')
device = driver('192.168.1.1', 'admin', 'password', optional_args={'secret': 'ep'})

device.open()

# Get running configuration
running_config = device.get_config(retrieve='running')
print("Running config (first 500 chars):")
print(running_config['running'][:500])

# Get startup config
startup_config = device.get_config(retrieve='startup')

# Compare running vs startup (check for unsaved changes)
if running_config['running'] != startup_config['startup']:
    print("\nWARNING: Running config differs from startup config!")
    print("Unsaved changes exist.")
else:
    print("\nRunning and startup configs match.")

device.close()
```

## Step 3: Detect Drift Across Multiple Devices

```python
import napalm
import os
from pathlib import Path

INTENDED_CONFIG_DIR = '/etc/network/intended_configs'

def check_drift(device_info):
    hostname = device_info.get('name', device_info['host'])
    config_file = Path(INTENDED_CONFIG_DIR) / f"{hostname}.cfg"

    if not config_file.exists():
        return {'hostname': hostname, 'status': 'NO_BASELINE', 'diff': ''}

    driver_class = napalm.get_network_driver(device_info['driver'])
    device = driver_class(
        hostname=device_info['host'],
        username=device_info['username'],
        password=device_info['password'],
        optional_args=device_info.get('optional_args', {}),
    )

    try:
        device.open()
        device.load_replace_candidate(filename=str(config_file))
        diff = device.compare_config()
        device.discard_config()
        device.close()

        if diff:
            return {'hostname': hostname, 'status': 'DRIFT', 'diff': diff}
        else:
            return {'hostname': hostname, 'status': 'OK', 'diff': ''}

    except Exception as e:
        return {'hostname': hostname, 'status': 'ERROR', 'error': str(e), 'diff': ''}

# Check all devices
devices = [
    {'name': 'router01', 'host': '192.168.1.1', 'driver': 'ios', 'username': 'admin', 'password': 'pass', 'optional_args': {'secret': 'ep'}},
    {'name': 'router02', 'host': '192.168.1.2', 'driver': 'ios', 'username': 'admin', 'password': 'pass', 'optional_args': {'secret': 'ep'}},
]

for device in devices:
    result = check_drift(device)
    if result['status'] == 'OK':
        print(f"✓ {result['hostname']}: No drift")
    elif result['status'] == 'DRIFT':
        print(f"⚠ {result['hostname']}: DRIFT DETECTED")
        print(result['diff'])
    elif result['status'] == 'NO_BASELINE':
        print(f"? {result['hostname']}: No baseline config file")
    else:
        print(f"✗ {result['hostname']}: Error - {result.get('error')}")
```

## Step 4: Save Running Config as Baseline

```python
import napalm
from datetime import datetime

def save_baseline(device_info, output_dir):
    driver_class = napalm.get_network_driver(device_info['driver'])
    device = driver_class(
        hostname=device_info['host'],
        username=device_info['username'],
        password=device_info['password'],
        optional_args=device_info.get('optional_args', {}),
    )

    device.open()
    config = device.get_config(retrieve='running')
    facts = device.get_facts()
    device.close()

    hostname = facts.get('hostname', device_info['host'])
    filename = f"{output_dir}/{hostname}.cfg"
    timestamp = datetime.now().isoformat()

    with open(filename, 'w') as f:
        f.write(f"! Baseline captured: {timestamp}\n")
        f.write(config['running'])

    print(f"Saved baseline for {hostname} to {filename}")

save_baseline(devices[0], '/etc/network/intended_configs')
```

## Step 5: Automated Drift Report

```python
import napalm
import json
from datetime import datetime

def generate_drift_report(devices, report_file):
    report = {'timestamp': datetime.now().isoformat(), 'devices': []}

    for dev_info in devices:
        result = check_drift(dev_info)
        report['devices'].append(result)

    # Summary
    ok_count = sum(1 for d in report['devices'] if d['status'] == 'OK')
    drift_count = sum(1 for d in report['devices'] if d['status'] == 'DRIFT')
    error_count = sum(1 for d in report['devices'] if d['status'] == 'ERROR')

    report['summary'] = {'ok': ok_count, 'drift': drift_count, 'errors': error_count}

    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)

    print(f"\nDrift Report: {ok_count} OK, {drift_count} DRIFT, {error_count} ERRORS")
    return report

generate_drift_report(devices, '/tmp/drift-report.json')
```

## Conclusion

NAPALM's `load_replace_candidate()` + `compare_config()` + `discard_config()` pattern enables non-destructive configuration drift detection. Load the intended config from a file, compare it to the running config, and review the diff without making changes. Run this regularly in CI/CD pipelines or as a cron job to detect unauthorized configuration changes. Use `get_config()` to capture baselines and `compare_config()` to identify deviations from the desired state.
