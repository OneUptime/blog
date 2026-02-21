# How to Measure Ansible Code Coverage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, Code Coverage, Quality, DevOps

Description: Practical methods for measuring code coverage of Ansible playbooks, roles, and custom modules to identify untested automation paths.

---

Code coverage tells you which parts of your codebase are exercised by your tests. For traditional software, tools like Istanbul or Coverage.py make this straightforward. For Ansible, it is trickier because you are dealing with YAML playbooks, Jinja2 templates, and Python modules all at once. But there are practical ways to measure coverage, and doing so reveals blind spots that would otherwise go unnoticed.

I discovered the value of coverage measurement after a production incident where an `when: ansible_os_family == 'Suse'` conditional had never been tested because none of our test environments ran SUSE. Coverage analysis would have flagged that untested branch immediately.

## Types of Coverage for Ansible

Coverage for Ansible has several dimensions:

1. **Task coverage** - Which tasks in your playbooks actually execute during tests?
2. **Conditional branch coverage** - Which `when` conditions evaluate to both true and false?
3. **Template coverage** - Which template paths and conditionals are exercised?
4. **Module coverage** - For custom modules, which Python code paths run?
5. **Variable coverage** - Which variable combinations are tested?

## Measuring Custom Module Coverage with Coverage.py

If you write custom Ansible modules in Python, you can use Coverage.py directly:

```bash
# Install coverage
pip install coverage
```

Create a test runner that wraps your module tests with coverage:

```python
# tests/run_module_coverage.py
# Run Ansible module unit tests with coverage measurement
import coverage
import unittest
import sys
import os

# Start coverage measurement before importing modules
cov = coverage.Coverage(
    source=['plugins/modules', 'plugins/module_utils'],
    omit=['tests/*', '*/site-packages/*'],
)
cov.start()

# Discover and run all module tests
loader = unittest.TestLoader()
suite = loader.discover('tests/unit', pattern='test_*.py')
runner = unittest.TextTestRunner(verbosity=2)
result = runner.run(suite)

# Stop and save coverage data
cov.stop()
cov.save()

# Generate reports
print("\n--- Coverage Report ---")
cov.report(show_missing=True)
cov.html_report(directory='coverage_html')
print("HTML report written to coverage_html/index.html")

sys.exit(0 if result.wasSuccessful() else 1)
```

A sample module test:

```python
# tests/unit/test_my_module.py
# Unit tests for custom Ansible module
import json
import pytest
from unittest.mock import patch, MagicMock
from plugins.modules.my_module import main, validate_input, create_resource

class TestValidateInput:
    def test_valid_input(self):
        """Test validation passes with correct parameters."""
        params = {'name': 'test', 'state': 'present'}
        result = validate_input(params)
        assert result is True

    def test_missing_name(self):
        """Test validation fails without name parameter."""
        params = {'state': 'present'}
        with pytest.raises(ValueError):
            validate_input(params)

    def test_invalid_state(self):
        """Test validation rejects unknown state values."""
        params = {'name': 'test', 'state': 'invalid'}
        with pytest.raises(ValueError):
            validate_input(params)

class TestCreateResource:
    @patch('plugins.modules.my_module.api_client')
    def test_creates_new_resource(self, mock_client):
        """Test resource creation when it does not exist."""
        mock_client.get.return_value = None
        mock_client.create.return_value = {'id': 'res-123'}
        result = create_resource('test-resource', mock_client)
        assert result['changed'] is True
        assert result['id'] == 'res-123'

    @patch('plugins.modules.my_module.api_client')
    def test_skips_existing_resource(self, mock_client):
        """Test no change when resource already exists."""
        mock_client.get.return_value = {'id': 'res-123', 'name': 'test-resource'}
        result = create_resource('test-resource', mock_client)
        assert result['changed'] is False
```

Run with coverage:

```bash
# Run module tests with coverage reporting
python tests/run_module_coverage.py
```

## Measuring Task Coverage with Callback Plugins

Ansible callback plugins can track which tasks execute. Here is a custom callback that records task execution:

```python
# callback_plugins/coverage_tracker.py
# Custom callback plugin that tracks task execution for coverage analysis
from ansible.plugins.callback import CallbackBase
import json
import os
from datetime import datetime

class CallbackModule(CallbackBase):
    CALLBACK_VERSION = 2.0
    CALLBACK_TYPE = 'aggregate'
    CALLBACK_NAME = 'coverage_tracker'
    CALLBACK_NEEDS_ENABLED = True

    def __init__(self):
        super().__init__()
        self.task_coverage = {}
        self.coverage_file = os.environ.get(
            'ANSIBLE_COVERAGE_FILE',
            'task_coverage.json'
        )

    def _record_task(self, task, status):
        """Record a task execution with its status."""
        task_key = f"{task._role.get_name() if task._role else 'playbook'}::{task.name}"
        if task_key not in self.task_coverage:
            self.task_coverage[task_key] = {
                'file': str(task.get_path()),
                'name': task.name,
                'role': task._role.get_name() if task._role else None,
                'executions': [],
            }
        self.task_coverage[task_key]['executions'].append({
            'status': status,
            'timestamp': datetime.now().isoformat(),
        })

    def v2_runner_on_ok(self, result, **kwargs):
        self._record_task(result._task, 'ok')

    def v2_runner_on_changed(self, result, **kwargs):
        self._record_task(result._task, 'changed')

    def v2_runner_on_skipped(self, result, **kwargs):
        self._record_task(result._task, 'skipped')

    def v2_runner_on_failed(self, result, **kwargs):
        self._record_task(result._task, 'failed')

    def v2_playbook_on_stats(self, stats):
        """Write coverage data at the end of the playbook run."""
        with open(self.coverage_file, 'w') as f:
            json.dump(self.task_coverage, f, indent=2)

        # Print summary
        total = len(self.task_coverage)
        executed = sum(
            1 for t in self.task_coverage.values()
            if any(e['status'] != 'skipped' for e in t['executions'])
        )
        skipped = total - executed
        print(f"\n--- Task Coverage ---")
        print(f"Total tasks: {total}")
        print(f"Executed: {executed}")
        print(f"Skipped: {skipped}")
        if total > 0:
            print(f"Coverage: {executed/total*100:.1f}%")
```

Enable the plugin in your ansible.cfg:

```ini
# ansible.cfg
# Enable the coverage tracker callback plugin
[defaults]
callback_plugins = callback_plugins
callbacks_enabled = coverage_tracker
```

## Analyzing Coverage Reports

Write a script to analyze the task coverage JSON and produce a readable report:

```python
#!/usr/bin/env python3
# scripts/analyze_coverage.py
# Analyze task coverage data and generate a report
import json
import sys
from collections import defaultdict

def analyze_coverage(coverage_file):
    with open(coverage_file) as f:
        data = json.load(f)

    role_stats = defaultdict(lambda: {'total': 0, 'executed': 0, 'skipped_only': 0})

    for task_key, task_info in data.items():
        role = task_info.get('role', 'playbook')
        role_stats[role]['total'] += 1

        statuses = {e['status'] for e in task_info['executions']}
        if statuses == {'skipped'}:
            role_stats[role]['skipped_only'] += 1
        else:
            role_stats[role]['executed'] += 1

    print("Role Coverage Report")
    print("=" * 60)
    print(f"{'Role':<30} {'Total':>6} {'Exec':>6} {'Skip':>6} {'Cov':>6}")
    print("-" * 60)

    for role, stats in sorted(role_stats.items()):
        total = stats['total']
        executed = stats['executed']
        coverage_pct = (executed / total * 100) if total > 0 else 0
        print(f"{role:<30} {total:>6} {executed:>6} {stats['skipped_only']:>6} {coverage_pct:>5.1f}%")

    # List always-skipped tasks
    print("\nAlways-Skipped Tasks (uncovered):")
    print("-" * 60)
    for task_key, task_info in data.items():
        statuses = {e['status'] for e in task_info['executions']}
        if statuses == {'skipped'}:
            print(f"  - {task_info['name']} ({task_info.get('file', 'unknown')})")

if __name__ == '__main__':
    coverage_file = sys.argv[1] if len(sys.argv) > 1 else 'task_coverage.json'
    analyze_coverage(coverage_file)
```

## Measuring Conditional Branch Coverage

Track which `when` conditions are satisfied and which are not:

```yaml
# playbooks/multi_os.yml
# Playbook with OS-specific conditionals that need branch coverage
- name: Configure application
  hosts: all
  become: true
  tasks:
    - name: Install on Debian family
      ansible.builtin.apt:
        name: myapp
        state: present
      when: ansible_os_family == 'Debian'

    - name: Install on RedHat family
      ansible.builtin.yum:
        name: myapp
        state: present
      when: ansible_os_family == 'RedHat'

    - name: Install on Suse family
      ansible.builtin.zypper:
        name: myapp
        state: present
      when: ansible_os_family == 'Suse'

    - name: Configure SELinux settings
      ansible.posix.seboolean:
        name: httpd_can_network_connect
        state: true
        persistent: true
      when: ansible_selinux.status == 'enabled'
```

If your test matrix only includes Debian and RedHat systems, the Suse task and potentially the SELinux task never execute. The coverage report reveals this gap so you can either add SUSE to your test matrix or make a conscious decision to not test it.

## Integration with CI for Coverage Thresholds

Set minimum coverage thresholds in your CI pipeline:

```yaml
# .github/workflows/coverage.yml
# CI workflow that enforces minimum task coverage
name: Ansible Coverage
on: push
jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install ansible-core molecule molecule-docker coverage
      - name: Run tests with coverage
        run: |
          ANSIBLE_COVERAGE_FILE=coverage.json molecule test
      - name: Check coverage threshold
        run: |
          python scripts/check_threshold.py coverage.json --min-coverage 80
```

```python
#!/usr/bin/env python3
# scripts/check_threshold.py
# Fail CI if task coverage drops below threshold
import json
import sys
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('coverage_file')
parser.add_argument('--min-coverage', type=float, default=80.0)
args = parser.parse_args()

with open(args.coverage_file) as f:
    data = json.load(f)

total = len(data)
executed = sum(
    1 for t in data.values()
    if any(e['status'] != 'skipped' for e in t['executions'])
)
coverage_pct = (executed / total * 100) if total > 0 else 0

print(f"Coverage: {coverage_pct:.1f}% (threshold: {args.min_coverage}%)")

if coverage_pct < args.min_coverage:
    print(f"FAIL: Coverage {coverage_pct:.1f}% is below threshold {args.min_coverage}%")
    sys.exit(1)

print("PASS: Coverage meets threshold")
```

## Conclusion

Measuring Ansible code coverage requires a different mindset than measuring coverage for regular software. You need to track task execution, conditional branches, and template paths across your entire role. Use Coverage.py for custom modules, callback plugins for task tracking, and multi-platform test matrices to maximize branch coverage. Set thresholds in CI to prevent coverage from regressing over time. The goal is not 100% coverage but rather awareness of what you are and are not testing.
