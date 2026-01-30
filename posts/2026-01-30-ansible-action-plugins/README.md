# How to Create Ansible Action Plugins

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Automation, Plugins, Python

Description: Build custom Ansible action plugins to execute logic on the control node before delegating to remote hosts for complex task orchestration.

---

## What Are Action Plugins?

Action plugins run on the Ansible control node, not on the remote hosts. They execute before the actual module runs and can modify task arguments, gather local information, or even bypass module execution entirely. This makes them useful for tasks that require controller-side logic.

Common use cases include:

- Preprocessing data before sending it to remote hosts
- Validating inputs locally before execution
- Implementing complex conditional logic
- Templating files locally before transfer
- Aggregating results from multiple hosts

## Action Plugins vs Modules

Understanding when to use action plugins versus modules is critical for proper Ansible architecture.

| Feature | Action Plugin | Module |
|---------|---------------|--------|
| Execution location | Control node | Remote host |
| Access to local filesystem | Yes | No |
| Access to task_vars | Yes | Limited (via args) |
| Can modify module args | Yes | No |
| Can skip module execution | Yes | No |
| Network overhead | Lower for local ops | Higher |
| Requires Python on remote | No (for local logic) | Yes (for Python modules) |

## Project Structure

Before writing code, set up your project structure. Ansible looks for action plugins in specific locations.

```
my_collection/
├── plugins/
│   ├── action/
│   │   └── my_action.py
│   └── modules/
│       └── my_action.py
├── galaxy.yml
└── README.md
```

For standalone roles or playbooks:

```
playbook_dir/
├── action_plugins/
│   └── my_action.py
├── library/
│   └── my_action.py
└── site.yml
```

## The ActionBase Class

All action plugins inherit from `ActionBase`. This base class provides methods for module execution, file transfer, and connection management.

Here is a minimal action plugin skeleton:

```python
# action_plugins/my_action.py
from ansible.plugins.action import ActionBase
from ansible.errors import AnsibleError


class ActionModule(ActionBase):
    """
    Custom action plugin that runs on the control node.
    The class must be named ActionModule for Ansible to discover it.
    """

    def run(self, tmp=None, task_vars=None):
        """
        Main entry point for the action plugin.

        Args:
            tmp: Deprecated parameter, kept for backwards compatibility
            task_vars: Dictionary containing all variables available to the task

        Returns:
            dict: Result dictionary with keys like 'changed', 'failed', 'msg'
        """
        # Always call the parent run method first
        # This handles common setup and returns a base result dict
        result = super(ActionModule, self).run(tmp, task_vars)

        # Initialize task_vars if not provided
        if task_vars is None:
            task_vars = {}

        # Your custom logic here
        result['changed'] = False
        result['msg'] = 'Action completed successfully'

        return result
```

## Accessing Task Arguments

Task arguments come from the playbook task definition. Access them through `self._task.args`.

```python
# action_plugins/validate_config.py
from ansible.plugins.action import ActionBase
from ansible.errors import AnsibleError, AnsibleActionFail


class ActionModule(ActionBase):
    """
    Validates configuration parameters before applying them.
    """

    # Define required and optional arguments for documentation and validation
    REQUIRED_ARGS = ['config_path', 'schema']
    OPTIONAL_ARGS = ['strict_mode', 'backup']

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        # Extract arguments from the task
        config_path = self._task.args.get('config_path')
        schema = self._task.args.get('schema')
        strict_mode = self._task.args.get('strict_mode', False)
        backup = self._task.args.get('backup', True)

        # Validate required arguments
        missing_args = []
        for arg in self.REQUIRED_ARGS:
            if self._task.args.get(arg) is None:
                missing_args.append(arg)

        if missing_args:
            raise AnsibleActionFail(
                f"Missing required arguments: {', '.join(missing_args)}"
            )

        # Perform validation logic
        try:
            validation_result = self._validate_config(
                config_path, schema, strict_mode
            )
            result['changed'] = False
            result['valid'] = validation_result['valid']
            result['errors'] = validation_result.get('errors', [])
        except Exception as e:
            result['failed'] = True
            result['msg'] = f"Validation failed: {str(e)}"

        return result

    def _validate_config(self, config_path, schema, strict_mode):
        """
        Internal method for configuration validation.
        Separate business logic from Ansible integration.
        """
        # Implementation here
        return {'valid': True, 'errors': []}
```

## Working with task_vars

The `task_vars` dictionary contains all variables available to the current task. This includes facts, registered variables, inventory variables, and more.

```python
# action_plugins/dynamic_config.py
from ansible.plugins.action import ActionBase
from ansible.template import Templar
from ansible.errors import AnsibleError


class ActionModule(ActionBase):
    """
    Generates dynamic configuration based on host facts and variables.
    """

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        # Access common variables
        inventory_hostname = task_vars.get('inventory_hostname')
        ansible_facts = task_vars.get('ansible_facts', {})
        hostvars = task_vars.get('hostvars', {})
        group_names = task_vars.get('group_names', [])

        # Access custom variables defined in inventory or playbook
        environment = task_vars.get('environment', 'development')
        app_config = task_vars.get('app_config', {})

        # Use the Templar for variable interpolation
        # This handles Jinja2 templates in variable values
        templar = Templar(loader=self._loader, variables=task_vars)

        template_string = self._task.args.get('template', '')
        rendered_template = templar.template(template_string)

        # Access facts from other hosts via hostvars
        db_hosts = []
        for host in hostvars:
            if 'database' in hostvars[host].get('group_names', []):
                db_host_facts = hostvars[host].get('ansible_facts', {})
                db_hosts.append({
                    'hostname': host,
                    'ip': db_host_facts.get('default_ipv4', {}).get('address')
                })

        result['changed'] = False
        result['config'] = {
            'hostname': inventory_hostname,
            'environment': environment,
            'db_hosts': db_hosts,
            'rendered_template': rendered_template
        }

        return result
```

## Executing Modules from Action Plugins

Action plugins can execute modules on remote hosts using `_execute_module`. This is the primary way to delegate work to remote systems.

```python
# action_plugins/smart_copy.py
from ansible.plugins.action import ActionBase
from ansible.errors import AnsibleError
import os
import hashlib


class ActionModule(ActionBase):
    """
    Smart file copy that only transfers when content differs.
    Computes checksum locally and compares with remote before transfer.
    """

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        src = self._task.args.get('src')
        dest = self._task.args.get('dest')

        if not src or not dest:
            result['failed'] = True
            result['msg'] = 'src and dest are required'
            return result

        # Resolve the source path on the control node
        src_path = self._find_needle('files', src)

        # Calculate local checksum
        local_checksum = self._calculate_checksum(src_path)

        # Execute the stat module on the remote host to get remote file info
        stat_result = self._execute_module(
            module_name='ansible.builtin.stat',
            module_args={'path': dest, 'checksum_algorithm': 'sha256'},
            task_vars=task_vars
        )

        remote_exists = stat_result.get('stat', {}).get('exists', False)
        remote_checksum = stat_result.get('stat', {}).get('checksum', '')

        # Compare checksums to determine if copy is needed
        if remote_exists and remote_checksum == local_checksum:
            result['changed'] = False
            result['msg'] = 'File already exists with matching checksum'
            return result

        # Perform the actual copy using the copy module
        copy_result = self._execute_module(
            module_name='ansible.builtin.copy',
            module_args={
                'src': src_path,
                'dest': dest,
                'checksum': local_checksum
            },
            task_vars=task_vars
        )

        # Merge the copy result into our result
        result.update(copy_result)

        return result

    def _calculate_checksum(self, path):
        """Calculate SHA256 checksum of a local file."""
        sha256_hash = hashlib.sha256()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
```

## Transferring Files to Remote Hosts

For file operations, use `_transfer_file` to copy files from the control node to remote hosts.

```python
# action_plugins/template_and_deploy.py
from ansible.plugins.action import ActionBase
from ansible.template import Templar
from ansible.errors import AnsibleError
import tempfile
import os


class ActionModule(ActionBase):
    """
    Renders a template locally and deploys it to the remote host.
    Provides more control than the built-in template module.
    """

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        src = self._task.args.get('src')
        dest = self._task.args.get('dest')
        mode = self._task.args.get('mode', '0644')
        owner = self._task.args.get('owner')
        group = self._task.args.get('group')

        # Find the template file
        template_path = self._find_needle('templates', src)

        # Read template content
        with open(template_path, 'r') as f:
            template_content = f.read()

        # Render the template using Templar
        templar = Templar(loader=self._loader, variables=task_vars)
        rendered_content = templar.template(template_content)

        # Create a temporary file with rendered content
        # This file will be transferred to the remote host
        fd, tmp_src = tempfile.mkstemp()
        try:
            with os.fdopen(fd, 'w') as f:
                f.write(rendered_content)

            # Get a temporary directory on the remote host
            remote_tmp = self._make_tmp_path()

            # Transfer the file to the remote temporary location
            tmp_dest = self._connection._shell.join_path(
                remote_tmp, os.path.basename(src)
            )
            self._transfer_file(tmp_src, tmp_dest)

            # Use the copy module to move file to final destination
            # This handles permissions, ownership, and atomic operations
            copy_args = {
                'src': tmp_dest,
                'dest': dest,
                'mode': mode,
                'remote_src': True
            }
            if owner:
                copy_args['owner'] = owner
            if group:
                copy_args['group'] = group

            copy_result = self._execute_module(
                module_name='ansible.builtin.copy',
                module_args=copy_args,
                task_vars=task_vars
            )

            result.update(copy_result)

            # Clean up remote temporary directory
            self._remove_tmp_path(remote_tmp)

        finally:
            # Clean up local temporary file
            os.remove(tmp_src)

        return result
```

## Handling Async Operations

Action plugins can handle asynchronous task execution using `_execute_module` with async parameters.

```python
# action_plugins/async_deploy.py
from ansible.plugins.action import ActionBase
from ansible.errors import AnsibleError
import time


class ActionModule(ActionBase):
    """
    Deploys application with async support for long-running operations.
    """

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        deploy_script = self._task.args.get('script')
        timeout = self._task.args.get('timeout', 300)
        poll_interval = self._task.args.get('poll', 10)

        # Check if task is configured for async execution
        # async and poll are set at the task level in the playbook
        async_val = self._task.async_val
        poll_val = self._task.poll

        if async_val:
            # Execute module asynchronously
            # The module will return a job ID immediately
            async_result = self._execute_module(
                module_name='ansible.builtin.shell',
                module_args={'cmd': deploy_script},
                task_vars=task_vars,
                wrap_async=True
            )

            if poll_val == 0:
                # Fire and forget mode
                # Return job info for later polling
                result['ansible_job_id'] = async_result.get('ansible_job_id')
                result['started'] = 1
                result['finished'] = 0
                result['changed'] = True
                return result

            # Poll for completion
            job_id = async_result.get('ansible_job_id')

            for _ in range(0, timeout, poll_interval):
                time.sleep(poll_interval)

                poll_result = self._execute_module(
                    module_name='ansible.builtin.async_status',
                    module_args={'jid': job_id},
                    task_vars=task_vars
                )

                if poll_result.get('finished'):
                    result.update(poll_result)
                    return result

            # Timeout reached
            result['failed'] = True
            result['msg'] = f'Async task did not complete within {timeout} seconds'
            return result

        # Synchronous execution
        module_result = self._execute_module(
            module_name='ansible.builtin.shell',
            module_args={'cmd': deploy_script},
            task_vars=task_vars
        )

        result.update(module_result)
        return result
```

## Connection Plugin Interaction

Action plugins interact with connection plugins through `self._connection`. This allows for direct communication with remote hosts.

```python
# action_plugins/connection_aware.py
from ansible.plugins.action import ActionBase
from ansible.errors import AnsibleError


class ActionModule(ActionBase):
    """
    Demonstrates interaction with the connection plugin.
    """

    # Mark which connection types this action plugin supports
    # Set to True to support all connection types
    _VALID_CONNECTIONS = frozenset(['ssh', 'paramiko', 'local'])

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        # Get connection type
        connection_type = self._connection._shell.SHELL_FAMILY

        # Check if connection is supported
        if connection_type not in self._VALID_CONNECTIONS:
            result['failed'] = True
            result['msg'] = f'Connection type {connection_type} not supported'
            return result

        # Execute a command directly through the connection
        # This bypasses module execution
        cmd = self._task.args.get('command', 'whoami')

        # Low-level command execution
        # Returns (return_code, stdout, stderr)
        rc, stdout, stderr = self._connection.exec_command(cmd)

        result['rc'] = rc
        result['stdout'] = stdout.read().decode('utf-8')
        result['stderr'] = stderr.read().decode('utf-8')
        result['changed'] = False

        if rc != 0:
            result['failed'] = True
            result['msg'] = f'Command failed with return code {rc}'

        return result
```

## Check Mode and Diff Mode Support

Proper action plugins should respect check mode and diff mode settings.

```python
# action_plugins/config_update.py
from ansible.plugins.action import ActionBase
from ansible.errors import AnsibleError


class ActionModule(ActionBase):
    """
    Updates configuration files with check mode and diff support.
    """

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        config_file = self._task.args.get('path')
        updates = self._task.args.get('updates', {})

        # Check if running in check mode
        check_mode = self._play_context.check_mode

        # Check if diff mode is enabled
        diff_mode = self._play_context.diff

        # Get current configuration from remote host
        current_config = self._get_remote_config(config_file, task_vars)

        # Calculate new configuration
        new_config = self._merge_config(current_config, updates)

        # Determine if changes are needed
        has_changes = current_config != new_config

        if diff_mode and has_changes:
            # Provide diff information for the user
            result['diff'] = {
                'before': current_config,
                'after': new_config,
                'before_header': f'{config_file} (current)',
                'after_header': f'{config_file} (updated)'
            }

        if check_mode:
            # In check mode, report what would change without making changes
            result['changed'] = has_changes
            result['msg'] = 'Changes would be made' if has_changes else 'No changes needed'
            return result

        if not has_changes:
            result['changed'] = False
            result['msg'] = 'Configuration already up to date'
            return result

        # Apply changes
        apply_result = self._apply_config(config_file, new_config, task_vars)
        result.update(apply_result)
        result['changed'] = True

        return result

    def _get_remote_config(self, path, task_vars):
        """Fetch current configuration from remote host."""
        slurp_result = self._execute_module(
            module_name='ansible.builtin.slurp',
            module_args={'src': path},
            task_vars=task_vars
        )
        import base64
        if not slurp_result.get('failed'):
            content = base64.b64decode(slurp_result['content']).decode('utf-8')
            return content
        return ''

    def _merge_config(self, current, updates):
        """Merge updates into current configuration."""
        # Implementation depends on config format
        return current

    def _apply_config(self, path, content, task_vars):
        """Write new configuration to remote host."""
        return self._execute_module(
            module_name='ansible.builtin.copy',
            module_args={'content': content, 'dest': path},
            task_vars=task_vars
        )
```

## Error Handling Best Practices

Proper error handling makes action plugins robust and debuggable.

```python
# action_plugins/robust_action.py
from ansible.plugins.action import ActionBase
from ansible.errors import (
    AnsibleError,
    AnsibleActionFail,
    AnsibleActionSkip,
    AnsibleConnectionFailure
)
from ansible.module_utils.common.text.converters import to_native


class ActionModule(ActionBase):
    """
    Demonstrates comprehensive error handling patterns.
    """

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        try:
            # Validation errors - fail immediately with clear message
            required_param = self._task.args.get('required_param')
            if not required_param:
                raise AnsibleActionFail('required_param is mandatory')

            # Skip conditions - skip task without failure
            skip_when = self._task.args.get('skip_when', False)
            if skip_when:
                raise AnsibleActionSkip('Skipping due to skip_when condition')

            # Connection errors - handle gracefully
            try:
                module_result = self._execute_module(
                    module_name='ansible.builtin.ping',
                    module_args={},
                    task_vars=task_vars
                )
            except AnsibleConnectionFailure as e:
                result['failed'] = True
                result['msg'] = f'Connection failed: {to_native(e)}'
                result['unreachable'] = True
                return result

            # Module execution errors
            if module_result.get('failed'):
                result['failed'] = True
                result['msg'] = module_result.get('msg', 'Module execution failed')
                result['module_stdout'] = module_result.get('stdout', '')
                result['module_stderr'] = module_result.get('stderr', '')
                return result

            # Success path
            result['changed'] = False
            result['msg'] = 'Action completed successfully'

        except AnsibleActionFail:
            # Re-raise action failures
            raise
        except AnsibleActionSkip:
            # Re-raise skip conditions
            raise
        except Exception as e:
            # Catch unexpected errors and provide useful debug info
            result['failed'] = True
            result['msg'] = f'Unexpected error: {to_native(e)}'
            result['exception'] = to_native(e)

            # Include traceback in verbose mode
            import traceback
            result['traceback'] = traceback.format_exc()

        return result
```

## Testing Action Plugins

Testing action plugins requires mocking Ansible internals. Here is a test structure using pytest.

```python
# tests/unit/plugins/action/test_my_action.py
import pytest
from unittest.mock import MagicMock, patch
from ansible.playbook.task import Task
from ansible.template import Templar
from ansible.parsing.dataloader import DataLoader

# Import the action plugin
import sys
sys.path.insert(0, 'plugins/action')
from my_action import ActionModule


class TestMyAction:
    """Unit tests for my_action plugin."""

    @pytest.fixture
    def action_plugin(self):
        """Create an action plugin instance with mocked dependencies."""
        # Mock the task
        task = MagicMock(spec=Task)
        task.args = {}
        task.async_val = 0
        task.poll = 0

        # Mock the connection
        connection = MagicMock()
        connection._shell.SHELL_FAMILY = 'sh'
        connection._shell.join_path = lambda *args: '/'.join(args)

        # Mock the play context
        play_context = MagicMock()
        play_context.check_mode = False
        play_context.diff = False

        # Mock the loader
        loader = DataLoader()

        # Mock the shared loader
        shared_loader = MagicMock()

        # Create the action plugin
        action = ActionModule(
            task=task,
            connection=connection,
            play_context=play_context,
            loader=loader,
            templar=Templar(loader=loader),
            shared_loader_obj=shared_loader
        )

        return action

    def test_run_success(self, action_plugin):
        """Test successful execution."""
        action_plugin._task.args = {
            'param1': 'value1',
            'param2': 'value2'
        }

        task_vars = {
            'inventory_hostname': 'test_host',
            'ansible_facts': {}
        }

        result = action_plugin.run(task_vars=task_vars)

        assert not result.get('failed')
        assert 'msg' in result

    def test_run_missing_required_arg(self, action_plugin):
        """Test failure when required argument is missing."""
        action_plugin._task.args = {}

        with pytest.raises(Exception):
            action_plugin.run(task_vars={})

    def test_check_mode(self, action_plugin):
        """Test check mode behavior."""
        action_plugin._play_context.check_mode = True
        action_plugin._task.args = {'param1': 'value1'}

        result = action_plugin.run(task_vars={})

        # Should report changes without making them
        assert 'changed' in result

    @patch.object(ActionModule, '_execute_module')
    def test_module_execution(self, mock_execute, action_plugin):
        """Test that modules are executed correctly."""
        mock_execute.return_value = {'changed': True, 'msg': 'success'}

        action_plugin._task.args = {'param1': 'value1'}

        result = action_plugin.run(task_vars={})

        # Verify module was called
        assert mock_execute.called


class TestMyActionIntegration:
    """Integration tests requiring Ansible environment."""

    @pytest.fixture
    def ansible_runner(self):
        """Set up Ansible runner for integration tests."""
        try:
            import ansible_runner
            return ansible_runner
        except ImportError:
            pytest.skip('ansible_runner not installed')

    def test_full_execution(self, ansible_runner, tmp_path):
        """Test full playbook execution with the action plugin."""
        # Create test playbook
        playbook_content = """
---
- hosts: localhost
  connection: local
  gather_facts: no
  tasks:
    - name: Test my_action
      my_action:
        param1: test_value
      register: result

    - name: Verify result
      assert:
        that:
          - not result.failed
          - result.msg is defined
"""
        playbook_file = tmp_path / 'test_playbook.yml'
        playbook_file.write_text(playbook_content)

        # Run the playbook
        r = ansible_runner.run(
            playbook=str(playbook_file),
            private_data_dir=str(tmp_path)
        )

        assert r.status == 'successful'
```

## Complete Example: Database Migration Action Plugin

Here is a complete, production-ready action plugin that handles database migrations.

```python
# action_plugins/db_migrate.py
"""
Database migration action plugin.
Executes migrations on the control node and applies them to remote databases.
"""

from ansible.plugins.action import ActionBase
from ansible.errors import AnsibleError, AnsibleActionFail
from ansible.module_utils.common.text.converters import to_native
import os
import hashlib
import json


DOCUMENTATION = """
---
action: db_migrate
short_description: Execute database migrations
description:
    - Runs database migrations from the control node
    - Tracks migration state on remote hosts
    - Supports rollback operations
options:
    migrations_dir:
        description: Path to migrations directory
        required: true
        type: path
    database:
        description: Target database name
        required: true
        type: str
    rollback:
        description: Number of migrations to rollback
        required: false
        type: int
        default: 0
"""


class ActionModule(ActionBase):
    """Database migration action plugin."""

    TRANSFERS_FILES = True

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        # Extract and validate arguments
        migrations_dir = self._task.args.get('migrations_dir')
        database = self._task.args.get('database')
        rollback = self._task.args.get('rollback', 0)

        if not migrations_dir or not database:
            raise AnsibleActionFail('migrations_dir and database are required')

        try:
            # Find migrations directory
            migrations_path = self._find_needle('files', migrations_dir)

            # Get list of migration files
            migrations = self._get_migrations(migrations_path)

            # Get applied migrations from remote host
            applied = self._get_applied_migrations(database, task_vars)

            if rollback > 0:
                # Handle rollback
                result = self._do_rollback(
                    migrations, applied, rollback, database, task_vars
                )
            else:
                # Apply pending migrations
                result = self._apply_migrations(
                    migrations, applied, migrations_path, database, task_vars
                )

        except AnsibleActionFail:
            raise
        except Exception as e:
            result['failed'] = True
            result['msg'] = f'Migration failed: {to_native(e)}'

        return result

    def _get_migrations(self, path):
        """Get sorted list of migration files."""
        migrations = []
        for filename in sorted(os.listdir(path)):
            if filename.endswith('.sql'):
                filepath = os.path.join(path, filename)
                with open(filepath, 'r') as f:
                    content = f.read()

                migrations.append({
                    'name': filename,
                    'path': filepath,
                    'checksum': hashlib.sha256(content.encode()).hexdigest()
                })

        return migrations

    def _get_applied_migrations(self, database, task_vars):
        """Query remote host for applied migrations."""
        query = """
            SELECT name, checksum, applied_at
            FROM schema_migrations
            ORDER BY applied_at
        """

        result = self._execute_module(
            module_name='community.postgresql.postgresql_query',
            module_args={
                'db': database,
                'query': query
            },
            task_vars=task_vars
        )

        if result.get('failed'):
            # Table might not exist yet
            return []

        return result.get('query_result', [])

    def _apply_migrations(self, migrations, applied, migrations_path,
                          database, task_vars):
        """Apply pending migrations."""
        applied_names = {m['name'] for m in applied}
        pending = [m for m in migrations if m['name'] not in applied_names]

        if not pending:
            return {
                'changed': False,
                'msg': 'No pending migrations',
                'applied': [],
                'pending': []
            }

        # Check mode
        if self._play_context.check_mode:
            return {
                'changed': True,
                'msg': f'{len(pending)} migrations would be applied',
                'pending': [m['name'] for m in pending]
            }

        applied_list = []
        for migration in pending:
            # Read migration content
            with open(migration['path'], 'r') as f:
                sql_content = f.read()

            # Execute migration
            exec_result = self._execute_module(
                module_name='community.postgresql.postgresql_query',
                module_args={
                    'db': database,
                    'query': sql_content
                },
                task_vars=task_vars
            )

            if exec_result.get('failed'):
                return {
                    'failed': True,
                    'msg': f"Migration {migration['name']} failed",
                    'applied': applied_list,
                    'error': exec_result.get('msg')
                }

            # Record migration
            self._record_migration(
                migration['name'], migration['checksum'], database, task_vars
            )

            applied_list.append(migration['name'])

        return {
            'changed': True,
            'msg': f'Applied {len(applied_list)} migrations',
            'applied': applied_list
        }

    def _do_rollback(self, migrations, applied, count, database, task_vars):
        """Rollback specified number of migrations."""
        to_rollback = applied[-count:]

        if self._play_context.check_mode:
            return {
                'changed': bool(to_rollback),
                'msg': f'{len(to_rollback)} migrations would be rolled back',
                'rollback': [m['name'] for m in to_rollback]
            }

        rolled_back = []
        for migration in reversed(to_rollback):
            # Execute rollback
            self._remove_migration_record(migration['name'], database, task_vars)
            rolled_back.append(migration['name'])

        return {
            'changed': bool(rolled_back),
            'msg': f'Rolled back {len(rolled_back)} migrations',
            'rolled_back': rolled_back
        }

    def _record_migration(self, name, checksum, database, task_vars):
        """Record migration in schema_migrations table."""
        query = """
            INSERT INTO schema_migrations (name, checksum, applied_at)
            VALUES (%s, %s, NOW())
        """
        self._execute_module(
            module_name='community.postgresql.postgresql_query',
            module_args={
                'db': database,
                'query': query,
                'positional_args': [name, checksum]
            },
            task_vars=task_vars
        )

    def _remove_migration_record(self, name, database, task_vars):
        """Remove migration record from schema_migrations table."""
        query = "DELETE FROM schema_migrations WHERE name = %s"
        self._execute_module(
            module_name='community.postgresql.postgresql_query',
            module_args={
                'db': database,
                'query': query,
                'positional_args': [name]
            },
            task_vars=task_vars
        )
```

## Debugging Action Plugins

When developing action plugins, use these debugging techniques.

```python
# action_plugins/debug_example.py
from ansible.plugins.action import ActionBase
from ansible.utils.display import Display

# Create a display object for debug output
display = Display()


class ActionModule(ActionBase):
    """Action plugin with debugging enabled."""

    def run(self, tmp=None, task_vars=None):
        result = super(ActionModule, self).run(tmp, task_vars)

        if task_vars is None:
            task_vars = {}

        # Different verbosity levels for debug output
        # -v shows warnings and above
        # -vv shows info and above
        # -vvv shows debug and above

        display.warning('This appears at -v and above')
        display.v('This appears at -v verbosity')
        display.vv('This appears at -vv verbosity')
        display.vvv('This appears at -vvv verbosity')
        display.vvvv('This appears at -vvvv verbosity')

        # Debug specific variables
        display.vvv(f"Task args: {self._task.args}")
        display.vvv(f"Connection type: {self._connection.transport}")
        display.vvv(f"Check mode: {self._play_context.check_mode}")

        # Include debug info in result for inspection
        if self._play_context.verbosity >= 3:
            result['_debug'] = {
                'task_args': dict(self._task.args),
                'inventory_hostname': task_vars.get('inventory_hostname'),
                'connection': self._connection.transport
            }

        result['changed'] = False
        return result
```

Run playbooks with increased verbosity to see debug output:

```bash
# Basic verbosity
ansible-playbook site.yml -v

# More detailed
ansible-playbook site.yml -vvv

# Maximum verbosity
ansible-playbook site.yml -vvvvv
```

## Best Practices Summary

Follow these guidelines when building action plugins:

1. **Always call parent run method first** - This initializes the result dictionary and handles common setup.

2. **Validate arguments early** - Check for required parameters before doing any work.

3. **Support check mode** - Allow users to preview changes without applying them.

4. **Provide diff output** - When modifying files, show before/after differences.

5. **Handle errors gracefully** - Catch exceptions and return meaningful error messages.

6. **Use the templar for variables** - Let Ansible handle Jinja2 templating.

7. **Clean up temporary files** - Remove any files created during execution.

8. **Document your plugin** - Include DOCUMENTATION, EXAMPLES, and RETURN blocks.

9. **Write tests** - Unit tests for logic, integration tests for full execution.

10. **Log appropriately** - Use Display for debug output at proper verbosity levels.

## Conclusion

Action plugins provide a powerful extension point for Ansible. By running on the control node, they can perform preprocessing, validation, and orchestration that would be difficult or impossible with standard modules. The key is understanding the ActionBase interface and how to properly delegate work to remote hosts when needed.

Start with simple plugins that wrap existing modules with additional logic, then progress to more complex implementations as you become familiar with the patterns. The examples in this guide cover most common scenarios you will encounter in production environments.
