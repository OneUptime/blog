# How to Use Ansible -vvvv for Maximum Verbosity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Verbosity, SSH

Description: Learn how to use Ansible maximum verbosity with -vvvv to debug connection issues, module execution, and playbook problems at the deepest level.

---

When things go wrong with Ansible and you have no idea why, the `-vvvv` flag is your last resort before reading source code. Maximum verbosity shows everything: SSH connection details, module transfer commands, Python execution on remote hosts, temporary file paths, and the raw JSON returned by every module. This post explains what each verbosity level shows, how to read the output, and when each level is appropriate.

## The Four Verbosity Levels

Each `-v` flag adds a layer of detail:

```bash
# Level 1: Show task results
ansible-playbook deploy.yml -v

# Level 2: Show task input parameters
ansible-playbook deploy.yml -vv

# Level 3: Show connection and execution details
ansible-playbook deploy.yml -vvv

# Level 4: Show everything including full SSH commands and transferred scripts
ansible-playbook deploy.yml -vvvv
```

You can also use the long form:

```bash
# Equivalent to -vvvv
ansible-playbook deploy.yml --verbose --verbose --verbose --verbose
```

## Level 1 (-v): Task Results

At the first level of verbosity, Ansible shows the result dictionary returned by each module:

```bash
ansible-playbook deploy.yml -v
```

Output:

```
TASK [Install nginx] **********************************************************
changed: [web-01] => {"cache_update_time": 1708534200, "cache_updated": false,
"changed": true, "stderr": "", "stdout": "Reading package lists...\nBuilding dependency tree...\n..."}
```

This is useful when you need to see what a module returned but do not need to see the internal execution details.

## Level 2 (-vv): Task Input Parameters

At level 2, Ansible also shows the parameters passed to each module:

```bash
ansible-playbook deploy.yml -vv
```

Output:

```
TASK [Install nginx] **********************************************************
task path: /home/deploy/playbooks/deploy.yml:15
changed: [web-01] => {"cache_update_time": 1708534200, ...}

TASK [Deploy configuration] ***************************************************
task path: /home/deploy/playbooks/deploy.yml:20
ok: [web-01] => {"changed": false, "checksum": "abc123...", "dest": "/etc/nginx/nginx.conf", ...}
```

You can see the file path and line number of each task, which helps locate the source when working with complex role structures.

## Level 3 (-vvv): Connection Details

This is where things get interesting. Level 3 shows SSH connection commands, module execution paths, and timing:

```bash
ansible-playbook deploy.yml -vvv
```

Output:

```
TASK [Install nginx] **********************************************************
task path: /home/deploy/playbooks/deploy.yml:15
<web-01> ESTABLISH SSH CONNECTION FOR USER: deploy
<web-01> SSH: EXEC ssh -C -o ControlMaster=auto -o ControlPersist=60s
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
  -o ConnectTimeout=10 deploy@web-01 '/bin/sh -c '"'"'echo ~deploy && sleep 0'"'"''
<web-01> (0, '/home/deploy\n', '')
<web-01> ESTABLISH SSH CONNECTION FOR USER: deploy
<web-01> SSH: EXEC ssh -C -o ControlMaster=auto -o ControlPersist=60s ...
  deploy@web-01 '/bin/sh -c '"'"'( umask 77 && mkdir -p "` echo /home/deploy/.ansible/tmp`"...
```

This level is invaluable for debugging SSH connection issues, privilege escalation problems, and module transfer failures.

## Level 4 (-vvvv): Everything

Maximum verbosity shows the complete picture, including the full content of transferred scripts and all SSH connection parameters:

```bash
ansible-playbook deploy.yml -vvvv
```

Output includes things like:

```
<web-01> SSH: EXEC ssh -vvv -C -o ControlMaster=auto -o ControlPersist=60s
  -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null
  -o 'IdentityFile="/home/deploy/.ssh/id_ed25519"'
  -o KbdInteractiveAuthentication=no -o PreferredAuthentications=gssapi-with-mic,gssapi-keyex,hostbased,publickey
  -o PasswordAuthentication=no -o ConnectTimeout=10
  -o 'ControlPath="/home/deploy/.ansible/cp/abc123"'
  deploy@10.0.1.50 '/bin/sh -c '"'"'echo PLATFORM; uname; echo FOUND;
  command -v '"'"'"'"'"'"'"'"'/usr/bin/python3'"'"'"'"'"'"'"'"';
  echo ENDFOUND'"'"''
```

This is the SSH command that Ansible actually executes, complete with all options. At this level, SSH itself also runs with `-vvv`, so you see the SSH protocol negotiation.

## Reading -vvvv Output: A Practical Guide

The output at maximum verbosity is overwhelming. Here is how to parse it for common debugging scenarios.

### Debugging SSH Connection Failures

Look for these patterns in -vvvv output:

```bash
# Run against a single host to keep output manageable
ansible-playbook deploy.yml -vvvv --limit web-01 2>&1 | head -100
```

Key lines to look for:

```
# Connection attempt
<web-01> SSH: EXEC ssh -vvv ...

# SSH authentication
debug1: Authentications that can continue: publickey
debug1: Offering public key: /home/deploy/.ssh/id_ed25519
debug1: Authentication succeeded (publickey)

# Or failure
debug1: No more authentication methods to try.
Permission denied (publickey).
```

### Debugging Module Execution

Look for the module being transferred and executed:

```
# Module being sent to the remote host
<web-01> PUT /home/deploy/.ansible/tmp/ansible-local-12345/tmpABC123 TO
  /home/deploy/.ansible/tmp/ansible-tmp-1708534200/AnsiballZ_apt.py

# Module execution
<web-01> SSH: EXEC ssh ... '/bin/sh -c '"'"'chmod u+x
  /home/deploy/.ansible/tmp/ansible-tmp-1708534200/AnsiballZ_apt.py &&
  /usr/bin/python3 /home/deploy/.ansible/tmp/ansible-tmp-1708534200/AnsiballZ_apt.py'"'"''

# Module result (raw JSON)
<web-01> (0, '{"changed": true, ...}\n', '')
```

### Debugging Become/Privilege Escalation

When `become: true` is set, look for sudo commands:

```
# sudo being invoked
<web-01> SSH: EXEC ssh ... '/bin/sh -c '"'"'echo BECOME-SUCCESS-abc123;
  /usr/bin/sudo -H -S -n -u root /bin/sh -c '"'"'"'"'"'"'"'"'echo BECOME-SUCCESS-abc123;
  /usr/bin/python3 /home/deploy/.ansible/tmp/...'"'"'"'"'"'"'"'"''"'"''
```

If privilege escalation fails, you will see sudo error messages in this output.

## Saving Verbose Output to a File

The output at -vvvv can be thousands of lines. Redirect it to a file for easier searching:

```bash
# Save verbose output to a file while still seeing normal output
ansible-playbook deploy.yml -vvvv 2>&1 | tee ansible-debug.log

# Or redirect everything to a file
ansible-playbook deploy.yml -vvvv > ansible-debug.log 2>&1

# Then search for specific patterns
grep "UNREACHABLE" ansible-debug.log
grep "Permission denied" ansible-debug.log
grep "MODULE FAILURE" ansible-debug.log
```

## Using Verbose Mode with ansible Command

The `-v` flags also work with the `ansible` ad-hoc command:

```bash
# Debug a single module call
ansible web-01 -m ping -vvvv

# Debug a command execution
ansible web-01 -m command -a "whoami" -vvvv --become

# Debug fact gathering
ansible web-01 -m setup -vvvv
```

This is often more practical than running a full playbook when you are isolating a specific issue.

## Setting Verbosity in ansible.cfg

You can set a default verbosity level:

```ini
# ansible.cfg
[defaults]
# Default verbosity (0-4)
verbosity = 1
```

I would not recommend setting this above 1 in a shared configuration. Higher levels should be opt-in via command line flags.

## Practical Debugging Scenarios

### Scenario 1: Module Argument Errors

When a module rejects arguments, -vv shows what was passed:

```bash
ansible-playbook deploy.yml -vv
```

```
TASK [Install packages] *******************************************************
task path: /home/deploy/playbooks/deploy.yml:10
fatal: [web-01]: FAILED! => {"changed": false, "msg": "Unsupported parameters for
  (apt) module: name_wrong. Supported parameters include: ..."}
```

### Scenario 2: Template Rendering Errors

When a template fails, -vvv shows the template path and the exact error:

```
TASK [Deploy config] **********************************************************
fatal: [web-01]: FAILED! => {"changed": false, "msg": "AnsibleUndefinedVariable:
  'app_port' is undefined. 'app_port' is undefined\n
  The error appears to be in '/home/deploy/playbooks/templates/app.conf.j2': line 12"}
```

### Scenario 3: Slow Playbook Runs

Use the timing information visible at -vvv to find slow tasks:

```bash
# Combine with the timer callback for task timing
ANSIBLE_CALLBACKS_ENABLED=timer ansible-playbook deploy.yml -vvv
```

## When to Use Each Level

Here is my rule of thumb:

```
-v     First pass when something fails (see the error message with context)
-vv    When you need to verify module parameters
-vvv   SSH or connection issues, privilege escalation problems
-vvvv  Last resort, SSH protocol debugging, bizarre "it works manually but not in Ansible" issues
```

Start at `-v` and work your way up. Jumping straight to `-vvvv` gives you so much information that finding the relevant line becomes its own challenge.

## Summary

Ansible verbosity levels provide progressively deeper visibility into playbook execution. Use `-v` for task results, `-vv` for input parameters, `-vvv` for connection and execution flow, and `-vvvv` for full SSH protocol debugging. Always redirect verbose output to a file when using `-vvv` or higher, and limit your target to a single host when possible. The key is to start at the lowest useful level and only increase when you need more detail.
