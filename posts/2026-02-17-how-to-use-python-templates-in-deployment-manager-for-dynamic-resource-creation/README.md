# How to Use Python Templates in Deployment Manager for Dynamic Resource Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Deployment Manager, Python Templates, Infrastructure as Code, Cloud Automation

Description: Learn how to use Python templates in Google Cloud Deployment Manager for dynamic resource generation with complex logic, API calls, and programmatic infrastructure definitions.

---

Jinja templates are great for parameterized configurations, but they hit a wall when you need real programming logic - loops with complex conditions, string manipulation, mathematical calculations, or dynamic resource generation based on runtime inputs. Python templates give you the full power of the Python language while still producing the same YAML resource definitions that Deployment Manager expects.

This guide covers how to write Python templates, when to use them over Jinja, and patterns for building sophisticated infrastructure configurations.

## How Python Templates Work

A Deployment Manager Python template is a Python file that defines a `GenerateConfig` function (or `generate_config`). This function receives a context object and returns a dictionary that Deployment Manager converts to YAML.

```python
# basic-template.py
# A minimal Python template for Deployment Manager

def GenerateConfig(context):
    """Generates Deployment Manager configuration."""

    # Build the resources list
    resources = [{
        'name': context.env['name'],
        'type': 'storage.v1.bucket',
        'properties': {
            'name': context.properties['bucketName'],
            'location': context.properties.get('location', 'US'),
            'storageClass': context.properties.get('storageClass', 'STANDARD')
        }
    }]

    return {'resources': resources}
```

The configuration file references it just like a Jinja template.

```yaml
# config.yaml
imports:
- path: basic-template.py

resources:
- name: my-bucket
  type: basic-template.py
  properties:
    bucketName: my-unique-bucket-12345
    location: US
    storageClass: NEARLINE
```

## The Context Object

The `context` parameter provides access to the same data available in Jinja templates.

```python
def GenerateConfig(context):
    # Environment variables
    deployment_name = context.env['deployment']  # Deployment name
    resource_name = context.env['name']          # Resource name from config
    project_id = context.env['project']          # GCP project ID
    project_number = context.env['project_number']  # GCP project number

    # Properties from the configuration file
    zone = context.properties['zone']
    machine_type = context.properties.get('machineType', 'e2-small')

    # Build and return resources
    resources = []
    return {'resources': resources}
```

## Dynamic Resource Generation

The real power of Python templates is generating resources programmatically. Here is a template that creates a configurable number of VM instances across multiple zones.

```python
# multi-zone-instances.py
# Creates VM instances distributed across specified zones

COMPUTE_URL = 'https://www.googleapis.com/compute/v1'

def GenerateConfig(context):
    """Creates instances distributed across zones."""

    properties = context.properties
    deployment = context.env['deployment']
    project = context.env['project']

    # Configuration
    instance_count = properties['instanceCount']
    zones = properties['zones']
    machine_type = properties.get('machineType', 'e2-small')
    image = properties.get('image', 'projects/debian-cloud/global/images/family/debian-12')
    network = properties.get('network', 'default')
    tags = properties.get('tags', [])

    resources = []
    outputs = []

    # Distribute instances across zones using round-robin
    for i in range(instance_count):
        zone = zones[i % len(zones)]
        instance_name = '{}-instance-{}'.format(deployment, i)

        # Build the instance resource
        instance = {
            'name': instance_name,
            'type': 'compute.v1.instance',
            'properties': {
                'zone': zone,
                'machineType': 'zones/{}/machineTypes/{}'.format(zone, machine_type),
                'disks': [{
                    'deviceName': 'boot',
                    'type': 'PERSISTENT',
                    'boot': True,
                    'autoDelete': True,
                    'initializeParams': {
                        'sourceImage': image,
                        'diskSizeGb': properties.get('diskSizeGb', 20)
                    }
                }],
                'networkInterfaces': [{
                    'network': 'global/networks/{}'.format(network),
                    'accessConfigs': [{
                        'name': 'External NAT',
                        'type': 'ONE_TO_ONE_NAT'
                    }]
                }],
                'tags': {
                    'items': tags
                },
                'labels': {
                    'deployment': deployment,
                    'index': str(i),
                    'role': properties.get('role', 'worker')
                },
                'metadata': {
                    'items': [{
                        'key': 'startup-script',
                        'value': properties.get('startupScript', '')
                    }]
                }
            }
        }

        resources.append(instance)

        # Add output for each instance's IP
        outputs.append({
            'name': '{}-ip'.format(instance_name),
            'value': '$(ref.{}.networkInterfaces[0].accessConfigs[0].natIP)'.format(
                instance_name)
        })

    return {
        'resources': resources,
        'outputs': outputs
    }
```

Use it from the configuration.

```yaml
# multi-zone-config.yaml
imports:
- path: multi-zone-instances.py

resources:
- name: web-cluster
  type: multi-zone-instances.py
  properties:
    instanceCount: 6
    zones:
    - us-central1-a
    - us-central1-b
    - us-central1-c
    machineType: e2-medium
    diskSizeGb: 50
    tags:
    - http-server
    role: web
    startupScript: |
      #!/bin/bash
      apt-get update && apt-get install -y nginx
      systemctl start nginx
```

This creates 6 instances, two in each zone, with proper labels and outputs for each IP address.

## Complex Networking Template

Here is a more advanced template that creates a full network environment with configurable subnets, NAT, and firewall rules.

```python
# network-environment.py
# Creates a complete network environment with VPC, subnets, Cloud NAT, and firewall

def GenerateConfig(context):
    """Creates a complete network environment."""

    props = context.properties
    deployment = context.env['deployment']
    prefix = props.get('namePrefix', deployment)

    resources = []
    outputs = []

    # Create the VPC network
    vpc_name = '{}-vpc'.format(prefix)
    resources.append({
        'name': vpc_name,
        'type': 'compute.v1.network',
        'properties': {
            'autoCreateSubnetworks': False,
            'routingConfig': {
                'routingMode': props.get('routingMode', 'REGIONAL')
            }
        }
    })

    # Create subnets
    for subnet_config in props.get('subnets', []):
        subnet_name = '{}-{}'.format(prefix, subnet_config['name'])
        subnet = {
            'name': subnet_name,
            'type': 'compute.v1.subnetwork',
            'properties': {
                'ipCidrRange': subnet_config['cidr'],
                'network': '$(ref.{}.selfLink)'.format(vpc_name),
                'region': subnet_config['region'],
                'privateIpGoogleAccess': subnet_config.get(
                    'privateGoogleAccess', True)
            }
        }

        # Add secondary ranges if specified (useful for GKE)
        if 'secondaryRanges' in subnet_config:
            subnet['properties']['secondaryIpRanges'] = [
                {
                    'rangeName': sr['name'],
                    'ipCidrRange': sr['cidr']
                }
                for sr in subnet_config['secondaryRanges']
            ]

        resources.append(subnet)
        outputs.append({
            'name': '{}-selfLink'.format(subnet_name),
            'value': '$(ref.{}.selfLink)'.format(subnet_name)
        })

    # Create Cloud Router for NAT
    if props.get('enableNat', False):
        router_name = '{}-router'.format(prefix)
        resources.append({
            'name': router_name,
            'type': 'compute.v1.router',
            'properties': {
                'network': '$(ref.{}.selfLink)'.format(vpc_name),
                'region': props['natRegion'],
                'nats': [{
                    'name': '{}-nat'.format(prefix),
                    'natIpAllocateOption': 'AUTO_ONLY',
                    'sourceSubnetworkIpRangesToNat': 'ALL_SUBNETWORKS_ALL_IP_RANGES',
                    'logConfig': {
                        'enable': True,
                        'filter': 'ERRORS_ONLY'
                    }
                }]
            }
        })

    # Create firewall rules
    for rule_config in props.get('firewallRules', []):
        rule_name = '{}-{}'.format(prefix, rule_config['name'])
        rule = {
            'name': rule_name,
            'type': 'compute.v1.firewall',
            'properties': {
                'network': '$(ref.{}.selfLink)'.format(vpc_name),
                'priority': rule_config.get('priority', 1000),
                'direction': rule_config.get('direction', 'INGRESS'),
                'allowed': _build_allowed(rule_config['allowed']),
                'sourceRanges': rule_config.get('sourceRanges', [])
            }
        }

        if 'targetTags' in rule_config:
            rule['properties']['targetTags'] = rule_config['targetTags']

        if 'description' in rule_config:
            rule['properties']['description'] = rule_config['description']

        resources.append(rule)

    # Add VPC output
    outputs.append({
        'name': 'vpcSelfLink',
        'value': '$(ref.{}.selfLink)'.format(vpc_name)
    })

    return {
        'resources': resources,
        'outputs': outputs
    }


def _build_allowed(allowed_list):
    """Builds the allowed configuration for firewall rules."""
    result = []
    for item in allowed_list:
        entry = {'IPProtocol': item['protocol']}
        if 'ports' in item:
            entry['ports'] = [str(p) for p in item['ports']]
        result.append(entry)
    return result
```

## Helper Functions and Code Organization

Python templates can import helper modules, making it easier to organize complex logic.

```python
# helpers.py
# Shared helper functions for Deployment Manager templates

def make_resource_name(prefix, suffix):
    """Creates a standardized resource name."""
    return '{}-{}'.format(prefix, suffix).lower().replace('_', '-')


def make_labels(deployment, environment, role):
    """Creates a standard set of labels."""
    return {
        'deployment': deployment,
        'environment': environment,
        'role': role,
        'managed-by': 'deployment-manager'
    }


def get_latest_image(project, family):
    """Returns the image path for the latest image in a family."""
    return 'projects/{}/global/images/family/{}'.format(project, family)
```

```python
# instance-template.py
# Uses helper functions from helpers.py
import helpers

def GenerateConfig(context):
    props = context.properties
    deployment = context.env['deployment']

    name = helpers.make_resource_name(deployment, props['role'])
    labels = helpers.make_labels(
        deployment,
        props.get('environment', 'dev'),
        props['role']
    )
    image = helpers.get_latest_image('debian-cloud', 'debian-12')

    resources = [{
        'name': name,
        'type': 'compute.v1.instance',
        'properties': {
            'zone': props['zone'],
            'machineType': 'zones/{}/machineTypes/{}'.format(
                props['zone'], props.get('machineType', 'e2-small')),
            'labels': labels,
            'disks': [{
                'deviceName': 'boot',
                'type': 'PERSISTENT',
                'boot': True,
                'autoDelete': True,
                'initializeParams': {
                    'sourceImage': image
                }
            }],
            'networkInterfaces': [{
                'network': 'global/networks/default'
            }]
        }
    }]

    return {'resources': resources}
```

Import the helper in the configuration.

```yaml
# config.yaml
imports:
- path: helpers.py
- path: instance-template.py

resources:
- name: app-server
  type: instance-template.py
  properties:
    zone: us-central1-a
    machineType: e2-medium
    role: application
    environment: production
```

## Schema Files for Python Templates

Python templates also support schema validation. The schema file has the same name with a `.schema` extension.

```yaml
# multi-zone-instances.py.schema
info:
  title: Multi-Zone Instance Template
  description: Creates VM instances distributed across zones
  version: 1.0

required:
- instanceCount
- zones

properties:
  instanceCount:
    type: integer
    description: Number of instances to create
    minimum: 1
    maximum: 100

  zones:
    type: array
    description: List of zones to distribute instances across
    minItems: 1
    items:
      type: string

  machineType:
    type: string
    description: Machine type for instances
    default: e2-small

  diskSizeGb:
    type: integer
    default: 20
    minimum: 10

  tags:
    type: array
    items:
      type: string

  startupScript:
    type: string
    description: Startup script to run on each instance
```

## When to Use Python vs Jinja

Use **Jinja templates** when:
- Your configuration is mostly static with a few parameterized values
- You need simple loops and conditionals
- The template is straightforward enough that YAML readability is valuable

Use **Python templates** when:
- You need complex logic (nested conditionals, data transformation)
- You are generating many resources dynamically
- You want to use helper functions and code reuse
- You need string manipulation or mathematical calculations
- The number of resources depends on input parameters

## Debugging Python Templates

Debug by expanding the template.

```bash
# Preview the deployment to see expanded resources
gcloud deployment-manager deployments create test \
    --config config.yaml \
    --preview

# Check the layout
gcloud deployment-manager deployments describe test \
    --format="yaml(layout)"
```

For syntax errors, Deployment Manager shows the Python traceback.

You can also test your templates locally.

```python
# test_template.py
# Local testing script for Deployment Manager templates
import json

# Mock the context object
class MockContext:
    def __init__(self):
        self.env = {
            'deployment': 'test-deployment',
            'name': 'test-resource',
            'project': 'my-project',
            'project_number': '123456789'
        }
        self.properties = {
            'instanceCount': 3,
            'zones': ['us-central1-a', 'us-central1-b'],
            'machineType': 'e2-small',
            'tags': ['http-server']
        }

# Import and test your template
from multi_zone_instances import GenerateConfig

result = GenerateConfig(MockContext())
print(json.dumps(result, indent=2))
```

```bash
# Run the test locally
python test_template.py
```

Python templates unlock the full potential of Deployment Manager for complex infrastructure configurations. They let you write real code to generate your infrastructure definitions, making it possible to handle dynamic, data-driven deployments that would be impractical with static YAML or Jinja templates.
