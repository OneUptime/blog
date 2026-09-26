# Debug Netmiko ReadTimeout and 'Prompt Not Found' Errors on Unsupported CLIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netmiko, Network Automation, Troubleshooting, Python, CLI

Description: Diagnose Netmiko timeouts by separating SSH setup, driver preparation, command echo, prompt matching, and unsupported CLI behavior.

A Netmiko `ReadTimeout` often means that the expected text never arrived, not that the device was unreachable. The missing text might be a command echo, the final prompt, a confirmation request, or the response to a terminal-setup command issued by the selected driver.

On an unsupported CLI, increasing every timeout can make the failure slower without making it more understandable. Identify the exact stage where the session stops progressing before changing connection behavior.

## Separate the Failure Stages

| Stage | Evidence to collect | Likely direction |
|---|---|---|
| TCP and SSH negotiation | Whether an interactive SSH session connects | Routing, SSH service, host key, algorithms |
| Authentication | Whether credentials are accepted | Account, AAA, login policy |
| Driver preparation | Last terminal command sent during connection | Wrong driver or unsupported terminal commands |
| Command echo | Device response after a specific command | Echo behavior or unexpected dialogue |
| Output completion | Last output, pager marker, final prompt | Prompt pattern, pagination, slow command |

`conn_timeout`, `auth_timeout`, and a command's `read_timeout` address different stages. Keep that distinction in incident notes so a later maintainer does not inherit a collection of unexplained large timeout values.

The [Netmiko connection API](https://ktbyers.github.io/netmiko/docs/netmiko/) documents the relevant connection arguments and command methods. Use the API supported by your installed version; older delay-factor examples are not a good starting point for current timeout diagnosis.

## Reproduce One Harmless Command

Use a single lab device, one known read-only command, and a protected transcript. The following example assumes a supported IOS device and preverified SSH known hosts:

```python
import os
import re
from netmiko import ConnectHandler

os.umask(0o077)
with ConnectHandler(
    device_type="cisco_ios",
    host="192.0.2.51",
    username=os.environ["NETWORK_USERNAME"],
    password=os.environ["NETWORK_PASSWORD"],
    ssh_strict=True,
    system_host_keys=True,
    conn_timeout=15,
    auth_timeout=20,
    session_log="restricted-session.log",
) as connection:
    prompt = connection.find_prompt()
    print("Observed prompt:", repr(prompt))
    output = connection.send_command(
        "show version",
        expect_string=re.escape(prompt) + r"\s*$",
        read_timeout=60,
    )
    print("Received characters:", len(output))
```

Inspect the transcript locally. It can contain configuration, identifiers, and other sensitive output even when password masking is enabled. Share only a redacted minimal reproduction.

Capture the actual prompt rather than assuming it ends with `#`. A prompt can contain parentheses, brackets, punctuation, or mode-specific suffixes. `expect_string` is a regular expression, so escaping a literal prompt matters. A broad pattern such as `#` can also match ordinary command output prematurely.

## Check Whether the Driver Fits

Netmiko's platform driver may perform initial prompt discovery and terminal setup during `ConnectHandler`. If construction fails, a `read_timeout` passed later to `send_command` cannot fix it.

Confirm the device family and operating system, not just the vendor name. A console server, firewall manager, and switch from the same manufacturer can have different login and prompt behavior. Review the driver's preparation method against your captured transcript.

For a genuinely unsupported CLI, the [`terminal_server` driver](https://ktbyers.github.io/netmiko/docs/netmiko/terminal_server/terminal_server.html) avoids the normal platform-specific session preparation. It can be useful for a controlled diagnostic adapter, but it does not magically add platform support.

The following fragment demonstrates the pattern inside a connection created with `device_type="terminal_server"`. Substitute a literal prompt verified from your appliance:

```python
import re

expected_prompt = "appliance>"
connection.write_channel("\n")
connection.read_until_pattern(
    pattern=re.escape(expected_prompt) + r"[ \t]*$",
    read_timeout=20,
)
```

If login leads to a menu or a second authentication prompt, handle that documented dialogue explicitly before executing commands. You are now responsible for terminal settings, prompt transitions, privilege behavior, and cleanup. A maintained custom driver may be appropriate once the behavior is understood.

## Distinguish Echo from Completion

By default, `send_command` can verify the command echo before waiting for completion. A CLI that suppresses echo can fail at that stage even if the final prompt pattern is correct.

Only when the transcript establishes that behavior, test a narrow override:

```python
output = connection.send_command(
    "show version",
    expect_string=re.escape(expected_prompt) + r"[ \t]*$",
    cmd_verify=False,
    read_timeout=60,
)
```

The command is illustrative; use an actual supported read-only command for the appliance. Disabling echo verification removes one synchronization check. It should not become a global workaround for arbitrary failures.

Netmiko's [base connection implementation](https://github.com/ktbyers/netmiko/blob/develop/netmiko/base_connection.py) is useful when the error message does not reveal which read operation raised the timeout.

## Use Timing-Based Reads with a Clear Contract

`send_command_timing` uses output timing rather than a final prompt pattern. It can help with a known interactive exchange, but a quiet period does not prove the device has finished. A slow command can pause, then emit more output later.

The project's [interactive command examples](https://github.com/ktbyers/netmiko/blob/develop/EXAMPLES.md) show both pattern-based and timing-based approaches. Prefer a deterministic final marker when the device provides one. Keep a total deadline and explicitly recognize confirmation and pagination states.

## Turn the Fix into a Regression Fixture

Save redacted transcripts for a normal prompt, delayed output, an error response, pagination, and each supported mode transition. Test the prompt regular expression against lines that should and should not match.

Then repeat the command on the actual device release. A successful parser fixture proves your matching logic, while a lab session proves the device dialogue. Record both the selected driver and the reason for any nondefault setting. The resulting adapter should fail clearly when the CLI changes, instead of silently collecting partial output.
