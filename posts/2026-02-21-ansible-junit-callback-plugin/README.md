# How to Use the Ansible junit Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, JUnit, CI/CD, Testing

Description: Configure the Ansible junit callback plugin to generate JUnit XML reports from playbook runs for integration with Jenkins, GitLab CI, and other CI systems.

---

The `junit` callback plugin generates JUnit XML files from Ansible playbook runs. JUnit XML is the standard format that CI/CD systems like Jenkins, GitLab CI, Azure DevOps, and GitHub Actions use to display test results. By using this callback, your Ansible runs show up as test suites in your CI dashboard with individual tasks as test cases, complete with pass/fail status and timing information.

## Why JUnit Output Matters

When Ansible runs in CI/CD, the typical result is either "exit code 0" or "exit code non-zero" with a wall of text in the build log. JUnit XML gives you structured results that CI systems can parse and display in their test result views. Each task becomes a test case, so you can quickly see which specific task failed, how long each task took, and track trends over time.

## Enabling the JUnit Callback

The junit callback is a notification callback, so it runs alongside your normal stdout callback:

```ini
# ansible.cfg - Enable JUnit XML output
[defaults]
callback_whitelist = junit

[callback_junit]
# Directory where JUnit XML files will be written
output_dir = ./junit-results
# Include the task class name in the output
include_setup_tasks_in_report = true
# Fail on change (treat changed tasks as failures)
fail_on_change = false
# Test case name format
test_case_prefix = ansible
```

Environment variable configuration:

```bash
# Enable JUnit via environment
export ANSIBLE_CALLBACK_WHITELIST=junit
export JUNIT_OUTPUT_DIR=./junit-results
export JUNIT_FAIL_ON_CHANGE=false
```

## Generated XML Structure

After running a playbook, the junit callback creates XML files in the output directory. One file per playbook host group:

```bash
# List generated JUnit files
ls junit-results/
# web-01.xml  web-02.xml  db-01.xml
```

The XML follows the JUnit schema:

```xml
<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="web-01" tests="5" errors="0" failures="0" skipped="1" time="45.23">
    <testcase classname="Configure web servers"
              name="Gathering Facts"
              time="2.14">
    </testcase>
    <testcase classname="Configure web servers"
              name="Install nginx"
              time="15.67">
    </testcase>
    <testcase classname="Configure web servers"
              name="Deploy configuration"
              time="3.21">
    </testcase>
    <testcase classname="Configure web servers"
              name="Start service"
              time="1.89">
    </testcase>
    <testcase classname="Configure web servers"
              name="Install Redis (skipped)"
              time="0.01">
      <skipped message="Conditional result was False"/>
    </testcase>
  </testsuite>
</testsuites>
```

Failed tasks include the error message:

```xml
<testcase classname="Configure web servers"
          name="Deploy configuration"
          time="3.21">
  <failure message="msg: Could not find /opt/app/config.yml">
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
        ANSIBLE_CALLBACK_WHITELIST = 'junit'
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

After the build, Jenkins shows a "Test Results" section with each Ansible task as a test case. You can drill into failures and see the error messages.

## GitLab CI Integration

GitLab CI also supports JUnit reports natively:

```yaml
# .gitlab-ci.yml - Ansible with JUnit in GitLab
deploy:
  stage: deploy
  variables:
    ANSIBLE_CALLBACK_WHITELIST: "junit"
    JUNIT_OUTPUT_DIR: "${CI_PROJECT_DIR}/junit-results"
  script:
    - mkdir -p ${JUNIT_OUTPUT_DIR}
    - ansible-playbook -i inventory/production deploy.yml
  artifacts:
    when: always
    reports:
      junit: junit-results/*.xml
```

GitLab shows the results in the merge request and pipeline views, making it easy to see which Ansible tasks passed or failed.

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
      ANSIBLE_CALLBACK_WHITELIST: junit
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
# ansible.cfg - Treat changes as failures for compliance
[callback_junit]
output_dir = ./compliance-results
fail_on_change = true
```

This is useful when running playbooks in check mode to verify configuration drift:

```bash
# Check for drift - any changes detected are marked as failures
JUNIT_FAIL_ON_CHANGE=true ansible-playbook --check compliance.yml
```

## Custom Task Names in JUnit

The JUnit output uses Ansible task names as test case names. Write descriptive task names for better reports:

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

JUnit is a notification callback, so combine it with your preferred stdout callback and other notification callbacks:

```ini
# ansible.cfg - JUnit with timer and profile callbacks
[defaults]
stdout_callback = yaml
callback_whitelist = junit, timer, profile_tasks

[callback_junit]
output_dir = ./junit-results
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
            for case in suite.findall('.//failure'):
                print(f"  - {case.getparent().get('name')}: {case.get('message')}")

print(f"\nTotal: {total_tests} tasks, {total_failures} failures, {total_time:.1f}s")
```

The JUnit callback bridges the gap between Ansible and CI/CD reporting. It takes minimal effort to set up and immediately gives you structured test results in your CI dashboard. If Ansible is part of your deployment pipeline, enabling the JUnit callback should be one of the first things you do.
