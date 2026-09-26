# How to Zero-Touch Provision Switches with DHCP, NetBox, and Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, NetBox, Networking, Configuration Management

Description: Connect approved NetBox inventory and rendered configurations to a controlled DHCP provisioning network, then verify and retire each switch's bootstrap access.

Zero-touch provisioning connects three different responsibilities: DHCP tells an unconfigured switch where to start, NetBox supplies approved intent, and a provisioning service publishes the exact configuration for that device. Keeping those responsibilities separate makes failures easier to diagnose and prevents a DHCP lease from becoming unrestricted configuration authority.

This example uses an Arista EOS-style bootstrap path. Other platforms use different discovery options, file formats, and installation behavior. Qualify the complete process on the exact switch model and software release before enrolling a batch.

## Start with an approved device record

Create the device in NetBox before it appears on the provisioning network. Record its serial number, platform, role, site, management interface, expected boot identity, and intended addressing. Attach configuration context and a reviewed template appropriate to that platform.

Use an explicit lifecycle in your provisioning service: approved, artifact ready, bootstrapping, validating, complete, or failed. These are application states; they do not need to be new built-in NetBox device statuses. Do not treat every newly discovered MAC address as permission to create a production device.

A MAC address or serial number reported over an unauthenticated network is an identifier, not proof of identity. Bind enrollment to an approved physical installation, a trusted provisioning segment, and device identity evidence supported by your platform.

## Render an immutable configuration artifact

NetBox can render the preferred configuration template for a device through `POST /api/dcim/devices/{id}/render-config/`. The current documentation describes template resolution from device, then role, then platform. Requesting `text/plain` gives a configuration response suitable for saving as an artifact. [NetBox configuration rendering](https://netboxlabs.com/docs/netbox/features/configuration-rendering/)

The following provisioning-service code uses a token injected into the service environment. It does not send the NetBox token to the switch:

```python
import hashlib
import os
from pathlib import Path
import requests


def render_device(device_id: int, artifact_directory: Path):
    if type(device_id) is not int or device_id <= 0:
        raise ValueError("Expected an approved numeric device ID")
    base = os.environ["NETBOX_URL"].rstrip("/")
    if not base.startswith("https://"):
        raise ValueError("NetBox access must use HTTPS")
    response = requests.post(
        f"{base}/api/dcim/devices/{device_id}/render-config/",
        headers={
            "Authorization": os.environ["NETBOX_AUTHORIZATION"],
            "Accept": "text/plain",
        },
        json={},
        timeout=(5, 30),
        allow_redirects=False,
    )
    response.raise_for_status()
    if response.status_code != 200 or not response.content.strip():
        raise RuntimeError("No configuration was rendered")
    if not response.headers.get("Content-Type", "").startswith("text/plain"):
        raise RuntimeError("Unexpected render response type")
    digest = hashlib.sha256(response.content).hexdigest()
    artifact_directory.mkdir(parents=True, exist_ok=True)
    target = artifact_directory / f"device-{device_id}-{digest}.cfg"
    with target.open("xb") as output:
        output.write(response.content)
    return target, digest
```

Run this service with a restrictive umask and controlled artifact directory. `NETBOX_AUTHORIZATION` contains the complete appropriate header value: current v2 tokens use `Bearer`, while legacy v1 tokens use `Token`. Use the scheme and token format documented for your deployed NetBox version. [NetBox REST authentication](https://netboxlabs.com/docs/netbox/integrations/rest-api/)

Validate the rendered configuration before publishing it: required management settings, permitted uplinks, valid addresses, expected platform syntax, and no secrets intended only for the controller. Record the device record revision, template revision, and artifact digest. A retry should retrieve the same approved artifact unless a new revision is deliberately authorized.

## Give known devices a bootstrap location

EOS can obtain a startup configuration or boot script using DHCP-provided information. A switch without the relevant startup configuration enters ZTP, so verify its actual boot state before investigating the server. [Arista switch provisioning](https://www.arista.com/en/qsg-7368x-series/7368x-series-configuring-the-switch), [EOS ZTP behavior](https://www.arista.com/en/assets/data/pdf/user-manual/um-books/EOS-User-Manual.pdf)

Here is a dnsmasq configuration fragment for an isolated lab network. Replace the interface and test MAC with your lab values. The artifact served over HTTP must contain no production secrets:

```ini
port=0
interface=ztp0
bind-interfaces
dhcp-range=192.0.2.100,192.0.2.150,255.255.255.0,12h
dhcp-option=option:router,192.0.2.1
dhcp-ignore=tag:!known

dhcp-host=02:00:00:00:00:10,set:access01,192.0.2.110,access-01
dhcp-option=tag:access01,option:bootfile-name,http://192.0.2.10/configs/access-01-approved.cfg
```

Dnsmasq supports per-host tags and the `known` tag used to reject unknown clients. Its DHCP options can carry the boot filename. This example is a reservation and discovery mechanism, not device authentication. [Dnsmasq manual](https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html)

Publish only validated artifacts at those paths, using atomic replacement or immutable URLs. Inspect a DHCP exchange to confirm that the expected boot option actually reaches the switch. A relay, competing DHCP server, or different client identifier can produce a lease without the intended boot information.

## Establish bootstrap trust before production

Do not promote the lab's unauthenticated HTTP example into a production credential distribution service. Provisioning needs a trusted network and an authenticated artifact delivery mechanism supported by the boot environment. Check how that environment obtains trusted roots and validates the server; ordinary browser trust assumptions may not apply.

Arista documents USB ZTP configuration that can supply a bootstrap URL and a server CA certificate. Use a supported trust-enrollment method for your release rather than disabling certificate verification to make downloads work. [Arista ZTP trust configuration](https://www.arista.com/en/um-eos/eos-recovery-procedures)

Keep enrollment tokens device scoped, short lived, and single use where the platform supports it. Avoid placing a general NetBox API token or a fleet-wide administrator password in a boot script.

## Verify completion beyond the download

A successful HTTP response proves only artifact delivery. Establish a trusted management connection and verify serial number, platform, management address, intended configuration, and relevant operational state. Check expected neighbors and a real service path before promoting the device into production.

Verify persistence through the platform's supported startup configuration process. Rehearse a subsequent reboot in the lab: a completed device should start with its approved configuration rather than unexpectedly reenter bootstrap.

On success, retire temporary enrollment access and mark the artifact assignment complete. On failure, retain the last successful stage and a bounded retry policy. A failed download should be retried without repeatedly rewriting intent or wiping an already configured switch.

Keep console access available during rollout. Troubleshoot in order-boot mode, DHCP offer, route to artifact service, artifact validation, configuration acceptance, and final health-so each failure has a specific owner and a clear recovery step.
