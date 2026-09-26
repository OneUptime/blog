# How to Automate Interactive Network Commands That Pause for Confirmation or Pagination

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Automation, Netmiko, Ansible, CLI, Python

Description: Handle confirmation prompts and pagination as bounded CLI conversations with explicit responses, completion detection, and post-command verification.

An interactive network command is a conversation. The command starts an operation, the device asks for more input, and the automation must decide whether that exact request is expected. A script that blindly sends `yes` until the prompt returns has no reliable understanding of what it approved.

Model the expected dialogue explicitly. Confirmation prompts, pagination markers, and the final command prompt are separate states with separate responses.

## Prefer Disabling Pagination

For collection commands, use the supported platform driver's terminal preparation where possible. Netmiko drivers commonly configure session pagination, and Ansible network connections rely on platform terminal behavior. Check the actual driver and device release rather than assuming one vendor's terminal command works everywhere.

If output still pauses, inspect whether the account was permitted to change terminal settings or whether the command has its own pager. A missing permission should be visible as an error, not treated as a reason to save the first page as a complete result.

Netmiko's [connection implementation](https://github.com/ktbyers/netmiko/blob/develop/netmiko/base_connection.py) includes terminal handling and read primitives. Use those documented primitives for a small adapter only when the supported driver does not cover the dialogue.

## Match a Known Confirmation Sequence

Ansible's `cli_command` supports prompt patterns and corresponding answers. For example, this task targets an IOS session where the tested save dialogue asks for the destination filename:

```yaml
- name: Persist the approved running configuration
  ansible.netcommon.cli_command:
    command: copy running-config startup-config
    prompt:
      - 'Destination filename \[startup-config\]\?'
    answer:
      - "\r"
    check_all: true
  when: persist_approved_configuration | default(false) | bool
```

This is a mutating operation: it saves all current running configuration, including any unsaved changes made outside this job. Use it only in a workflow whose approval covers that persistence. A vendor configuration module with a documented save policy is often a better choice for routine configuration management.

The [official module reference](https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_command_module.html) describes prompt regexes, answer ordering, and `check_all`. If your device sometimes skips a prompt, a task requiring all prompts will time out; that is a different dialogue and needs explicit handling. Do not weaken the match to accept unrelated questions.

## Represent Netmiko Exchanges as States

For the same lab-tested save dialogue, Netmiko can wait for either the destination question or the final prompt. A final prompt without the question can be legitimate on a configured platform, but it is not by itself proof that saving succeeded:

```python
import re

prompt = re.escape(connection.find_prompt()) + r"\s*$"
question = r"Destination filename \[startup-config\]\?"
output = connection.send_command(
    "copy running-config startup-config",
    expect_string=rf"(?:{question}|{prompt})",
    read_timeout=60,
    strip_prompt=False,
    strip_command=False,
)
if re.search(question, output):
    output += connection.send_command(
        "\n",
        expect_string=prompt,
        read_timeout=60,
        cmd_verify=False,
        strip_prompt=False,
        strip_command=False,
    )
```

Here, `connection` is an authenticated, authorized Netmiko connection to the tested IOS device. After this exchange, inspect platform-specific success or error output and verify startup configuration with an appropriate read. Do not retry the save merely because the transport timed out; reconnect and establish what happened first.

The project's [interactive command examples](https://github.com/ktbyers/netmiko/blob/develop/EXAMPLES.md) demonstrate this use of `expect_string`. Keep the expected questions close to the command definition so reviewers can see exactly which responses automation will send.

## Bound an Unavoidable Pager Loop

For a read-only command on a CLI whose pager cannot be disabled, implement a finite loop. The example below assumes the exact literal pager marker `--More--`, a raw space to advance, and a known final prompt. Those assumptions must come from a captured device transcript.

```python
import re
import time


def read_paged(connection, command, literal_prompt, timeout=90, max_pages=100):
    if "\n" in command or "\r" in command:
        raise ValueError("Expected one approved command")
    prompt = re.escape(literal_prompt) + r"[ \t]*$"
    marker = r"--More--"
    pattern = rf"(?:{marker}|{prompt})"
    deadline = time.monotonic() + timeout
    chunks = []
    connection.write_channel(command + "\n")
    for _ in range(max_pages):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("Pager deadline exceeded")
        chunk = connection.read_until_pattern(
            pattern=pattern, read_timeout=remaining
        )
        chunks.append(chunk)
        if re.search(prompt, chunk):
            return "".join(chunks)
        if marker not in chunk:
            raise RuntimeError("Unexpected pager state")
        connection.write_channel(" ")
    raise RuntimeError("Pager limit exceeded")
```

Use this function only after clearing known session setup output and synchronizing to the command prompt. It returns a transcript, including pager and terminal artifacts. Normalize those artifacts separately using tested rules before parsing the command data. Devices that emit ANSI sequences, backspaces, or different continuation keys need their own adapter.

A timeout or page-limit failure must not produce a successful collection artifact. Close the session or return it to a verified idle state before any later command.

## Verify the Outcome, Not Just the Dialogue

A final prompt means the CLI is ready again. It can follow a successful command, a rejected command, or a canceled operation. Pair mutating commands with a state query; pair collection commands with output completeness checks.

Test the dialogue with missing prompts, unexpected questions, delayed pages, command errors, and a page-limit breach. Log the command identifier, state transitions, duration, and result without broadly exposing sensitive output. These checks make interactive automation predictable enough to operate when devices are slow or their firmware changes.
