# How to Test Jinja2-Generated Switch Configurations in CI Before Touching Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Jinja2, Python, CI/CD

Description: Test switch configuration inputs, strict Jinja2 rendering, approved output fixtures, and platform behavior before deploying generated configuration.

A Jinja2 template can render successfully and still generate an invalid switch configuration. Missing variables, invalid VLAN references, command injection through descriptions, and whitespace mistakes belong to different failure classes. CI should check each class explicitly.

Build a pipeline with four layers: validate intent, render deterministically, compare meaningful output fixtures, and exercise the result against a supported platform. Passing the first three is valuable, but it is not proof that a particular switch release accepts every command.

## Give the renderer a small contract

For an initial access-port workflow, use a constrained structure:

```json
{
  "hostname": "access-01",
  "interfaces": [
    {"name": "GigabitEthernet1/0/10", "description": "Printer", "vlan": 120}
  ]
}
```

Treat descriptions and interface names as data. A multiline string interpolated into a configuration can become additional commands. Validate allowed characters before rendering instead of trying to escape arbitrary network CLI syntax afterward.

The following `render.py` uses an intentionally limited policy: known interface naming, a small permitted VLAN set, and single-line descriptions. These are example site rules, not universal Cisco platform limits.

```python
import re
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, StrictUndefined


def validate(data):
    if set(data) != {"hostname", "interfaces"}:
        raise ValueError("Unexpected or missing device fields")
    if not isinstance(data["hostname"], str) or not re.fullmatch(
        r"[A-Za-z][A-Za-z0-9-]{0,62}", data["hostname"]
    ):
        raise ValueError("Invalid hostname")
    ports = data["interfaces"]
    if not isinstance(ports, list) or not ports:
        raise ValueError("At least one interface is required")
    seen = set()
    for port in ports:
        if set(port) != {"name", "description", "vlan"}:
            raise ValueError("Unexpected or missing interface fields")
        name = port["name"]
        if not isinstance(name, str) or not re.fullmatch(
            r"GigabitEthernet1/0/[1-9][0-9]?", name
        ):
            raise ValueError("Unsupported interface name")
        if name in seen:
            raise ValueError("Duplicate interface")
        seen.add(name)
        description = port["description"]
        if not isinstance(description, str) or not re.fullmatch(
            r"[A-Za-z0-9 _./:-]{1,80}", description
        ):
            raise ValueError("Unsupported description")
        if type(port["vlan"]) is not int or port["vlan"] not in {120, 130}:
            raise ValueError("VLAN is outside this workflow's policy")


def render(data):
    validate(data)
    env = Environment(
        loader=FileSystemLoader(Path(__file__).parent / "templates"),
        undefined=StrictUndefined,
        autoescape=False,
        keep_trailing_newline=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    return env.get_template("access.j2").render(device=data)
```

`StrictUndefined` makes missing template variables fail instead of quietly rendering as empty strings. The environment also fixes newline and whitespace behavior. HTML autoescaping is inappropriate for CLI configuration; disabling it does not remove the need for input validation. [Jinja API reference](https://jinja.palletsprojects.com/en/stable/api/)

Add a separate inventory check that every requested interface exists on the specific device and that permitted VLANs exist at the site. A syntactically plausible name is not evidence of physical hardware.

## Keep the template literal and reviewable

Create `templates/access.j2`:

```jinja2
hostname {{ device.hostname }}
{% for port in device.interfaces %}
interface {{ port.name }}
 description {{ port.description }}
 switchport mode access
 switchport access vlan {{ port.vlan }}
{% endfor %}
```

This is a configuration fragment for supported IOS-style access switches, not a complete replacement configuration. It assumes the relevant VLANs exist and the interfaces support switchport configuration. Never feed it into a full-replace operation that expects the whole device configuration.

Keep interface order in the input. Sorting might be acceptable for independent interfaces after a deliberate policy decision, but applying the same habit to ACL entries or ordered routing policy can change behavior.

## Test good output and rejected input

A golden fixture should represent deliberately approved output. Do not regenerate it automatically whenever a test fails. Review the changed commands and their ordering first.

Create `tests/test_render.py`:

```python
import copy
import unittest
from render import render

INTENT = {
    "hostname": "access-01",
    "interfaces": [{
        "name": "GigabitEthernet1/0/10",
        "description": "Printer",
        "vlan": 120,
    }],
}
EXPECTED = (
    "hostname access-01\n"
    "interface GigabitEthernet1/0/10\n"
    " description Printer\n"
    " switchport mode access\n"
    " switchport access vlan 120\n"
)


class RenderTests(unittest.TestCase):
    def test_approved_output(self):
        self.assertEqual(render(INTENT), EXPECTED)

    def test_rejects_command_injection(self):
        bad = copy.deepcopy(INTENT)
        bad["interfaces"][0]["description"] = "Printer\n shutdown"
        with self.assertRaises(ValueError):
            render(bad)

    def test_rejects_unapproved_vlan(self):
        bad = copy.deepcopy(INTENT)
        bad["interfaces"][0]["vlan"] = 999
        with self.assertRaises(ValueError):
            render(bad)
```

Add fixtures for every supported platform and template branch, duplicate names, missing keys, empty lists, reserved resources, and boolean values supplied where integers are expected. Include a deliberately misspelled template variable to verify strict rendering itself remains enabled.

Run these tests in CI using Python's documented discovery command:

```bash
python -m unittest discover -s tests -v
```

[Python unittest documentation](https://docs.python.org/3/library/unittest.html)

## Separate offline checks from platform acceptance

Pin the Python dependencies and renderer revision used in CI. For every generated artifact, retain the intent revision, template revision, target platform, and digest. Reviewers should see the exact configuration the deploy job will consume.

For offline checks, verify that every target rendered, no unexpected files appeared, and all approved fixtures passed. A valid Python program and a valid Jinja template do not validate network command syntax.

Next, use a lab device or supported virtual image matching the production platform and release. Apply the fragment using the intended deployment method, inspect configuration readback, and test operational behavior. Where the platform offers candidate validation, use it before commit; that still does not replace forwarding checks.

CI should publish a validated artifact only after these checks pass. Deployment should consume that artifact by digest, recheck the target's current state, and use its own health and rollback protections. That preserves the value of testing between code review and the moment a switch changes.
