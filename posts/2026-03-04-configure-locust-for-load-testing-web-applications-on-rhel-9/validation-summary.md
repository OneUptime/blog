# Validation Summary: How to Configure Locust for Load Testing Web Applications on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Python
- pip
- Locust
- Locust CLI
- Locust locustfiles
- Distributed load testing
- systemd

## Sources Consulted
- Locust installation documentation: https://docs.locust.io/en/stable/installation.html
- Locust configuration and CLI options documentation: https://docs.locust.io/en/stable/configuration.html
- Locust locustfile documentation: https://docs.locust.io/en/stable/writing-a-locustfile.html
- Locust API documentation: https://docs.locust.io/en/stable/api.html
- Locust distributed load generation documentation: https://docs.locust.io/en/stable/running-distributed.html
- Locust custom load shapes documentation: https://docs.locust.io/en/stable/custom-load-shape.html
- Locust CSV statistics documentation: https://docs.locust.io/en/stable/retrieving-stats.html
- Locust PyPI project metadata: https://pypi.org/project/locust/
- Red Hat Enterprise Linux 9 dynamic programming languages documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages/index
- Local verification with Locust 2.44.0 `--help` output and Python import checks for the sample classes.

## Issues Found
- The prerequisites said Python 3.9 or newer, but the current Locust release requires Python 3.10 or newer. Updated the prerequisite to Python 3.10+ and clarified that RHEL 9 users should use Python 3.11 or 3.12 for current Locust releases.
- The installation command used `pip3 install --user locust`, which on RHEL 9 normally targets the default Python 3.9 stack. Updated the install steps to install `python3.11`/`python3.11-pip` and run `python3.11 -m pip install --user locust`.
- The systemd service used `/usr/local/bin/locust` even though the post installs Locust with `--user`. Added commands to create a dedicated `locust` service user, install Locust for that user, and updated `ExecStart` to `/var/lib/locust/.local/bin/locust`.

## Review Notes
The Locust code examples, task weighting, `SequentialTaskSet`, `catch_response=True`, distributed mode flags, custom `LoadTestShape`, CSV output, and HTML report options were consistent with current Locust documentation and local Locust 2.44.0 CLI/API checks.
