# How to Use Python Paramiko for Basic SSH Network Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Paramiko, Python, SSH, Network Automation, Cisco

Description: Learn how to use Python Paramiko to connect to network devices via SSH and run commands, as a lower-level alternative to Netmiko for basic automation tasks.

## What Is Paramiko?

Paramiko is a Python library implementing the SSH protocol. Unlike Netmiko (which is built on Paramiko), Paramiko provides lower-level SSH access - useful when:
- Netmiko doesn't support your device type
- You need SSH tunneling or SFTP
- You want fine-grained control over the SSH session

## Step 1: Install Paramiko

```bash
pip install paramiko cryptography

python3 -c "import paramiko; print(paramiko.__version__)"
```

## Step 2: Basic SSH Connection and Command Execution

If the remote SSH server supports exec requests, you can use `exec_command()` to run a single command. Many network devices require an interactive shell instead, which is covered in Step 3.

```python
import paramiko

# Create SSH client

client = paramiko.SSHClient()

# Trust the host key automatically for this demo
# (in production, verify host keys with load_system_host_keys() and RejectPolicy)
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

# Connect to device
client.connect(
    hostname='192.168.1.1',
    port=22,
    username='admin',
    password='password',
    timeout=10,
    look_for_keys=False,
    allow_agent=False
)

# Execute a command
stdin, stdout, stderr = client.exec_command('show version')

# Read output
output = stdout.read().decode('utf-8')
error = stderr.read().decode('utf-8')

print(output)
if error:
    print(f"Error: {error}")

client.close()
```

## Step 3: Interactive Shell (for Cisco IOS Enable Mode)

Many Cisco IOS automation tasks work better in interactive mode, and privileged EXEC commands require entering enable mode:

```python
import paramiko
import time

def read_until_idle(shell, idle_timeout=0.5, overall_timeout=5):
    """Read from the channel until no new data arrives for idle_timeout seconds."""
    output = []
    start_time = time.time()
    last_data_time = start_time

    while time.time() - start_time < overall_timeout:
        if shell.recv_ready():
            output.append(shell.recv(65535).decode('utf-8', errors='replace'))
            last_data_time = time.time()
        elif output and time.time() - last_data_time >= idle_timeout:
            break
        else:
            time.sleep(0.1)

    return ''.join(output)

def send_command(shell, command, overall_timeout=5):
    shell.send(command + '\n')
    return read_until_idle(shell, overall_timeout=overall_timeout)

def cisco_ios_command(hostname, username, password, enable_password, commands):
    """Run commands on Cisco IOS using interactive shell."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password,
                   timeout=10, look_for_keys=False, allow_agent=False)

    # Open interactive shell
    shell = client.invoke_shell()
    time.sleep(1)
    read_until_idle(shell)   # Clear login banner and initial prompt

    # Enter enable mode
    send_command(shell, 'enable')
    send_command(shell, enable_password)

    # Disable paging (prevent --More-- prompts)
    send_command(shell, 'terminal length 0')

    # Execute each command
    outputs = {}
    for cmd in commands:
        outputs[cmd] = send_command(shell, cmd, overall_timeout=10)

    client.close()
    return outputs

# Example usage
results = cisco_ios_command(
    hostname='192.168.1.1',
    username='admin',
    password='userpass',
    enable_password='enablepass',
    commands=['show ip interface brief', 'show ip route', 'show version']
)

for cmd, output in results.items():
    print(f"\n=== {cmd} ===\n{output}")
```

## Step 4: Read Files via SFTP

```python
import paramiko

def read_remote_file(hostname, username, password, remote_path):
    """Read a file from a remote Linux server via SFTP."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)

    # Open SFTP session
    sftp = client.open_sftp()

    with sftp.open(remote_path, 'r') as f:
        content = f.read().decode('utf-8')

    sftp.close()
    client.close()
    return content

# Read a configuration file from a Linux router
config = read_remote_file('192.168.1.50', 'admin', 'pass', '/etc/frr/frr.conf')
print(config)
```

## Step 5: SSH Key Authentication

Authentication method is separate from how you open the SSH channel. This example uses `exec_command()` for brevity; if your device requires an interactive shell, connect with the same key-based method and then use `invoke_shell()` as shown in Step 3.

```python
import paramiko

def connect_with_key(hostname, username, key_path, passphrase=None):
    """Connect using SSH private key (more secure than password)."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    client.connect(
        hostname=hostname,
        username=username,
        key_filename=key_path,
        passphrase=passphrase,
        look_for_keys=False,
        allow_agent=False,
    )

    stdin, stdout, stderr = client.exec_command('show ip interface brief')
    output = stdout.read().decode('utf-8')
    client.close()
    return output

output = connect_with_key('192.168.1.1', 'admin', '/home/user/.ssh/network_key')
print(output)
```

## Step 6: Robust Multi-Device Automation

```python
import paramiko
import time
from concurrent.futures import ThreadPoolExecutor

def read_until_idle(shell, idle_timeout=0.5, overall_timeout=5):
    """Read from the channel until no new data arrives for idle_timeout seconds."""
    output = []
    start_time = time.time()
    last_data_time = start_time

    while time.time() - start_time < overall_timeout:
        if shell.recv_ready():
            output.append(shell.recv(65535).decode('utf-8', errors='replace'))
            last_data_time = time.time()
        elif output and time.time() - last_data_time >= idle_timeout:
            break
        else:
            time.sleep(0.1)

    return ''.join(output)

def send_command(shell, command, overall_timeout=5):
    shell.send(command + '\n')
    return read_until_idle(shell, overall_timeout=overall_timeout)

def run_command_on_device(device):
    """Run commands on a device with proper error handling."""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=device['host'],
            username=device['username'],
            password=device['password'],
            timeout=10,
            look_for_keys=False,
            allow_agent=False,
        )

        shell = client.invoke_shell()
        time.sleep(1)
        read_until_idle(shell)

        if device.get('enable_password'):
            send_command(shell, 'enable')
            send_command(shell, device['enable_password'])
            send_command(shell, 'terminal length 0')

        results = {}
        for cmd in device.get('commands', []):
            results[cmd] = send_command(shell, cmd, overall_timeout=10)

        return {'host': device['host'], 'results': results}

    except paramiko.AuthenticationException:
        return {'host': device['host'], 'error': 'Authentication failed'}
    except Exception as e:
        return {'host': device['host'], 'error': str(e)}
    finally:
        client.close()

devices = [
    {'host': '192.168.1.1', 'username': 'admin', 'password': 'pass',
     'enable_password': 'ep', 'commands': ['show version', 'show ip route']},
    {'host': '192.168.1.2', 'username': 'admin', 'password': 'pass',
     'enable_password': 'ep', 'commands': ['show version', 'show ip route']},
]

with ThreadPoolExecutor(max_workers=5) as executor:
    results = list(executor.map(run_command_on_device, devices))

for result in results:
    if 'error' in result:
        print(f"{result['host']}: ERROR - {result['error']}")
    else:
        print(f"{result['host']}: {len(result['results'])} commands executed")
```

## Conclusion

Paramiko provides raw SSH access to network devices. If the device supports SSH exec requests, you can use `exec_command()` for one-off commands; for many Cisco IOS automation tasks, use `invoke_shell()` with `terminal length 0` to disable paging. Handle enable mode by sending the enable command followed by the enable password. While Paramiko works for any SSH device, consider Netmiko for Cisco-specific automation as it handles paging, enable mode, and configuration mode automatically. Use Paramiko directly when you need SFTP, SSH tunneling, or support for non-standard devices.
