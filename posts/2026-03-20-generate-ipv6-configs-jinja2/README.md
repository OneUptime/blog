# How to Generate IPv6 Configurations with Jinja2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Jinja2, Template, Ansible, Configuration, Automation, Network

Description: Use Jinja2 templates to generate device-specific IPv6 configurations for routers and switches in automated deployment pipelines.

## Introduction

Use Jinja2 templates to generate device-specific IPv6 configurations for routers and switches in automated deployment pipelines. This guide covers the essential configuration, code patterns, and verification steps.

## Step 1: Prerequisites and Setup

```bash
# Ensure IPv6 is enabled and functional

ip -6 addr show
ping -6 -c 3 ::1

# Install required dependencies
pip install Jinja2 PyYAML
```

## Step 2: Core Implementation

```python
# render_ipv6_config.py
import argparse
from ipaddress import ip_address, ip_interface

import yaml
from jinja2 import Environment, StrictUndefined

TEMPLATE = """hostname {{ hostname }}
{% for interface in interfaces %}
interface {{ interface.name }}
 description {{ interface.description }}
 ipv6 address {{ interface.address }}/{{ interface.prefix_length }}
 no shutdown
{% endfor %}
ipv6 route ::/0 {{ default_gateway }}
"""

def validate_config(config: dict) -> None:
    """Validate IPv6 addresses before rendering the template."""
    gateway = ip_address(config["default_gateway"])
    if gateway.version != 6:
        raise ValueError("default_gateway must be an IPv6 address")

    for interface in config["interfaces"]:
        candidate = ip_interface(f"{interface['address']}/{interface['prefix_length']}")
        if candidate.version != 6:
            raise ValueError(f"{interface['name']} must use an IPv6 address")

def render_ipv6_config(config_path: str) -> str:
    """Render a device-specific IPv6 configuration from YAML input."""
    with open(config_path, "r", encoding="utf-8") as file:
        config = yaml.safe_load(file)

    if not isinstance(config, dict):
        raise ValueError("Configuration must be a YAML mapping")

    validate_config(config)

    env = Environment(
        trim_blocks=True,
        lstrip_blocks=True,
        undefined=StrictUndefined,
    )
    template = env.from_string(TEMPLATE)
    return template.render(**config)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.yaml")
    args = parser.parse_args()
    print(render_ipv6_config(args.config))
```

## Step 3: Configuration

```yaml
# config.yaml
hostname: edge-01
default_gateway: "2001:db8:100::1"
interfaces:
  - name: "GigabitEthernet0/0"
    description: "Uplink"
    address: "2001:db8:100::10"
    prefix_length: 64
  - name: "GigabitEthernet0/1"
    description: "LAN"
    address: "2001:db8:200::1"
    prefix_length: 64
```

## Step 4: Apply and Verify

```bash
# Apply configuration
python3 render_ipv6_config.py --config config.yaml

# Verify functionality
python3 -c "
from ipaddress import ip_interface
print(ip_interface('2001:db8:100::10/64').with_prefixlen)
print(ip_interface('2001:db8:200::1/64').with_prefixlen)
"
```

## Step 5: Monitoring

```python
import logging
from jinja2 import Environment, make_logging_undefined

logger = logging.getLogger(__name__)
LoggingUndefined = make_logging_undefined(logger=logger)

def build_environment() -> Environment:
    """Create a Jinja2 environment that logs undefined template values."""
    return Environment(
        trim_blocks=True,
        lstrip_blocks=True,
        undefined=LoggingUndefined,
    )
```

## Conclusion

Generate IPv6 Configurations with Jinja2 requires understanding IPv6 address structure, template variables, and prefix notation. Use Python's `ipaddress` module for IPv6 validation before rendering. Log template rendering failures and missing values for easier troubleshooting. Monitor your implementation with OneUptime to detect configuration generation anomalies.
