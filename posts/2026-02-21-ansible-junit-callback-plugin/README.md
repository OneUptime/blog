# How to Use the Ansible junit Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, JUnit, CI/CD, Testing

Description: Configure the Ansible junit callback plugin to generate JUnit XML reports from playbook runs for integration with Jenkins, GitLab CI, and other CI systems.

---

The `junit` callback plugin generates JUnit XML files from Ansible playbook runs. JUnit XML is the standard format that CI/CD systems like Jenkins, GitLab CI, Azure DevOps, and GitHub Actions reporting actions use to display test results. By using this callback, your Ansible runs show up as test suites in your CI dashboard with individual host/task results as test cases, complete with pass/fail status and timing information.

## Why JUnit Output Matters

When Ansible runs in CI/CD, the typical result is either "exit code 0" or "exit code non-zero" with a wall of text in the build log. JUnit XML gives you structured results that CI systems can parse and display in their test result views. Each recorded host/task result becomes a test case, so you can quickly see which specific task failed, how long each task took, and track trends over time.

## Enabling the JUnit Callback

The junit callback is an aggregate callback, so it runs alongside your normal stdout callback:

```ini
# ansible.cfg - Enable JUnit XML output

[defaults]
callbacks_enabled = ansible.builtin.junit
```

Environment variable configuration:

```bash
# Enable JUnit via environment
export ANSIBLE_CALLBACKS_ENABLED=ansible.builtin.junit
export JUNIT_OUTPUT_DIR=./junit-results
export JUNIT_FAIL_ON_CHANGE=false
export JUNIT_INCLUDE_SETUP_TASKS_IN_REPORT=true
export JUNIT_TASK_CLASS=false
```

## Generated XML Structure

After running a playbook, the junit callback creates an XML file in the output directory. The file name uses the playbook name and a timestamp:

```bash
# List generated JUnit files
ls junit-results/
# deploy-1771688925.123456.xml
```

The XML follows the JUnit schema:

```xml
<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="deploy" tests="5" errors="0" failures="0" skipped="1" time="45.23">
    <testcase classname="deploy.yml:2"
              name="[web-01] Configure web servers: Gathering Facts"
              time="2.14">
    </testcase>
    <testcase classname="roles/web/tasks/main.yml:4"
              name="[web-01] Configure web servers: Install nginx name=nginx state=present"
              time="15.67">
    </testcase>
    <testcase classname="roles/web/tasks/main.yml:10"
              name="[web-01] Configure web servers: Deploy configuration"
              time="3.21">
    </testcase>
    <testcase classname="roles/web/tasks/main.yml:18"
              name="[web-01] Configure web servers: Start service"
              time="1.89">
    </testcase>
    <testcase classname="roles/web/tasks/main.yml:25"
              name="[web-01] Configure web servers: Install Redis"
              time="0.01">
      <skipped message="Conditional result was False"/>
    </testcase>
  </testsuite>
</testsuites>
```

Failed tasks include the error message:

```xml
<testcase classname="roles/web/tasks/main.yml:10"
          name="[web-01] Configure web servers: Deploy configuration"
          time="3.21">
  <failure message="Could not find /opt/app/config.yml">
    FAILED! =&gt; {"changed": false, "msg": "Could not find /opt/app/config.yml"}
  </failure>
</testcase>
```

## Jenkins Integration

Jenkins natively understands JUnit XML. Add the JUnit post-build step to your Jenkins pipeline:

```groovy
// Jenkinsfile - Ansible with JUnit reporting
pipeline {
    agent any

    environment {
        ANSIBLE_CALLBACKS_ENABLED = 'ansible.builtin.junit'
        JUNIT_OUTPUT_DIR = "${WORKSPACE}/junit-results"
    }

    stages {
        stage('Deploy') {
            steps {
                sh 'mkdir -p ${JUNIT_OUTPUT_DIR}'
                sh 'ansible-playbook -i inventory/production deploy.yml'
            }
        }
    }

    post {
        always {
            // Jenkins parses the JUnit XML and shows results in the build
            junit 'junit-results/*.xml'
        }
    }
}
```

After the build, Jenkins shows a "Test Results" section with each recorded Ansible host/task result as a test case. You can drill into failures and see the error messages.

## GitLab CI Integration

GitLab CI also supports JUnit reports natively:

```yaml
# .gitlab-ci.yml - Ansible with JUnit in GitLab
deploy:
  stage: deploy
  variables:
    ANSIBLE_CALLBACKS_ENABLED: "ansible.builtin.junit"
    JUNIT_OUTPUT_DIR: "${CI_PROJECT_DIR}/junit-results"
  script:
    - mkdir -p ${JUNIT_OUTPUT_DIR}
    - ansible-playbook -i inventory/production deploy.yml
  artifacts:
    when: always
    reports:
      junit: junit-results/*.xml
```

GitLab shows the results in the merge request and pipeline views, making it easy to see which Ansible host/task results passed or failed.

## GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml - Ansible JUnit in GitHub Actions
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      ANSIBLE_CALLBACKS_ENABLED: ansible.builtin.junit
      JUNIT_OUTPUT_DIR: ./junit-results

    steps:
      - uses: actions/checkout@v4

      - name: Create results directory
        run: mkdir -p junit-results

      - name: Run Ansible
        run: ansible-playbook -i inventory deploy.yml

      - name: Publish Test Results
        uses: EnricoMi/publish-unit-test-result-action@v2
        if: always()
        with:
          files: junit-results/*.xml
```

## Treating Changed Tasks as Failures

The `fail_on_change` option is useful for compliance checking. When enabled, any task that reports "changed" is marked as a failure in the JUnit output:

```ini
# ansible.cfg - Enable JUnit XML output
[defaults]
callbacks_enabled = ansible.builtin.junit
```

This is useful when running playbooks in check mode to verify configuration drift:

```bash
# Check for drift - any changes detected are marked as failures
JUNIT_OUTPUT_DIR=./compliance-results JUNIT_FAIL_ON_CHANGE=true ansible-playbook --check compliance.yml
```

## Custom Task Names in JUnit

The JUnit output includes Ansible task names in test case names. Write descriptive task names for better reports:

```yaml
# Good task names for JUnit readability
- name: "nginx: Install package from apt repository"
  apt:
    name: nginx
    state: present

- name: "nginx: Deploy virtual host configuration"
  template:
    src: vhost.conf.j2
    dest: /etc/nginx/sites-available/myapp.conf

- name: "nginx: Enable site and reload service"
  command: nginx -t
  notify: Reload nginx
```

The JUnit output will show these descriptive names, making it easy to identify what failed.

## Combining JUnit with Other Callbacks

JUnit is an aggregate callback, so combine it with your preferred stdout callback and other aggregate or notification callbacks. For example, if the `ansible.posix` collection is installed:

```ini
# ansible.cfg - JUnit with timer and profile callbacks
[defaults]
callbacks_enabled = ansible.builtin.junit, ansible.posix.timer, ansible.posix.profile_tasks
```

## Processing JUnit XML Programmatically

You can parse the JUnit XML for custom reporting:

```python
#!/usr/bin/env python3
# parse-junit.py - Extract summary from JUnit XML
import xml.etree.ElementTree as ET
import glob
import sys

results_dir = sys.argv[1] if len(sys.argv) > 1 else "./junit-results"
total_tests = 0
total_failures = 0
total_time = 0.0

for xml_file in glob.glob(f"{results_dir}/*.xml"):
    tree = ET.parse(xml_file)
    root = tree.getroot()

    for suite in root.findall('.//testsuite'):
        tests = int(suite.get('tests', 0))
        failures = int(suite.get('failures', 0))
        time_taken = float(suite.get('time', 0))

        total_tests += tests
        total_failures += failures
        total_time += time_taken

        if failures > 0:
            print(f"FAILURES in {suite.get('name')}:")
            for test_case in suite.findall('.//testcase'):
                failure = test_case.find('failure')
                if failure is not None:
                    print(f"  - {test_case.get('name')}: {failure.get('message')}")

print(f"\nTotal: {total_tests} tasks, {total_failures} failures, {total_time:.1f}s")
```

The JUnit callback bridges the gap between Ansible and CI/CD reporting. It takes minimal effort to set up and immediately gives you structured test results in your CI dashboard. If Ansible is part of your deployment pipeline, enabling the JUnit callback should be one of the first things you do.
